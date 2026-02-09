/**
 * Rate Limiter for Gemini OAuth
 * Prevents abuse detection and account blocking
 * 
 * Features:
 * - Sliding window rate limiting
 * - Token estimation and tracking
 * - Multi-dimensional limits (RPM, TPM, RPD)
 * - Pattern randomization (human-like delays)
 * - Usage metrics and monitoring
 */

import { db } from "../db";

// Rate limit configuration
export const RATE_LIMITS = {
  // Conservative limits (80% of estimated thresholds)
  maxRequestsPerMinute: 10,
  maxRequestsPerHour: 80,
  maxRequestsPerDay: 1200,
  maxTokensPerMinute: 25000,
  maxTokensPerDay: 800000,

  // Delays (milliseconds)
  minDelayBetweenRequests: 3000,  // 3s
  maxDelayBetweenRequests: 8000,  // 8s
  burstCooldown: 60000,           // 1 min
  idleBreakInterval: 20,          // Every 20 requests
  idleBreakDuration: 45000,       // 30-60s break
};

export interface UsageMetrics {
  // Counters
  requestsThisMinute: number;
  tokensThisMinute: number;
  requestsThisHour: number;
  tokensThisHour: number;
  requestsToday: number;
  tokensToday: number;

  // Timestamps
  lastRequestTime: number;
  lastResetTime: number;

  // Patterns
  consecutiveRequests: number;
  burstCount: number;

  // Health
  throttleCount: number;
  errorCount: number;
  accountStatus: "healthy" | "warning" | "throttled";
}

export class RateLimiter {
  private accountId: string;
  private metrics: UsageMetrics;

  constructor(accountId: string) {
    this.accountId = accountId;
    this.metrics = this.getDefaultMetrics();
  }

  private getDefaultMetrics(): UsageMetrics {
    return {
      requestsThisMinute: 0,
      tokensThisMinute: 0,
      requestsThisHour: 0,
      tokensThisHour: 0,
      requestsToday: 0,
      tokensToday: 0,
      lastRequestTime: 0,
      lastResetTime: Date.now(),
      consecutiveRequests: 0,
      burstCount: 0,
      throttleCount: 0,
      errorCount: 0,
      accountStatus: "healthy"
    };
  }

  /**
   * Load metrics from IndexedDB
   */
  async loadMetrics(): Promise<void> {
    const key = `rateLimiter_${this.accountId}`;
    const setting = await db.settings.get(key);

    if (setting?.value) {
      try {
        const stored = JSON.parse(setting.value as string) as UsageMetrics;

        // Check if we need to reset (midnight PT)
        if (this.shouldResetDaily(stored.lastResetTime)) {
          this.metrics = this.getDefaultMetrics();
        } else {
          this.metrics = stored;
          // Reset minute/hour counters if needed
          this.resetExpiredCounters();
        }
      } catch {
        this.metrics = this.getDefaultMetrics();
      }
    }
  }

  /**
   * Save metrics to IndexedDB
   */
  private async saveMetrics(): Promise<void> {
    const key = `rateLimiter_${this.accountId}`;
    await db.settings.put({
      key,
      value: JSON.stringify(this.metrics)
    });
  }

  /**
   * Check if we should reset daily counters (midnight PT)
   */
  private shouldResetDaily(lastResetTime: number): boolean {
    const now = new Date();
    const lastReset = new Date(lastResetTime);

    // Convert to PT (UTC-8 or UTC-7 depending on DST)
    const ptOffset = -8 * 60; // Simplified: assume PST
    const nowPT = new Date(now.getTime() + ptOffset * 60 * 1000);
    const lastResetPT = new Date(lastReset.getTime() + ptOffset * 60 * 1000);

    // Different day in PT?
    return nowPT.getDate() !== lastResetPT.getDate() ||
      nowPT.getMonth() !== lastResetPT.getMonth() ||
      nowPT.getFullYear() !== lastResetPT.getFullYear();
  }

  /**
   * Reset expired minute/hour counters
   */
  private resetExpiredCounters(): void {
    const now = Date.now();
    const oneMinute = 60 * 1000;
    const oneHour = 60 * 60 * 1000;

    if (now - this.metrics.lastRequestTime > oneMinute) {
      this.metrics.requestsThisMinute = 0;
      this.metrics.tokensThisMinute = 0;
    }

    if (now - this.metrics.lastRequestTime > oneHour) {
      this.metrics.requestsThisHour = 0;
      this.metrics.tokensThisHour = 0;
    }
  }

  /**
   * Estimate tokens from text
   */
  estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    // More accurate for English, less for CJK
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if request would exceed limits
   */
  async canMakeRequest(estimatedTokens: number): Promise<{ allowed: boolean; reason?: string; waitTime?: number }> {
    await this.loadMetrics();

    // Check daily limits
    if (this.metrics.requestsToday >= RATE_LIMITS.maxRequestsPerDay) {
      return {
        allowed: false,
        reason: `Daily request limit exceeded (${RATE_LIMITS.maxRequestsPerDay})`,
        waitTime: this.getTimeUntilMidnightPT()
      };
    }

    if (this.metrics.tokensToday + estimatedTokens > RATE_LIMITS.maxTokensPerDay) {
      return {
        allowed: false,
        reason: `Daily token limit exceeded (${RATE_LIMITS.maxTokensPerDay})`,
        waitTime: this.getTimeUntilMidnightPT()
      };
    }

    // Check minute limits
    if (this.metrics.requestsThisMinute >= RATE_LIMITS.maxRequestsPerMinute) {
      return {
        allowed: false,
        reason: `Per-minute request limit exceeded (${RATE_LIMITS.maxRequestsPerMinute})`,
        waitTime: 60000 // Wait 1 minute
      };
    }

    if (this.metrics.tokensThisMinute + estimatedTokens > RATE_LIMITS.maxTokensPerMinute) {
      return {
        allowed: false,
        reason: `Per-minute token limit exceeded (${RATE_LIMITS.maxTokensPerMinute})`,
        waitTime: 60000
      };
    }

    // Check hour limits
    if (this.metrics.requestsThisHour >= RATE_LIMITS.maxRequestsPerHour) {
      return {
        allowed: false,
        reason: `Per-hour request limit exceeded (${RATE_LIMITS.maxRequestsPerHour})`,
        waitTime: 3600000 // Wait 1 hour
      };
    }

    return { allowed: true };
  }

  /**
   * Get time until midnight PT
   */
  private getTimeUntilMidnightPT(): number {
    const now = new Date();
    const ptOffset = -8 * 60; // PST offset
    const nowPT = new Date(now.getTime() + ptOffset * 60 * 1000);

    const midnightPT = new Date(nowPT);
    midnightPT.setHours(24, 0, 0, 0);

    return midnightPT.getTime() - nowPT.getTime();
  }

  /**
   * Get human-like delay before next request
   */
  getDelay(): number {
    const now = Date.now();
    const timeSinceLastRequest = now - this.metrics.lastRequestTime;

    // Detect burst (requests <10s apart)
    if (timeSinceLastRequest < 10000) {
      this.metrics.burstCount++;

      // If burst detected, add cooldown
      if (this.metrics.burstCount >= 3) {
        return RATE_LIMITS.burstCooldown;
      }
    } else {
      this.metrics.burstCount = 0;
    }

    // Check if we should take an idle break
    if (this.metrics.consecutiveRequests > 0 &&
      this.metrics.consecutiveRequests % RATE_LIMITS.idleBreakInterval === 0) {
      const breakDuration = RATE_LIMITS.idleBreakDuration + Math.random() * 15000; // 45-60s
      return breakDuration;
    }

    // Random delay (human-like)
    const min = RATE_LIMITS.minDelayBetweenRequests;
    const max = RATE_LIMITS.maxDelayBetweenRequests;
    return min + Math.random() * (max - min);
  }

  /**
   * Record a request
   */
  async recordRequest(tokens: number): Promise<void> {
    await this.loadMetrics();

    const now = Date.now();

    // Reset counters if needed
    this.resetExpiredCounters();

    // Update counters
    this.metrics.requestsThisMinute++;
    this.metrics.tokensThisMinute += tokens;
    this.metrics.requestsThisHour++;
    this.metrics.tokensThisHour += tokens;
    this.metrics.requestsToday++;
    this.metrics.tokensToday += tokens;

    this.metrics.lastRequestTime = now;
    this.metrics.consecutiveRequests++;

    // Update status
    this.updateStatus();

    await this.saveMetrics();
  }

  /**
   * Record an error
   */
  async recordError(isThrottle: boolean = false): Promise<void> {
    await this.loadMetrics();

    this.metrics.errorCount++;
    if (isThrottle) {
      this.metrics.throttleCount++;
      this.metrics.accountStatus = "throttled";
    }

    await this.saveMetrics();
  }

  /**
   * Update account status based on usage
   */
  private updateStatus(): void {
    const requestUsagePercent = (this.metrics.requestsToday / RATE_LIMITS.maxRequestsPerDay) * 100;
    const tokenUsagePercent = (this.metrics.tokensToday / RATE_LIMITS.maxTokensPerDay) * 100;

    if (requestUsagePercent >= 95 || tokenUsagePercent >= 95) {
      this.metrics.accountStatus = "throttled";
    } else if (requestUsagePercent >= 80 || tokenUsagePercent >= 80) {
      this.metrics.accountStatus = "warning";
    } else {
      this.metrics.accountStatus = "healthy";
    }
  }

  /**
   * Get current metrics
   */
  async getMetrics(): Promise<UsageMetrics> {
    await this.loadMetrics();
    return { ...this.metrics };
  }

  /**
   * Reset metrics (for testing)
   */
  async reset(): Promise<void> {
    this.metrics = this.getDefaultMetrics();
    await this.saveMetrics();
  }
}

/**
 * Get rate limiter for account
 */
export async function getRateLimiter(accountId: string): Promise<RateLimiter> {
  const limiter = new RateLimiter(accountId);
  await limiter.loadMetrics();
  return limiter;
}

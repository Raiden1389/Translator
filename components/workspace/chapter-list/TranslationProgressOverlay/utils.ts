/**
 * Pure utility functions for TranslationProgressOverlay
 * No side effects, no React dependencies
 */

/**
 * Calculate translation speed in chapters per minute
 */
export function calculateSpeed(completedChapters: number, elapsedSeconds: number): number {
  if (elapsedSeconds <= 0 || completedChapters <= 0) {
    return 0;
  }
  return completedChapters / (elapsedSeconds / 60);
}

/**
 * Calculate base progress percentage
 */
export function calculateBasePercent(current: number, total: number): number {
  return total > 0 ? Math.round((current / total) * 100) : 0;
}

/**
 * Calculate next step limit percentage
 */
export function calculateNextStepLimit(current: number, total: number): number {
  return total > 0 ? Math.round(((current + 1) / total) * 100) : 100;
}

/**
 * Format ETA seconds into human-readable string
 */
export function formatETA(etaSeconds: number): string {
  if (etaSeconds <= 3) {
    return "Finishing...";
  }

  const minutes = Math.floor(etaSeconds / 60);
  const seconds = etaSeconds % 60;

  return `ETA: ${minutes > 0 ? `${minutes}m ` : ""}${seconds}s`;
}

/**
 * Calculate ETA using Exponential Moving Average
 */
export function calculateETASeconds(
  avgTimePerChapter: number,
  remainingChapters: number
): number {
  return Math.round(avgTimePerChapter * remainingChapters);
}

/**
 * Update EMA (Exponential Moving Average)
 */
export function updateEMA(
  currentValue: number,
  previousEMA: number | null,
  alpha: number = 0.3
): number {
  if (previousEMA === null) {
    return currentValue;
  }
  return (alpha * currentValue) + (1 - alpha) * previousEMA;
}

/**
 * Format cost in USD
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

/**
 * Format token count with K/M suffix
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

/**
 * Format elapsed time in HH:MM:SS or MM:SS format
 */
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

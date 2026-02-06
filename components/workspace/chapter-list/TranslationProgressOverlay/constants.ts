/**
 * Configuration constants for TranslationProgressOverlay
 */

export const MAX_FAKE_PERCENT = 99.5;
export const PROGRESS_STEP_BUFFER = 0.5;
export const MIN_CREEP_STEP = 0.04;
export const CREEP_SLOWDOWN_FACTOR = 40;
export const REFRESH_INTERVAL_MS = 1000;
export const MIN_SAMPLES_FOR_ETA = 3; // Avoid ETA noise in first few chapters
export const EMA_ALPHA = 0.3; // Exponential Moving Average smoothing factor
export const SCROLL_THRESHOLD_PX = 40; // Distance to detect "at bottom"
export const NOTIFICATION_AUTO_DISMISS_MS = 5000;

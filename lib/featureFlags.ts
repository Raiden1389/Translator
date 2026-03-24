/**
 * Feature Flags for UI Polish (v2.7.0)
 * 
 * Hard flags - When OFF, features have ZERO side effects:
 * - No DB touch
 * - No event listeners
 * - No shortcuts registered
 * - No components rendered
 * 
 * Safe for rollback to v2.6.0
 */

export const featureFlags = {
  /**
   * UI Preferences Storage
   * Enables storing UI preferences in IndexedDB
   * Table: uiPreferences (version 105)
   */
  uiPreferences: true,

  /**
   * Command Palette
   * Keyboard-first command interface (Ctrl+K)
   * Depends on: uiPreferences
   */
  commandPalette: true, // ON for Day 4-5 testing

  /**
   * Global Keyboard Shortcuts
   * Customizable shortcuts for all major actions
   * Depends on: uiPreferences
   */
  globalShortcuts: true, // ON for Day 3 testing

  /**
   * Workflow Presets
   * Save and replay workflow pipelines
   * Table: workflowPresets (version 106)
   */
  workflowPresets: false, // OFF until Phase 2 complete

  /**
   * Reader Comfort Enhancements
   * Font size, line height, focus mode
   * Depends on: uiPreferences
   */
  readerComfort: false, // OFF until Phase 3 complete

  /**
   * Zero-Confirm + Undo System
   * Smart confirmation rules with undo toast
   * Depends on: uiPreferences
   */
  zeroConfirm: false, // OFF until Phase 4 complete

  /**
   * Antigravity Bridge (Experimental)
   * Fallback translation via Agent chat when API key runs out.
   * Uses file-based inbox/outbox at ~/.raiden/bridge/
   */
  antigravityBridge: true, // ON for testing

  /**
   * Term Audit (Experimental)
   * Post-translation consistency checker for Vietnamese terms.
   * Detects variant spellings of the same concept, clusters them,
   * and lets user pick canonical form → pushed to Corrections.
   * OFF by default — zero DB writes, zero side effects when OFF.
   */
  termAudit: false, // OFF until Phase 3 (UI) complete
} as const;

/**
 * Type-safe feature flag keys
 */
export type FeatureFlag = keyof typeof featureFlags;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag];
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): FeatureFlag[] {
  return Object.entries(featureFlags)
    .filter(([, enabled]) => enabled)
    .map(([flag]) => flag as FeatureFlag);
}

/**
 * Development helper - Log enabled features
 */
export function logEnabledFeatures(): void {
  const enabled = getEnabledFeatures();
  if (enabled.length === 0) {
    console.log('🚫 No UI Polish features enabled');
    return;
  }

  console.log('✅ Enabled UI Polish features:', enabled.join(', '));
}

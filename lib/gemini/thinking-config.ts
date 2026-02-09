/**
 * Build thinking config based on model version
 * Gemini 2.5: Uses thinkingBudget (-1 = dynamic, 0 = disabled)
 * Gemini 3.0: Uses thinking_level ("minimal" | "low" | "medium" | "high")
 */
export const buildThinkingConfig = (
  model: string,
  legacyEnableThinking?: boolean,
  level?: "minimal" | "low" | "medium" | "high"
): { thinkingBudget?: number; thinking_level?: string } => {
  const isGemini3 = model.includes('gemini-3');

  if (isGemini3) {
    // Gemini 3.0: Use thinking_level
    return {
      thinking_level: level || "minimal"  // Default to minimal to save cost
    };
  } else {
    // Gemini 2.5: Use thinkingBudget
    return {
      thinkingBudget: legacyEnableThinking ? -1 : 0
    };
  }
};

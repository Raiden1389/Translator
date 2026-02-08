// Re-export all types
export * from "./types";

// Re-export client functions
export { recordUsage, getAvailableKeys, withKeyRotation } from "./client";

// Re-export core processing engine
export {
    normalizeVietnameseContent,
    scrubAIChatter,
    extractResponseText,
    cleanJsonResponse,
    applyAllCorrections,
    finalSweep
} from "./contentProcessor";

// Re-export constants
export {
    VOICE_TONE_RULE,
    STRUCTURE_RULE,
    CORE_RULES
} from "./constants";

// Re-export adaptive token management
export { withAdaptiveTokens, calculateDynamicTokens } from "./adaptive-tokens";
export type { TokenConfig, AdaptiveResult } from "./adaptive-tokens";

// Re-export translation modules
export { buildGlossary } from "./translation/glossary-builder";
export { parsePlainTextChapter } from "./translation/parser";
export { applyPostProcessing } from "./translation/post-processor";
export { calculateStats } from "./translation/stats-calculator";
export type { GlossaryResult } from "./translation/glossary-builder";
export type { TranslationStats } from "./translation/stats-calculator";

// Re-export main translation
export { translateChapter } from "./translate";

// Re-export chunking
export { splitByParagraph, shouldUseChunking, translateWithChunking } from "./chunking";

// Re-export glossary features
export { extractGlossary, categorizeTerms, translateTerms, analyzeEntities } from "./glossary";

// Re-export inspector
export { inspectChapter } from "./inspector";

// Re-export prompt lab
export { generatePromptVariants, evaluateTranslation } from "./prompt-lab";

// Re-export style DNA
export { analyzeStyleDNA } from "./style-dna";

// Re-export book summary
export { generateBookSummary } from "./book-summary";

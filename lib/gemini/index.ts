// Re-export all types
export * from "./types";

// Re-export client functions
export { recordUsage, getAvailableKeys, withKeyRotation, createContextCache, deleteContextCache } from "./client";

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
    CAPITALIZATION_RULE,
    VOICE_TONE_RULE,
    STRUCTURE_RULE,
    CORE_RULES,
    buildSystemInstruction
} from "./constants";

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

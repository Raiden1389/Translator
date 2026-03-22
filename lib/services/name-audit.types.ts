/**
 * 🔍 Name Audit Types
 * 
 * Shared types for the Name Consistency Audit feature.
 * Post-translation scanner to detect inconsistent character name translations.
 */

// ────────────────────────────────────────────────────
// 1. EXTRACTION TYPES
// ────────────────────────────────────────────────────

/** Reference to where a name was found — links back to original Chinese paragraph */
export interface SourceParagraphRef {
    chapterOrder: number;       // Chapter order number
    chapterId?: number;         // Chapter DB id (for loading)
    paragraphIndex: number;     // Paragraph index within the chapter
    vietnameseParagraph: string; // The translated paragraph containing the name
    chineseParagraph?: string;  // The original Chinese paragraph (same index)
    /** VietPhrase conversion: '朱南走进了房间' → 'Chu Nam đi vào phòng' — primary, easy to read */
    chineseVietPhrase?: string;
    /** Hán Việt fallback: '朱南走进了房间' → 'Chu Nam Tẩu Tiến Liễu Phòng Gian' */
    chineseHanViet?: string;
}

/** A single name occurrence found in Vietnamese translated text */
export interface VietnameseNameOccurrence {
    name: string;           // "Cư Nam"
    count: number;          // 20
    chapters: number[];     // [6, 7, 8, ..., 45] (chapter orders)
    contexts: string[];     // Sample sentences containing the name (max 3)
    /** Where this name was found — first 5 refs for tooltip/preview */
    sourceRefs: SourceParagraphRef[];
}

/** A single name occurrence found in Chinese original text */
export interface ChineseNameOccurrence {
    name: string;           // "朱南"
    hanViet: string;        // "Chu Nam" (from SyllableRepository)
    count: number;          // 30
    chapters: number[];     // chapter orders
}

/** Paragraph-aligned pair for cross-referencing */
export interface AlignedParagraph {
    index: number;
    original: string;       // Chinese paragraph
    translated: string;     // Vietnamese paragraph
}

// ────────────────────────────────────────────────────
// 2. CLUSTERING TYPES
// ────────────────────────────────────────────────────

/** A cluster of similar Vietnamese names that likely refer to the same character */
export interface NameCluster {
    id: string;                           // Auto-generated ID
    chineseName?: string;                 // "朱南" (if cross-ref found)
    hanViet?: string;                     // "Chu Nam"
    variants: NameVariant[];
    suggestedCanonical: string;           // Highest frequency variant
    totalOccurrences: number;             // Sum of all variants
    isInconsistent: boolean;              // true if variants.length > 1
    confidence: number;                   // 0-1 (1 = confirmed by Chinese cross-ref)
}

/** A single variant within a cluster */
export interface NameVariant {
    name: string;                         // "Cư Nam"
    count: number;                        // 20
    chapters: number[];                   // [6,7,...,45]
    contexts: string[];                   // Sample sentences
    sourceRefs: SourceParagraphRef[];     // Paragraph references for look-back
}

// ────────────────────────────────────────────────────
// 3. REPORT TYPES
// ────────────────────────────────────────────────────

/** Cross-reference mapping: Chinese name → Vietnamese variants */
export interface CrossRefEntry {
    chineseName: string;                  // "朱南"
    hanViet: string;                      // "Chu Nam"
    vietnameseVariants: string[];         // ["Cư Nam", "Trư Nam"]
}

/** Full scan result from Phase 1 */
export interface NameScanResult {
    vietnameseNames: VietnameseNameOccurrence[];
    chineseNames: ChineseNameOccurrence[];
    crossRefMap: CrossRefEntry[];
    totalChaptersScanned: number;
    scanDurationMs: number;
}

/** Final audit report (Phase 2 output) */
export interface NameAuditReport {
    clusters: NameCluster[];
    inconsistentCount: number;            // Clusters with > 1 variant
    consistentCount: number;              // Clusters with exactly 1 variant
    totalNamesFound: number;
    totalChaptersScanned: number;
    scanDurationMs: number;
}

// ────────────────────────────────────────────────────
// 4. FIX TYPES (Phase 4)
// ────────────────────────────────────────────────────

/** User's selection for a cluster fix */
export interface NameFixSelection {
    clusterId: string;
    canonicalName: string;                // The name user chose as correct
    variantsToReplace: string[];          // Names to replace with canonical
}

/** Result of applying fixes */
export interface NameFixResult {
    rulesCreated: number;
    chaptersFixed: number;
    durationMs: number;
}

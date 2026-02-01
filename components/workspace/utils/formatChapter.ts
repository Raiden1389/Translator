"use client";

import { InspectionIssue } from "@/lib/types";
import { type DictionaryEntry, type CorrectionEntry } from "@/lib/db";

import { applyAllCorrections, finalSweep } from "@/lib/gemini/contentProcessor";

interface FormatParams {
    text: string;
    activeTTSIndex?: number | null;
    inspectionIssues?: InspectionIssue[];
    corrections?: CorrectionEntry[];
    glossary?: DictionaryEntry[]; // Added glossary support for dynamic capitalization
}

export interface ParagraphData {
    id: string;
    text: string;
    isHighlighted: boolean;
    issues: InspectionIssue[];
}

/**
 * Logic for converting raw chapter text into structured paragraph data.
 * This can be further optimized with Web Workers or caching.
 */
export function formatChapterToParagraphs({
    text,
    activeTTSIndex = null,
    inspectionIssues = [],
    corrections = [],
    glossary = []
}: FormatParams): ParagraphData[] {
    const normalizedText = (text || "").normalize('NFC');
    if (!normalizedText) return [];

    // Cleaning and split logic
    // Handle various line break types and common mangled paragraph markers
    const cleaned = normalizedText
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\u2028/g, "\n") // Unicode Line Separator
        .replace(/\u2029/g, "\n") // Unicode Paragraph Separator
        .replace(/<br\s*\/?>/gi, "\n") // Convert any HTML breaks to newlines
        .replace(/:\s*\n+\s*\[/g, ": [") // Fix common novel dialogue breaks
        .trim();

    // Split by one or more newlines to handle both single and double line breaks as potential paragraph starts
    // But since we want to preserve paragraphs that were split by single newlines as individual blocks:
    const rawParagraphs = cleaned.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);

    return rawParagraphs.map((rawPara, index) => {
        const isHighlighted = activeTTSIndex === index;

        // 1. Apply user corrections first
        let para = applyAllCorrections(rawPara, corrections);

        // 2. Apply Smart Capitalization and final polish (LIVE)
        para = finalSweep(para, glossary);

        // Map inspection issues to this specific paragraph
        const paraIssues = (inspectionIssues || []).filter(issue =>
            issue.original && para.includes(issue.original)
        );

        return {
            id: `para-${index}`,
            text: para,
            isHighlighted,
            issues: paraIssues
        };
    });
}

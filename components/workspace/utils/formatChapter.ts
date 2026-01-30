"use client";

import { InspectionIssue } from "@/lib/types";

import { applyAllCorrections, finalSweep } from "@/lib/gemini/contentProcessor";

interface FormatParams {
    text: string;
    activeTTSIndex?: number | null;
    inspectionIssues?: InspectionIssue[];
    corrections?: any[];
    glossary?: any[]; // Added glossary support for dynamic capitalization
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
    const cleaned = normalizedText
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/:\s*\n+\s*\[/g, ": [") // Fix common novel dialogue breaks
        .trim();

    const rawParagraphs = cleaned.split('\n').filter(p => p.trim().length > 0);

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

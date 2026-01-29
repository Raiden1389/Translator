"use client";

import { InspectionIssue } from "@/lib/types";

import { applyAllCorrections } from "@/lib/gemini/helpers";

interface FormatParams {
    text: string;
    activeTTSIndex?: number | null;
    inspectionIssues?: InspectionIssue[];
    corrections?: any[];
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
    corrections = []
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
        const para = applyAllCorrections(rawPara, corrections);

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

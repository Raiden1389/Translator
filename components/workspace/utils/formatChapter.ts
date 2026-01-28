"use client";

import { InspectionIssue } from "@/lib/types";

interface FormatParams {
    text: string;
    activeTTSIndex?: number | null;
    inspectionIssues?: InspectionIssue[];
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
    inspectionIssues = []
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

    return rawParagraphs.map((para, index) => {
        const isHighlighted = activeTTSIndex === index;

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

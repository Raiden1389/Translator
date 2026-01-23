"use client";

import { useTranslation } from "@/components/workspace/hooks/TranslationProvider";
import { TranslationProgressOverlay } from "@/components/workspace/TranslationProgressOverlay";

export function GlobalTranslationProgress() {
    const { isTranslating, batchProgress } = useTranslation();
    return <TranslationProgressOverlay isTranslating={isTranslating} progress={batchProgress} />;
}

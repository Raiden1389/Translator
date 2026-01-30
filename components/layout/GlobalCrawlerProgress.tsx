"use client";

import React from "react";
import { useCrawler } from "@/components/workspace/hooks/useCrawler";
import { ImportProgressOverlay } from "@/components/workspace/ImportProgressOverlay";

export function GlobalCrawlerProgress() {
    const { isRunning, progress, completed, total, currentTitle } = useCrawler();

    // Reuse ImportProgressOverlay for consistency
    return (
        <ImportProgressOverlay
            importing={isRunning}
            progress={progress}
            importStatus={`Đang tải chương ${completed}/${total}: ${currentTitle}`}
        />
    );
}

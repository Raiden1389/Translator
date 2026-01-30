"use client";

import { useState, useEffect } from "react";
import { globalCrawler } from "@/lib/services/crawler/controller/crawlController";

export function useCrawler() {
    const [state, setState] = useState({
        isRunning: false,
        completed: 0,
        total: 0,
        currentTitle: '',
        failed: 0
    });

    useEffect(() => {
        const unsubscribe = globalCrawler.subscribe((newState) => {
            setState(newState);
        });
        return () => { unsubscribe(); };
    }, []);

    const progress = state.total > 0 ? Math.round((state.completed / state.total) * 100) : 0;

    return {
        ...state,
        progress
    };
}

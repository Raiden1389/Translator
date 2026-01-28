"use client";

import { useMemo } from "react";
import { DictionaryEntry } from "@/lib/db";
import { DictionaryManager } from "@/lib/dictionary-manager";

export function useDictionaryEngine(dictEntries: DictionaryEntry[] | undefined) {
    const dictManager = useMemo(() => {
        if (!dictEntries) return null;
        return new DictionaryManager(dictEntries);
    }, [dictEntries]);

    const tokenize = (text: string) => {
        if (!dictManager || !text) return [{ text, isEntry: false }];
        return dictManager.tokenize(text);
    };

    return {
        dictManager,
        tokenize
    };
}

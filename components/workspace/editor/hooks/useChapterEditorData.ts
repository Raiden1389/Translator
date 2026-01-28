"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type Workspace, type Chapter, type DictionaryEntry } from "@/lib/db";

export function useChapterEditorData(id: string, chapterId: string) {
    const workspace = useLiveQuery(() => db.workspaces.get(id), [id]) as Workspace | undefined;
    const chapter = useLiveQuery(() => db.chapters.get(parseInt(chapterId)), [chapterId]) as Chapter | undefined;
    const dictEntries = useLiveQuery(() => db.dictionary.toArray()) as DictionaryEntry[] | undefined;
    const allChapters = useLiveQuery(() => db.chapters.where("workspaceId").equals(id).sortBy("order"), [id]);

    const currentIndex = allChapters?.findIndex(c => c.id === parseInt(chapterId)) ?? -1;
    const totalChapters = allChapters?.length || 0;
    const prevChapterId = currentIndex > 0 ? allChapters?.[currentIndex - 1]?.id : null;
    const nextChapterId = (allChapters && currentIndex < allChapters.length - 1) ? allChapters?.[currentIndex + 1]?.id : null;

    const isLoading = !workspace || !chapter;

    return {
        workspace,
        chapter,
        dictEntries,
        allChapters,
        currentIndex,
        totalChapters,
        prevChapterId,
        nextChapterId,
        isLoading
    };
}

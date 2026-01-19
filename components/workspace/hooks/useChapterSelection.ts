import { useState, useMemo, useCallback } from "react";

export function useChapterSelection(allChapterIds: number[]) {
    const [selectedChapters, setSelectedChapters] = useState<number[]>([]);

    const toggleSelectAll = useCallback((filteredIds: number[]) => {
        if (filteredIds.length === 0) return;
        if (selectedChapters.length === filteredIds.length) {
            setSelectedChapters([]);
        } else {
            setSelectedChapters(filteredIds);
        }
    }, [selectedChapters.length]);

    const toggleSingleSelection = useCallback((id: number) => {
        setSelectedChapters(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    }, []);

    const isSelected = useCallback((id: number) => selectedChapters.includes(id), [selectedChapters]);

    return {
        selectedChapters,
        setSelectedChapters,
        toggleSelectAll,
        toggleSingleSelection,
        isSelected
    };
}

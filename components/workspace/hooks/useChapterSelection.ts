import { useState, useCallback, useMemo } from "react";

export function useChapterSelection(allChapterIds: number[]) {
    // PERFORMANCE FIX: Use Set internally for O(1) operations
    const [selectedSet, setSelectedSet] = useState<Set<number>>(new Set());
    const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

    // Export as array for compatibility
    const selectedChapters = useMemo(() => Array.from(selectedSet), [selectedSet]);

    const setSelectedChapters = useCallback((idsOrUpdater: number[] | ((prev: number[]) => number[])) => {
        if (typeof idsOrUpdater === 'function') {
            setSelectedSet(prev => {
                const prevArray = Array.from(prev);
                const newArray = idsOrUpdater(prevArray);
                return new Set(newArray);
            });
        } else {
            setSelectedSet(new Set(idsOrUpdater));
        }
    }, []);

    const toggleSelectAll = useCallback((filteredIds: number[]) => {
        if (filteredIds.length === 0) return;
        if (selectedSet.size === filteredIds.length) {
            setSelectedSet(new Set());
            setLastSelectedIndex(null);
        } else {
            setSelectedSet(new Set(filteredIds));
            setLastSelectedIndex(null);
        }
    }, [selectedSet.size]);

    const handleSelect = useCallback((id: number, shiftKey?: boolean) => {
        const currentIndex = allChapterIds.indexOf(id);

        if (shiftKey && lastSelectedIndex !== null) {
            const start = Math.min(lastSelectedIndex, currentIndex);
            const end = Math.max(lastSelectedIndex, currentIndex);
            const rangeIds = allChapterIds.slice(start, end + 1);

            setSelectedSet(prev => {
                const newSet = new Set(prev);
                rangeIds.forEach(rid => newSet.add(rid));
                return newSet;
            });
        } else {
            // O(1) operation instead of O(N)!
            setSelectedSet(prev => {
                const newSet = new Set(prev);
                if (newSet.has(id)) {
                    newSet.delete(id);
                } else {
                    newSet.add(id);
                }
                return newSet;
            });
            setLastSelectedIndex(currentIndex);
        }
    }, [allChapterIds, lastSelectedIndex]);

    const isSelected = useCallback((id: number) => selectedSet.has(id), [selectedSet]);

    return {
        selectedChapters,
        setSelectedChapters,
        toggleSelectAll,
        handleSelect,
        isSelected
    };
}

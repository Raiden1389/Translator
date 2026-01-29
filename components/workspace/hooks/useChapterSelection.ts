import { useState, useCallback } from "react";

export function useChapterSelection(allChapterIds: number[]) {
    const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
    const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

    const toggleSelectAll = useCallback((filteredIds: number[]) => {
        if (filteredIds.length === 0) return;
        if (selectedChapters.length === filteredIds.length) {
            setSelectedChapters([]);
            setLastSelectedIndex(null);
        } else {
            setSelectedChapters(filteredIds);
            setLastSelectedIndex(null);
        }
    }, [selectedChapters.length]);

    const handleSelect = useCallback((id: number, shiftKey?: boolean) => {
        const currentIndex = allChapterIds.indexOf(id);

        if (shiftKey && lastSelectedIndex !== null) {
            const start = Math.min(lastSelectedIndex, currentIndex);
            const end = Math.max(lastSelectedIndex, currentIndex);
            const rangeIds = allChapterIds.slice(start, end + 1);

            setSelectedChapters(prev => {
                const newSet = new Set(prev);
                rangeIds.forEach(rid => newSet.add(rid));
                return Array.from(newSet);
            });
        } else {
            setSelectedChapters(prev =>
                prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
            );
            setLastSelectedIndex(currentIndex);
        }
    }, [allChapterIds, lastSelectedIndex]);

    const isSelected = useCallback((id: number) => selectedChapters.includes(id), [selectedChapters]);

    return {
        selectedChapters,
        setSelectedChapters,
        toggleSelectAll,
        handleSelect,
        isSelected
    };
}

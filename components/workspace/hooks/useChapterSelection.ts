import { useState, useMemo } from "react";

export function useChapterSelection(allChapterIds: number[]) {
    const [selectedChapters, setSelectedChapters] = useState<number[]>([]);

    const toggleSelectAll = (filteredIds: number[]) => {
        if (filteredIds.length === 0) return;
        if (selectedChapters.length === filteredIds.length) {
            setSelectedChapters([]);
        } else {
            setSelectedChapters(filteredIds);
        }
    };

    const toggleSingleSelection = (id: number) => {
        setSelectedChapters(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const isSelected = (id: number) => selectedChapters.includes(id);

    return {
        selectedChapters,
        setSelectedChapters,
        toggleSelectAll,
        toggleSingleSelection,
        isSelected
    };
}

"use client";

import { useState } from "react";
import { usePersistedState } from "@/lib/hooks/usePersistedState";
import { ChapterListUIState } from "./useChapterList.types";

export function useChapterListUI(workspaceId: string) {
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = usePersistedState<"all" | "draft" | "translated">(`workspace-${workspaceId}-filter`, "all");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = usePersistedState(`workspace-${workspaceId}-perPage`, 50);
    const [viewMode, setViewMode] = usePersistedState<"grid" | "table">(`workspace-${workspaceId}-viewMode`, "grid");

    return {
        search, setSearch,
        filterStatus, setFilterStatus,
        currentPage, setCurrentPage,
        itemsPerPage, setItemsPerPage,
        viewMode, setViewMode
    };
}

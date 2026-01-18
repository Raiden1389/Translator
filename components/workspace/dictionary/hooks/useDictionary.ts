"use client";

import { useState, useMemo, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { useDictionaryAI } from "./useDictionaryAI";

export function useDictionary(workspaceId: string) {
    // Data
    const dictionary = useLiveQuery(
        () => db.dictionary.where('workspaceId').equals(workspaceId).toArray(),
        [workspaceId]
    ) || [];

    // State
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState<string>("all");
    const [isAdding, setIsAdding] = useState(false);
    const [newOriginal, setNewOriginal] = useState("");
    const [newTranslated, setNewTranslated] = useState("");
    const [newType, setNewType] = useState("general");
    const [selectedEntries, setSelectedEntries] = useState<number[]>([]);

    // AI Hook
    const aiHook = useDictionaryAI(workspaceId);

    // Filtered data with useMemo for performance
    const filteredDic = useMemo(() => {
        return dictionary
            .filter(d => d.type !== 'name')
            .filter(d => filterType === "all" || d.type === filterType)
            .filter(d =>
                d.original.toLowerCase().includes(search.toLowerCase()) ||
                d.translated.toLowerCase().includes(search.toLowerCase())
            )
            .sort((a, b) => (a.id || 0) - (b.id || 0));
    }, [dictionary, filterType, search]);

    // Handlers with useCallback
    const handleAdd = useCallback(async () => {
        if (!newOriginal || !newTranslated || !workspaceId) return;
        try {
            const existing = await db.dictionary
                .where({ original: newOriginal, workspaceId: workspaceId })
                .first();

            if (existing) {
                await db.dictionary.update(existing.id!, {
                    translated: newTranslated,
                    type: newType as any,
                    createdAt: new Date()
                });
            } else {
                await db.dictionary.add({
                    workspaceId,
                    original: newOriginal,
                    translated: newTranslated,
                    type: newType as any,
                    createdAt: new Date()
                });
            }
            setNewOriginal("");
            setNewTranslated("");
            setNewType("general");
            setIsAdding(false);
        } catch (e) {
            console.error(e);
        }
    }, [newOriginal, newTranslated, newType, workspaceId]);

    const handleDelete = useCallback(async (id: number) => {
        try {
            await db.dictionary.delete(id);
            toast.success("Đã xóa thuật ngữ.");
        } catch (e) {
            console.error("Delete failed:", e);
            toast.error("Lỗi khi xóa.");
        }
    }, []);

    const handleUpdateType = useCallback(async (id: number, type: string) => {
        await db.dictionary.update(id, { type: type as any });
    }, []);

    const handleBulkDelete = useCallback(async () => {
        if (!selectedEntries.length) return;
        if (confirm(`Xóa ${selectedEntries.length} mục đã chọn?`)) {
            await db.dictionary.bulkDelete(selectedEntries);
            setSelectedEntries([]);
        }
    }, [selectedEntries]);

    const handleBulkUpdateType = useCallback(async (type: string) => {
        if (!selectedEntries.length) return;
        await db.dictionary.where('id').anyOf(selectedEntries).modify({ type: type as any });
    }, [selectedEntries]);

    const toggleSelectAll = useCallback(() => {
        if (selectedEntries.length === filteredDic.length) {
            setSelectedEntries([]);
        } else {
            setSelectedEntries(filteredDic.map(d => d.id!));
        }
    }, [selectedEntries.length, filteredDic]);

    const handleBlacklist = useCallback(async (id: number) => {
        try {
            const item = await db.dictionary.get(id);
            if (item) {
                await db.blacklist.add({
                    workspaceId,
                    word: item.original,
                    translated: item.translated,
                    source: 'manual',
                    createdAt: new Date()
                });
                await db.dictionary.delete(id);
                toast.success("Đã chuyển vào Blacklist.");
            }
        } catch (e) {
            console.error(e);
            toast.error("Lỗi khi chuyển vào Blacklist.");
        }
    }, [workspaceId]);

    const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                const lines = text.split('\n').filter(l => l.trim());
                let imported = 0;
                let updated = 0;

                for (const line of lines) {
                    const [original, translated, type] = line.split('\t');
                    if (!original || !translated) continue;

                    const existing = await db.dictionary.where({ original, workspaceId }).first();
                    if (existing) {
                        await db.dictionary.update(existing.id!, {
                            translated,
                            type: (type || 'general') as any,
                            createdAt: new Date()
                        });
                        updated++;
                    } else {
                        await db.dictionary.add({
                            workspaceId,
                            original,
                            translated,
                            type: (type || 'general') as any,
                            createdAt: new Date()
                        });
                        imported++;
                    }
                }
                toast.success(`Import thành công: ${imported} mới, ${updated} cập nhật.`);
            } catch (err) {
                console.error(err);
                toast.error("Lỗi import file.");
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }, [workspaceId]);

    const handleExport = useCallback(async () => {
        const data = dictionary.map(d => `${d.original}\t${d.translated}\t${d.type}`).join('\n');
        const blob = new Blob([data], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dictionary.txt';
        a.click();
        URL.revokeObjectURL(url); // Cleanup
    }, [dictionary]);

    return {
        dictionary,
        filteredDic,
        search,
        setSearch,
        filterType,
        setFilterType,
        selectedEntries,
        setSelectedEntries,
        isAdding,
        setIsAdding,
        newOriginal,
        setNewOriginal,
        newTranslated,
        setNewTranslated,
        newType,
        setNewType,
        ...aiHook,
        handleAdd,
        handleDelete,
        handleUpdateType,
        handleBulkDelete,
        handleBulkUpdateType,
        toggleSelectAll,
        handleBlacklist,
        handleImport,
        handleExport,
    };
}

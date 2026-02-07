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
                .where('[workspaceId+original]')
                .equals([workspaceId, newOriginal])
                .first();

            if (existing) {
                await db.dictionary.update(existing.id!, {
                    translated: newTranslated,
                    type: newType,
                    createdAt: new Date()
                });
            } else {
                await db.dictionary.add({
                    workspaceId,
                    original: newOriginal,
                    translated: newTranslated,
                    type: newType,
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
        await db.dictionary.update(id, { type });
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
        await db.dictionary.where('id').anyOf(selectedEntries).modify({ type });
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

                    const existing = await db.dictionary.where('[workspaceId+original]').equals([workspaceId, original]).first();
                    if (existing) {
                        await db.dictionary.update(existing.id!, {
                            translated,
                            type: type || 'general',
                            createdAt: new Date()
                        });
                        updated++;
                    } else {
                        await db.dictionary.add({
                            workspaceId,
                            original,
                            translated,
                            type: type || 'general',
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

    const handleExportJSON = useCallback(async () => {
        const fileName = `dictionary-export-${new Date().getTime()}.json`;
        const content = JSON.stringify(dictionary, null, 2);

        // 1. Try Tauri Native Save Dialog if available
        if (typeof window !== 'undefined' && (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
            try {
                const { save } = await import("@tauri-apps/plugin-dialog");
                const { writeTextFile } = await import("@tauri-apps/plugin-fs");

                const path = await save({
                    defaultPath: fileName,
                    filters: [{ name: 'JSON', extensions: ['json'] }]
                });

                if (path) {
                    await writeTextFile(path, content);
                    toast.success("Đã xuất từ điển thành công!");
                    return;
                }
                return; // Canceled
            } catch (err) {
                console.error("Tauri Export Error:", err);
            }
        }

        // 2. Fallback to standard Browser download
        const blob = new Blob([content], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Đã xuất từ điển thành công!");
    }, [dictionary]);

    const handleImportJSON = useCallback(async () => {
        let text = "";

        // 1. Try Tauri Native Dialog if available
        if (typeof window !== 'undefined' && (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
            try {
                const { open } = await import("@tauri-apps/plugin-dialog");
                const { readTextFile } = await import("@tauri-apps/plugin-fs");

                const selected = await open({
                    filters: [{ name: 'JSON', extensions: ['json'] }],
                    multiple: false
                });

                if (selected && typeof selected === 'string') {
                    text = await readTextFile(selected);
                } else if (selected && typeof selected === 'object' && 'path' in selected) {
                    text = await readTextFile((selected as { path: string }).path);
                } else {
                    return; // Canceled
                }
            } catch (err) {
                console.error("Tauri Import Error:", err);
                toast.error("Lỗi khi mở file JSON.");
                return;
            }
        } else {
            // 2. Fallback to standard file input for web
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    text = await file.text();
                    await processJSONImport(text);
                }
            };
            input.click();
            return;
        }

        await processJSONImport(text);

        async function processJSONImport(jsonText: string) {
            try {
                const data = JSON.parse(jsonText);
                if (!Array.isArray(data)) {
                    toast.error("Định dạng JSON không hợp lệ.");
                    return;
                }

                let imported = 0;
                let updated = 0;

                for (const item of data) {
                    if (!item.original || !item.translated) continue;

                    const existing = await db.dictionary
                        .where('[workspaceId+original]')
                        .equals([workspaceId, item.original])
                        .first();

                    if (existing) {
                        await db.dictionary.update(existing.id!, {
                            translated: item.translated,
                            type: item.type || 'general',
                            description: item.description,
                            createdAt: new Date()
                        });
                        updated++;
                    } else {
                        await db.dictionary.add({
                            workspaceId,
                            original: item.original,
                            translated: item.translated,
                            type: item.type || 'general',
                            description: item.description,
                            createdAt: new Date()
                        });
                        imported++;
                    }
                }

                toast.success(`Nhập thành công: ${imported} mới, ${updated} cập nhật.`);
            } catch (err) {
                console.error(err);
                toast.error("Lỗi khi nhập file JSON.");
            }
        }
    }, [workspaceId]);

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

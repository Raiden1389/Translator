"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DictionaryEntry } from "@/lib/db";
import { toast } from "sonner";
import { GlossaryCharacter, GlossaryTerm } from "@/lib/types";

export function useCharacterManagement(workspaceId: string) {
    const dictionary = useLiveQuery(() =>
        db.dictionary.where({ type: "name", workspaceId }).toArray(), [workspaceId]
    ) || [];

    const [search, setSearch] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isReviewOpen, setIsReviewOpen] = useState(false);

    const [newChar, setNewChar] = useState<Partial<DictionaryEntry>>({
        original: "",
        translated: "",
        gender: "male",
        role: "support",
        description: ""
    });

    const filteredChars = dictionary
        .filter(d =>
            d.original.toLowerCase().includes(search.toLowerCase()) ||
            d.translated.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => (a.id || 0) - (b.id || 0));

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredChars.length && filteredChars.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredChars.map(c => c.id!));
        }
    };

    const handleSelect = (id: number, checked: boolean, shiftKey?: boolean) => {
        if (shiftKey && selectedIds.length > 0) {
            const lastId = selectedIds[selectedIds.length - 1];
            const lastIndex = filteredChars.findIndex(c => c.id === lastId);
            const currentIndex = filteredChars.findIndex(c => c.id === id);

            if (lastIndex !== -1 && currentIndex !== -1) {
                const start = Math.min(lastIndex, currentIndex);
                const end = Math.max(lastIndex, currentIndex);
                const rangeIds = filteredChars.slice(start, end + 1).map(c => c.id!);

                const newSelected = Array.from(new Set([...selectedIds, ...rangeIds]));
                setSelectedIds(newSelected);
                return;
            }
        }

        if (checked) {
            setSelectedIds(prev => Array.from(new Set([...prev, id])));
        } else {
            setSelectedIds(prev => prev.filter(i => i !== id));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (confirm(`Xóa ${selectedIds.length} nhân vật đã chọn?`)) {
            await db.dictionary.bulkDelete(selectedIds);
            setSelectedIds([]);
            toast.success(`Đã xóa ${selectedIds.length} nhân vật`);
        }
    };

    const handleAdd = async () => {
        if (!newChar.original || !newChar.translated) return;
        try {
            await db.dictionary.add({
                workspaceId,
                original: newChar.original,
                translated: newChar.translated,
                type: 'name',
                gender: newChar.gender as DictionaryEntry['gender'],
                role: newChar.role as DictionaryEntry['role'],
                description: newChar.description,
                createdAt: new Date()
            });
            setIsAdding(false);
            setNewChar({ original: "", translated: "", gender: "male", role: "support", description: "" });
            toast.success("Đã thêm nhân vật mới");
        } catch (e) {
            console.error(e);
            toast.error("Lỗi khi thêm nhân vật");
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm("Chắc chắn xóa nhân vật này?")) {
            await db.dictionary.delete(id);
            toast.success("Đã xóa nhân vật");
        }
    };

    const handleUpdate = async (id: number, updates: Partial<DictionaryEntry>) => {
        await db.dictionary.update(id, updates);
    };

    const handleConfirmSave = async (
        selectedChars: GlossaryCharacter[],
        selectedTerms: GlossaryTerm[]
    ) => {
        try {
            let addedCount = 0;
            let updatedCount = 0;

            for (const char of selectedChars) {
                const existing = await db.dictionary.where({ original: char.original, workspaceId }).first();
                if (existing) {
                    await db.dictionary.update(existing.id!, {
                        translated: char.translated,
                        gender: char.gender as DictionaryEntry['gender'],
                        role: char.role as DictionaryEntry['role'],
                        description: existing.description || char.description,
                        createdAt: new Date()
                    });
                    updatedCount++;
                } else {
                    await db.dictionary.add({
                        workspaceId,
                        original: char.original,
                        translated: char.translated,
                        type: 'name',
                        gender: char.gender as DictionaryEntry['gender'],
                        role: char.role as DictionaryEntry['role'],
                        description: char.description,
                        createdAt: new Date()
                    });
                    addedCount++;
                }
            }

            for (const term of selectedTerms) {
                const existing = await db.dictionary.where({ original: term.original, workspaceId }).first();
                if (existing) {
                    await db.dictionary.update(existing.id!, { translated: term.translated, type: term.type as DictionaryEntry['type'] });
                    updatedCount++;
                } else {
                    await db.dictionary.add({ workspaceId, original: term.original, translated: term.translated, type: term.type as DictionaryEntry['type'], createdAt: new Date() });
                    addedCount++;
                }
            }
            toast.success(`Đã lưu ${addedCount + updatedCount} mục! (Thêm mới: ${addedCount}, Cập nhật: ${updatedCount})`);
            setIsReviewOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi lưu kết quả");
        }
    };

    const handleExportJSON = async () => {
        const fileName = `characters-export-${new Date().getTime()}.json`;
        const content = JSON.stringify(dictionary, null, 2);

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
                    toast.success("Đã xuất danh sách nhân vật thành công!");
                    return;
                }
                return;
            } catch (err) {
                console.error("Tauri Export Error:", err);
            }
        }

        const blob = new Blob([content], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Đã xuất danh sách nhân vật thành công!");
    };

    const handleImportJSON = async () => {
        let text = "";

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
                } else if (selected && typeof selected === 'object' && selected !== null && 'path' in selected) {
                    text = await readTextFile((selected as { path: string }).path);
                } else {
                    return;
                }
            } catch (err) {
                console.error("Tauri Import Error:", err);
                toast.error("Lỗi khi mở file JSON.");
                return;
            }
        } else {
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
                            type: 'name',
                            gender: item.gender,
                            role: item.role,
                            description: item.description,
                            createdAt: new Date()
                        });
                        updated++;
                    } else {
                        await db.dictionary.add({
                            workspaceId,
                            original: item.original,
                            translated: item.translated,
                            type: 'name',
                            gender: item.gender,
                            role: item.role,
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
    };

    return {
        dictionary,
        search,
        setSearch,
        isAdding,
        setIsAdding,
        newChar,
        setNewChar,
        selectedIds,
        setSelectedIds,
        isReviewOpen,
        setIsReviewOpen,
        filteredChars,
        toggleSelectAll,
        handleSelect,
        handleBulkDelete,
        handleConfirmSave,
        handleAdd,
        handleDelete,
        handleUpdate,
        handleExportJSON,
        handleImportJSON
    };
}

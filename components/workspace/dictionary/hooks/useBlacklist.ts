"use client";

import { useState, useMemo, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { translateTerms } from "@/lib/gemini";
import { toast } from "sonner";

export function useBlacklist(workspaceId: string) {
    const blacklist = useLiveQuery(
        () => db.blacklist.where('workspaceId').equals(workspaceId).toArray(),
        [workspaceId]
    ) || [];
    const [sourceFilter, setSourceFilter] = useState<'all' | 'content' | 'engine'>('all');

    const [blacklistSearch, setBlacklistSearch] = useState("");
    const [selectedBlacklist, setSelectedBlacklist] = useState<number[]>([]);
    const [isTranslating, setIsTranslating] = useState(false);

    const filteredBlacklist = useMemo(() => {
        return blacklist
            .filter(b => {
                // Search
                const matchesSearch = b.word.toLowerCase().includes(blacklistSearch.toLowerCase()) ||
                    (b.translated && b.translated.toLowerCase().includes(blacklistSearch.toLowerCase()));

                if (!matchesSearch) return false;

                // Source Filter
                if (sourceFilter === 'content') return b.source === 'ai' || b.source === 'manual';
                if (sourceFilter === 'engine') return b.source === 'heuristic';

                return true;
            })
            .sort((a, b) => (b.id || 0) - (a.id || 0));
    }, [blacklist, blacklistSearch, sourceFilter]);

    const handleRestoreBlacklist = useCallback(async (id: number) => {
        const item = blacklist.find(b => b.id === id);
        if (!item) return;

        await db.blacklist.delete(id);

        const existing = await db.dictionary.where({ original: item.word, workspaceId }).first();
        if (!existing) {
            await db.dictionary.add({
                workspaceId,
                original: item.word,
                translated: item.translated || item.word,
                type: 'general',
                createdAt: new Date()
            });
        }
        toast.success("Đã khôi phục từ Blacklist.");
    }, [blacklist, workspaceId]);

    const handleBulkRestoreBlacklist = useCallback(async () => {
        if (!selectedBlacklist.length) return;
        if (confirm(`Khôi phục (Bỏ chặn) ${selectedBlacklist.length} từ?`)) {
            const itemsToRestore = blacklist.filter(b => selectedBlacklist.includes(b.id!));
            await db.blacklist.bulkDelete(selectedBlacklist);

            const now = new Date();
            for (const item of itemsToRestore) {
                const existing = await db.dictionary.where({ original: item.word, workspaceId }).first();
                if (!existing) {
                    await db.dictionary.add({
                        workspaceId,
                        original: item.word,
                        translated: item.translated || item.word,
                        type: 'general',
                        createdAt: now
                    });
                }
            }
            setSelectedBlacklist([]);
            toast.success(`Đã khôi phục ${itemsToRestore.length} từ.`);
        }
    }, [selectedBlacklist, blacklist, workspaceId]);

    const handleTranslateBlacklist = useCallback(async () => {
        const missingMeanings = blacklist.filter(b => !b.translated || b.translated === b.word);
        if (missingMeanings.length === 0) {
            toast.info("Tất cả các mục đều đã có nghĩa dịch.");
            return;
        }

        setIsTranslating(true);
        try {
            const termsToTranslate = missingMeanings.map(b => b.word);
            const chunkSize = 50;
            for (let i = 0; i < termsToTranslate.length; i += chunkSize) {
                const chunk = termsToTranslate.slice(i, i + chunkSize);
                const results = await translateTerms(chunk);

                for (const res of results) {
                    const item = missingMeanings.find(b => b.word === res.original);
                    if (item) {
                        await db.blacklist.update(item.id!, { translated: res.translated });
                    }
                }
            }
            toast.success(`Đã cập nhật nghĩa cho ${missingMeanings.length} mục trong Blacklist.`);
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('network')) {
                toast.error("Lỗi mạng. Kiểm tra kết nối.");
            } else {
                toast.error("Lỗi khi dịch Blacklist");
            }
        } finally {
            setIsTranslating(false);
        }
    }, [blacklist]);

    const handleBlacklistExport = useCallback(() => {
        const data = blacklist.map(e => ({
            word: e.word,
            translated: e.translated,
            source: e.source,
            createdAt: e.createdAt
        }));
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'blacklist.json';
        a.click();
        URL.revokeObjectURL(url); // Cleanup
        toast.success("Đã export Blacklist.");
    }, [blacklist]);

    const handleBlacklistImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                const data = JSON.parse(text);
                let imported = 0;

                for (const item of data) {
                    const existing = await db.blacklist.where({ word: item.word, workspaceId }).first();
                    if (!existing) {
                        await db.blacklist.add({
                            workspaceId,
                            word: item.word,
                            translated: item.translated || item.word,
                            source: item.source || 'manual',
                            createdAt: new Date(item.createdAt || Date.now())
                        });
                        imported++;
                    }
                }
                toast.success(`Import thành công: ${imported} mục mới.`);
            } catch (err) {
                console.error(err);
                toast.error("Lỗi import file.");
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }, [workspaceId]);

    const handleHeuristicExport = useCallback(async () => {
        const engineTerms = blacklist.filter(b => b.source === 'heuristic');
        if (engineTerms.length === 0) {
            toast.error("Không có mẫu vật (Heuristic) để xuất!");
            return;
        }

        try {
            const { writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
            const content = engineTerms.map(b => b.word).join('\n');
            const filename = `heuristic_engine_samples_${new Date().getTime()}.txt`;
            await writeTextFile(filename, content, { baseDir: BaseDirectory.Desktop });
            toast.success(`✅ Đã xuất ${engineTerms.length} mẫu vật ra Desktop/`, {
                description: filename
            });
        } catch (err) {
            toast.error("Lỗi xuất file: " + String(err));
        }
    }, [blacklist]);

    const handleClearHeuristic = useCallback(async () => {
        const engineTerms = blacklist.filter(b => b.source === 'heuristic');
        if (engineTerms.length === 0) return;

        if (confirm(`⚠️ Xóa toàn bộ ${engineTerms.length} mẫu vật Heuristic để chuẩn bị vòng lặp mới?`)) {
            await db.blacklist
                .where('[workspaceId+source]')
                .equals([workspaceId, 'heuristic'])
                .delete();
            toast.success("Đã dọn sạch bộ nhớ Engine. Sẵn sàng quét lại!");
        }
    }, [blacklist, workspaceId]);

    return {
        blacklist,
        filteredBlacklist,
        blacklistSearch,
        setBlacklistSearch,
        selectedBlacklist,
        setSelectedBlacklist,
        sourceFilter,
        setSourceFilter,
        isTranslating,
        handleRestoreBlacklist,
        handleBulkRestoreBlacklist,
        handleTranslateBlacklist,
        handleBlacklistExport,
        handleBlacklistImport,
        handleHeuristicExport,
        handleClearHeuristic,
        workspaceId
    };
}

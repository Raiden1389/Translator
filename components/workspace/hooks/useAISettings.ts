"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/db";
import { DEFAULT_MODEL, migrateModelId, AI_MODELS } from "@/lib/ai-models";
import { checkGeminiKey, fetchGeminiModels, KeyStatus } from "@/lib/services/ai-service";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";

export function useAISettings() {
    const [primaryKey, setPrimaryKey] = useState("");
    const [poolKeys, setPoolKeys] = useState("");
    const [model, setModel] = useState(DEFAULT_MODEL);
    const [availableModels, setAvailableModels] = useState<{ value: string, label: string }[]>(AI_MODELS);

    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [checkingKeys, setCheckingKeys] = useState(false);
    const [keyStatuses, setKeyStatuses] = useState<KeyStatus[]>([]);
    const [isBackendKeyLoading, setIsBackendKeyLoading] = useState(false);
    const [isFixingWordCount, setIsFixingWordCount] = useState(false);

    // Guarded Load Settings
    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            const [k1, k2, m] = await Promise.all([
                db.settings.get("apiKeyPrimary"),
                db.settings.get("apiKeyPool"),
                db.settings.get("aiModel")
            ]);

            if (isMounted) {
                if (k1) setPrimaryKey(k1.value as string);
                if (k2) setPoolKeys(k2.value as string);
                if (m) setModel(migrateModelId(m.value as string));
            }
        };

        load();
        return () => { isMounted = false; };
    }, []);

    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            await Promise.all([
                db.settings.put({ key: "apiKeyPrimary", value: primaryKey }),
                db.settings.put({ key: "apiKeyPool", value: poolKeys }),
                db.settings.put({ key: "aiModel", value: model })
            ]);
            toast.success("Đã lưu cấu hình thành công!");
        } catch (e) {
            console.error(e);
            toast.error("Lỗi khi lưu cấu hình.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleLoadFromBackend = async () => {
        setIsBackendKeyLoading(true);
        try {
            const key = await invoke<string>("get_gemini_key");
            setPrimaryKey(key);
            toast.success("Đã nạp Key từ Backend (.env) thành công!", {
                description: "Đừng quên bấm 'Lưu Thay Đổi' để áp dụng."
            });
        } catch (err: any) {
            console.error("Backend Key Error:", err);
            toast.error(err.toString());
        } finally {
            setIsBackendKeyLoading(false);
        }
    };

    const handleFetchModels = async () => {
        if (!primaryKey) return;
        setIsLoadingModels(true);
        try {
            const models = await fetchGeminiModels(primaryKey);
            setAvailableModels(models);
        } catch (e: any) {
            toast.error(e.message || "Lỗi khi lấy danh sách Model.");
        } finally {
            setIsLoadingModels(false);
        }
    };

    const handleCheckAllKeys = async () => {
        setCheckingKeys(true);
        const keysToCheck: string[] = [];
        if (primaryKey) keysToCheck.push(primaryKey);
        if (poolKeys) {
            keysToCheck.push(...poolKeys.split(/[\n,;]+/).map(k => k.trim()).filter(k => k.length > 10));
        }

        const uniqueKeys = Array.from(new Set(keysToCheck));
        setKeyStatuses(uniqueKeys.map(k => ({ key: k, status: 'checking' })));

        const results = await Promise.all(uniqueKeys.map(key => checkGeminiKey(key, model)));
        setKeyStatuses(results);
        setCheckingKeys(false);
    };

    const handleFixWordCounts = async () => {
        setIsFixingWordCount(true);
        try {
            let fixed = 0;
            await db.chapters.each(async (chapter) => {
                if (chapter.content_translated) {
                    const count = chapter.content_translated.split(/\s+/).filter(w => w.length > 0).length;
                    if (chapter.wordCountTranslated !== count) {
                        await db.chapters.update(chapter.id!, { wordCountTranslated: count });
                        fixed++;
                    }
                }
            });
            toast.success(`Đã sửa ${fixed} chương!`);
        } catch (e) {
            toast.error("Lỗi: " + e);
        } finally {
            setIsFixingWordCount(false);
        }
    };

    return {
        state: {
            primaryKey, poolKeys, model, availableModels,
            isLoadingModels, isSaving, checkingKeys, keyStatuses,
            isBackendKeyLoading, isFixingWordCount
        },
        actions: {
            setPrimaryKey, setPoolKeys, setModel,
            handleSaveAll, handleLoadFromBackend, handleFetchModels,
            handleCheckAllKeys, handleFixWordCounts
        }
    };
}

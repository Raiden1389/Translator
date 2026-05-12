"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { DEFAULT_MODEL, migrateModelId, AI_MODELS } from "@/lib/ai-models";
import { checkProviderKey, fetchGeminiModels, fetchVertexModels, KeyStatus } from "@/lib/services/ai-service";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import {
    DEFAULT_AI_PROVIDER,
    DEFAULT_VERTEX_AUTH_MODE,
    DEFAULT_VERTEX_PROJECT_ID,
    filterModelsForProvider,
    getVertexLocationForModel,
    normalizeAIProvider,
    normalizeVertexAuthMode,
    sanitizeModelForProvider,
    type AIProvider,
    type VertexAuthMode
} from "@/lib/ai-provider";

interface DetectedVertexServiceAccountInfo {
    path: string;
    project_id?: string | null;
    client_email?: string | null;
}

export function useAISettings() {
    const [provider, setProvider] = useState<AIProvider>(DEFAULT_AI_PROVIDER);
    const [primaryKey, setPrimaryKey] = useState("");
    const [vertexKey, setVertexKey] = useState("");
    const [vertexAuthMode, setVertexAuthMode] = useState<VertexAuthMode>(DEFAULT_VERTEX_AUTH_MODE);
    const [vertexServiceAccountPath, setVertexServiceAccountPath] = useState("");
    const [vertexProjectId, setVertexProjectId] = useState(DEFAULT_VERTEX_PROJECT_ID);
    const [vertexLocation, setVertexLocation] = useState(getVertexLocationForModel(DEFAULT_MODEL));
    const [poolKeys, setPoolKeys] = useState("");
    const [model, setModel] = useState(DEFAULT_MODEL);
    const [availableModels, setAvailableModels] = useState<{ value: string, label: string }[]>(
        filterModelsForProvider(DEFAULT_AI_PROVIDER, AI_MODELS)
    );

    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [checkingKeys, setCheckingKeys] = useState(false);
    const [keyStatuses, setKeyStatuses] = useState<KeyStatus[]>([]);
    const [isBackendKeyLoading, setIsBackendKeyLoading] = useState(false);
    const [isFixingWordCount, setIsFixingWordCount] = useState(false);

    const autoDetectVertexServiceAccount = async (options?: {
        silent?: boolean;
        preferModel?: string;
        preservePath?: string;
        preserveProjectId?: string;
    }) => {
        try {
            const detected = await invoke<DetectedVertexServiceAccountInfo | null>("native_detect_vertex_service_account");
            if (!detected) return null;

            const nextPath = options?.preservePath?.trim() || detected.path || "";
            const nextProjectId = options?.preserveProjectId?.trim() || detected.project_id || DEFAULT_VERTEX_PROJECT_ID;
            const nextLocation = getVertexLocationForModel(options?.preferModel || model || DEFAULT_MODEL);

            if (nextPath) setVertexServiceAccountPath(nextPath);
            if (nextProjectId) setVertexProjectId(nextProjectId);
            setVertexLocation((prev) => prev || nextLocation);

            if (!options?.silent && (detected.path || detected.project_id)) {
                toast.success("Đã tự nhận diện Service Account JSON trong repo.", {
                    description: nextProjectId
                        ? `Project ID: ${nextProjectId}`
                        : "Đã nạp sẵn đường dẫn file JSON. Nếu cần, Sếp vẫn có thể sửa tay."
                });
            }

            return detected;
        } catch (error) {
            console.error("Auto-detect Vertex Service Account failed:", error);
            return null;
        }
    };

    // Guarded Load Settings
    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            const [providerSetting, vertexAuthModeSetting, geminiKeySetting, legacyGeminiKeySetting, vertex, vertexServiceAccountPathSetting, vertexProjectIdSetting, vertexLocationSetting, k2, m] = await Promise.all([
                db.settings.get("aiProvider"),
                db.settings.get("vertexAuthMode"),
                db.settings.get("geminiApiKey"),
                db.settings.get("apiKeyPrimary"),
                db.settings.get("vertexApiKey"),
                db.settings.get("vertexServiceAccountPath"),
                db.settings.get("vertexProjectId"),
                db.settings.get("vertexLocation"),
                db.settings.get("apiKeyPool"),
                db.settings.get("aiModel")
            ]);

            if (isMounted) {
                const resolvedProvider = normalizeAIProvider(providerSetting?.value);
                const resolvedVertexAuthMode = normalizeVertexAuthMode(vertexAuthModeSetting?.value);
                setProvider(resolvedProvider);
                setVertexAuthMode(resolvedVertexAuthMode);
                const resolvedGeminiKey = (geminiKeySetting?.value as string) || (legacyGeminiKeySetting?.value as string) || "";
                if (resolvedGeminiKey) {
                    setPrimaryKey(resolvedGeminiKey);
                    if (!geminiKeySetting && legacyGeminiKeySetting) {
                        await db.settings.put({ key: "geminiApiKey", value: resolvedGeminiKey });
                    }
                }
                if (vertex) setVertexKey(vertex.value as string);
                if (vertexServiceAccountPathSetting?.value) setVertexServiceAccountPath(vertexServiceAccountPathSetting.value as string);
                if (vertexProjectIdSetting?.value) {
                    setVertexProjectId(vertexProjectIdSetting.value as string);
                } else {
                    setVertexProjectId(DEFAULT_VERTEX_PROJECT_ID);
                }
                if (k2) setPoolKeys(k2.value as string);
                const resolvedModel = sanitizeModelForProvider(
                    resolvedProvider,
                    migrateModelId((m?.value as string) || DEFAULT_MODEL),
                    resolvedVertexAuthMode
                );
                setModel(resolvedModel);
                setVertexLocation((vertexLocationSetting?.value as string) || getVertexLocationForModel(resolvedModel));
                setAvailableModels(filterModelsForProvider(resolvedProvider, AI_MODELS, resolvedVertexAuthMode));

                if (
                    resolvedProvider === "vertex" &&
                    resolvedVertexAuthMode === "serviceAccount" &&
                    (!vertexServiceAccountPathSetting?.value || !vertexProjectIdSetting?.value)
                ) {
                    await autoDetectVertexServiceAccount({
                        silent: true,
                        preferModel: resolvedModel,
                        preservePath: (vertexServiceAccountPathSetting?.value as string) || "",
                        preserveProjectId: (vertexProjectIdSetting?.value as string) || "",
                    });
                }
            }
        };

        load();
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        setAvailableModels((prev) => filterModelsForProvider(provider, prev.length > 0 ? prev : AI_MODELS, vertexAuthMode));

        if (provider === "vertex") {
            const sanitizedModel = sanitizeModelForProvider(provider, model, vertexAuthMode);
            if (sanitizedModel !== model) {
                setModel(sanitizedModel);
                toast.info("Vertex API key hiện chưa dùng được Gemini 3 Preview trong app này, đã tự chuyển về gemini-2.5-flash.");
            }
            setVertexLocation((prev) => prev || getVertexLocationForModel(sanitizedModel));
        }
    }, [provider, model, vertexAuthMode]);

    useEffect(() => {
        if (provider !== "vertex" || vertexAuthMode !== "serviceAccount") {
            return;
        }

        if (vertexServiceAccountPath.trim() && vertexProjectId.trim()) {
            return;
        }

        void autoDetectVertexServiceAccount({
            silent: false,
            preferModel: model,
            preservePath: vertexServiceAccountPath,
            preserveProjectId: vertexProjectId,
        });
    }, [provider, vertexAuthMode]);

    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            await Promise.all([
                db.settings.put({ key: "aiProvider", value: provider }),
                db.settings.put({ key: "vertexAuthMode", value: vertexAuthMode }),
                db.settings.put({ key: "geminiApiKey", value: primaryKey }),
                db.settings.put({ key: "vertexApiKey", value: vertexKey }),
                db.settings.put({ key: "vertexServiceAccountPath", value: vertexServiceAccountPath }),
                db.settings.put({ key: "vertexProjectId", value: vertexProjectId }),
                db.settings.put({ key: "vertexLocation", value: vertexLocation || getVertexLocationForModel(model) }),
                db.settings.put({ key: "apiKeyPool", value: poolKeys }),
                db.settings.put({ key: "aiModel", value: sanitizeModelForProvider(provider, model, vertexAuthMode) })
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
        } catch (err) {
            console.error("Backend Key Error:", err);
            const errorMessage = err instanceof Error ? err.message : String(err);
            toast.error(errorMessage);
        } finally {
            setIsBackendKeyLoading(false);
        }
    };

    const handleFetchModels = async () => {
        const activeCredential = provider === "vertex"
            ? (vertexAuthMode === "serviceAccount" ? vertexServiceAccountPath : vertexKey)
            : primaryKey;
        const activeVertexLocation = vertexLocation || getVertexLocationForModel(model);
        if (!activeCredential) return;
        setIsLoadingModels(true);
        try {
            const models = provider === "vertex"
                ? await fetchVertexModels({
                    authMode: vertexAuthMode,
                    apiKey: vertexKey,
                    serviceAccountPath: vertexServiceAccountPath,
                    projectId: vertexProjectId,
                    location: activeVertexLocation,
                })
                : await fetchGeminiModels(activeCredential);
            const filteredModels = filterModelsForProvider(provider, models, vertexAuthMode);
            setAvailableModels(filteredModels);
            toast.success(
                provider === "vertex"
                    ? `Đã cập nhật ${filteredModels.length} model từ Vertex AI`
                    : `Đã cập nhật ${filteredModels.length} model từ Gemini API`
            );
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "Lỗi khi lấy danh sách Model.";
            toast.error(errorMessage);
        } finally {
            setIsLoadingModels(false);
        }
    };

    const handleCheckAllKeys = async () => {
        setCheckingKeys(true);
        const keysToCheck: string[] = provider === "vertex"
            ? (vertexAuthMode === "serviceAccount"
                ? (vertexServiceAccountPath ? [vertexServiceAccountPath] : [])
                : (vertexKey ? [vertexKey] : []))
            : [
                ...(primaryKey ? [primaryKey] : []),
                ...poolKeys.split(/[\n,;]+/).map(k => k.trim()).filter(k => k.length > 10)
            ];

        const uniqueKeys = Array.from(new Set(keysToCheck));
        setKeyStatuses(uniqueKeys.map(k => ({ key: k, status: 'checking' })));

        const results = await Promise.all(uniqueKeys.map(key => checkProviderKey(provider, {
            key,
            model,
            vertexAuthMode,
            vertexProjectId,
            vertexLocation: vertexLocation || getVertexLocationForModel(model),
            vertexServiceAccountPath,
        })));
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
            provider, primaryKey, vertexKey, vertexAuthMode, vertexServiceAccountPath, vertexProjectId, vertexLocation, poolKeys, model, availableModels,
            isLoadingModels, isSaving, checkingKeys, keyStatuses,
            isBackendKeyLoading, isFixingWordCount
        },
        actions: {
            setProvider, setPrimaryKey, setVertexKey, setVertexAuthMode, setVertexServiceAccountPath, setVertexProjectId, setVertexLocation, setPoolKeys, setModel,
            handleSaveAll, handleLoadFromBackend, handleFetchModels,
            handleCheckAllKeys, handleFixWordCounts
        }
    };
}

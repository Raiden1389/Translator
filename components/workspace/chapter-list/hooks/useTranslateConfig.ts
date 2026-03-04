import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "@/lib/db";
import { DEFAULT_MODEL, migrateModelId } from "@/lib/ai-models";
import { toast } from "sonner";

// =============================================================================
// TYPES
// =============================================================================

export interface TranslationConfig {
  customPrompt: string;
  autoExtract: boolean;
  maxConcurrency: number;
  fixPunctuation: boolean;
  enableChunking: boolean;
  enableTurbo: boolean;
  maxConcurrentChunks: number;
  chunkSize: number;
  temperature: number;
  enableThinking?: boolean;
  thinkingLevel: "minimal" | "low" | "medium" | "high";
  enableBatch: boolean;
  batchSize: number;
  maxCharsPerBatch: number;
}

export interface TranslationSettingsManual {
  apiKey: string;
  model: string;
}

export const DEFAULT_TRANSLATION_CONFIG: TranslationConfig = {
  customPrompt: "",
  autoExtract: false,
  maxConcurrency: 5,
  fixPunctuation: false,
  enableChunking: true,
  enableTurbo: false,
  maxConcurrentChunks: 5,
  chunkSize: 800,
  temperature: 0.1,
  thinkingLevel: "minimal",
  enableBatch: false,
  batchSize: 3,
  maxCharsPerBatch: 25000,
};

// =============================================================================
// HOOK
// =============================================================================

export function useTranslateConfig(open: boolean) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentSettings, setCurrentSettings] = useState<TranslationSettingsManual>({ apiKey: "", model: DEFAULT_MODEL });
  const [translateConfig, setTranslateConfig] = useState<TranslationConfig>({
    ...DEFAULT_TRANSLATION_CONFIG,
    enableChunking: false,
    enableTurbo: true,
  });
  const [savedPrompts, setSavedPrompts] = useState<{ id?: number; title: string; content: string }[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // Load settings from DB when dialog opens
  useEffect(() => {
    if (!open) return;

    const load = async () => {
      const key = await db.settings.get("apiKeyPrimary");
      const model = await db.settings.get("aiModel");
      const lastPrompt = await db.settings.get("lastCustomPrompt");
      const lastConcurrency = await db.settings.get("lastMaxConcurrency");
      const lastFixPunctuation = await db.settings.get("lastFixPunctuation");
      const lastEnableChunking = await db.settings.get("enableChunking");
      const lastEnableTurbo = await db.settings.get("enableTurbo");
      const lastMaxConcurrentChunks = await db.settings.get("maxConcurrentChunks");
      const lastChunkSize = await db.settings.get("chunkSize");
      const lastTemperature = await db.settings.get("temperature");
      const lastEnableBatch = await db.settings.get("enableBatch");
      const lastBatchSize = await db.settings.get("batchSize");
      const lastMaxCharsPerBatch = await db.settings.get("maxCharsPerBatch");
      const prompts = await db.prompts.toArray();

      setCurrentSettings({
        apiKey: (key?.value as string) || "",
        model: migrateModelId((model?.value as string) || DEFAULT_MODEL)
      });

      setTranslateConfig(prev => ({
        ...prev,
        customPrompt: (lastPrompt?.value as string) || "",
        maxConcurrency: (lastConcurrency?.value as number) || 5,
        fixPunctuation: (lastFixPunctuation?.value as boolean) || false,
        enableChunking: (lastEnableChunking?.value as boolean) || false,
        enableTurbo: lastEnableTurbo ? (lastEnableTurbo.value as boolean) : true,
        maxConcurrentChunks: (lastMaxConcurrentChunks?.value as number) || 3,
        chunkSize: (lastChunkSize?.value as number) || 800,
        temperature: (lastTemperature?.value as number) ?? 0.1,
        enableBatch: (lastEnableBatch?.value as boolean) || false,
        batchSize: (lastBatchSize?.value as number) || 3,
        maxCharsPerBatch: (lastMaxCharsPerBatch?.value as number) || 25000,
      }));
      setSavedPrompts(prompts);
    };

    load();
  }, [open]);

  const updateConfig = useCallback((field: keyof TranslationConfig, value: TranslationConfig[keyof TranslationConfig]) => {
    setTranslateConfig(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateMultiple = useCallback((updates: Partial<TranslationConfig>) => {
    setTranslateConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const saveSettings = useCallback(async () => {
    try {
      await db.settings.put({ key: "apiKeyPrimary", value: currentSettings.apiKey });
      await db.settings.put({ key: "aiModel", value: currentSettings.model });

      if (isMounted.current) {
        toast.success("Đã lưu cấu hình AI!");
        setSettingsOpen(false);
      }
    } catch (error) {
      console.error("[SAVE SETTINGS ERROR]", error);
      if (isMounted.current) {
        toast.error("Lỗi khi lưu cấu hình!");
      }
    }
  }, [currentSettings]);

  const handleSavePrompt = useCallback(async () => {
    if (!translateConfig.customPrompt) return;
    const title = prompt("Tên mẫu prompt này?");
    if (title) {
      await db.prompts.add({ title, content: translateConfig.customPrompt, createdAt: new Date() });
      if (isMounted.current) {
        setSavedPrompts(await db.prompts.toArray());
        toast.success("Đã lưu prompt thành công!");
      }
    }
  }, [translateConfig.customPrompt]);

  const persistAndStart = useCallback(async (onStart: (config: TranslationConfig, settings: TranslationSettingsManual) => void) => {
    await db.settings.put({ key: "lastCustomPrompt", value: translateConfig.customPrompt });
    await db.settings.put({ key: "lastMaxConcurrency", value: translateConfig.maxConcurrency });
    await db.settings.put({ key: "lastFixPunctuation", value: translateConfig.fixPunctuation });
    await db.settings.put({ key: "enableChunking", value: translateConfig.enableChunking });
    await db.settings.put({ key: "enableTurbo", value: translateConfig.enableTurbo });
    await db.settings.put({ key: "maxConcurrentChunks", value: translateConfig.maxConcurrentChunks || 3 });
    await db.settings.put({ key: "chunkSize", value: translateConfig.chunkSize || 800 });
    await db.settings.put({ key: "temperature", value: translateConfig.temperature ?? 0.1 });
    await db.settings.put({ key: "enableBatch", value: translateConfig.enableBatch });
    await db.settings.put({ key: "batchSize", value: translateConfig.batchSize });
    await db.settings.put({ key: "maxCharsPerBatch", value: translateConfig.maxCharsPerBatch });
    onStart(translateConfig, currentSettings);
  }, [translateConfig, currentSettings]);

  return {
    // State
    settingsOpen, setSettingsOpen,
    currentSettings, setCurrentSettings,
    translateConfig,
    savedPrompts,
    dropdownOpen, setDropdownOpen,
    promptExpanded, setPromptExpanded,

    // Actions
    updateConfig,
    updateMultiple,
    saveSettings,
    handleSavePrompt,
    persistAndStart,
  };
}

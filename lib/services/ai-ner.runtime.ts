import { db } from '../db';
import { DEFAULT_MODEL, migrateModelId } from '../ai-models';
import { normalizeAIProvider, normalizeVertexAuthMode, sanitizeModelForProvider } from '../ai-provider';
import { NERRuntimeConfig } from './ai-ner.types';

export async function resolveNERModel(onProgress?: (message: string) => void): Promise<string> {
    const [providerSetting, vertexAuthModeSetting, modelSetting] = await Promise.all([
        db.settings.get("aiProvider"),
        db.settings.get("vertexAuthMode"),
        db.settings.get("aiModel"),
    ]);

    const provider = normalizeAIProvider(providerSetting?.value);
    const vertexAuthMode = normalizeVertexAuthMode(vertexAuthModeSetting?.value);
    const configuredModel = sanitizeModelForProvider(
        provider,
        migrateModelId((modelSetting?.value as string) || DEFAULT_MODEL),
        vertexAuthMode
    );

    if (provider === "vertex" && vertexAuthMode === "apiKey" && configuredModel.includes("flash-lite")) {
        onProgress?.(`ℹ️ Vertex AI tại Singapore không hợp với ${configuredModel}, AI quét thuật ngữ tạm dùng gemini-2.5-flash.`);
        return "gemini-2.5-flash";
    }

    if (provider === "vertex" && configuredModel.startsWith("gemini-3")) {
        onProgress?.(`ℹ️ ${configuredModel} chưa hỗ trợ Structured JSON trên Vertex AI, AI quét thuật ngữ tạm dùng gemini-2.5-flash.`);
        return "gemini-2.5-flash";
    }

    return configuredModel;
}

export async function resolveNERRuntimeConfig(onProgress?: (message: string) => void): Promise<NERRuntimeConfig> {
    const providerSetting = await db.settings.get("aiProvider");
    const provider = normalizeAIProvider(providerSetting?.value);
    const model = await resolveNERModel(onProgress);
    return { provider, model };
}

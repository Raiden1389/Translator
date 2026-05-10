export type AIProvider = "gemini" | "vertex";

export const DEFAULT_AI_PROVIDER: AIProvider = "gemini";
export const DEFAULT_VERTEX_LOCATION = "asia-southeast1";

export function normalizeAIProvider(value: unknown): AIProvider {
    return value === "vertex" ? "vertex" : DEFAULT_AI_PROVIDER;
}

export function getAIProviderLabel(provider: AIProvider): string {
    return provider === "vertex" ? "Vertex AI" : "Gemini API";
}

export function getAIProviderStatusLabel(provider: AIProvider): string {
    return provider === "vertex" ? "VERTEX AI" : "GEMINI API";
}

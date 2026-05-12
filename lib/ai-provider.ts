export type AIProvider = "gemini" | "vertex";
export type VertexAuthMode = "apiKey" | "serviceAccount";

export const DEFAULT_AI_PROVIDER: AIProvider = "gemini";
export const DEFAULT_VERTEX_AUTH_MODE: VertexAuthMode = "apiKey";
export const DEFAULT_VERTEX_LOCATION = "asia-southeast1";
export const GLOBAL_VERTEX_LOCATION = "global";
export const DEFAULT_VERTEX_EXPRESS_MODEL = "gemini-2.5-flash";
export const DEFAULT_VERTEX_PROJECT_ID = "gen-lang-client-0688183488";
export const VERTEX_LOCATION_OPTIONS = [
    { value: GLOBAL_VERTEX_LOCATION, label: "Global" },
    { value: "asia-southeast1", label: "Asia (Singapore)" },
    { value: "us-central1", label: "US Central" },
    { value: "europe-west4", label: "Europe West" },
] as const;

export function normalizeAIProvider(value: unknown): AIProvider {
    return value === "vertex" ? "vertex" : DEFAULT_AI_PROVIDER;
}

export function normalizeVertexAuthMode(value: unknown): VertexAuthMode {
    return value === "serviceAccount" ? "serviceAccount" : DEFAULT_VERTEX_AUTH_MODE;
}

export function getAIProviderLabel(provider: AIProvider): string {
    return provider === "vertex" ? "Vertex AI" : "Gemini API";
}

export function getAIProviderStatusLabel(provider: AIProvider): string {
    return provider === "vertex" ? "VERTEX AI" : "GEMINI API";
}

export function getVertexAuthModeLabel(mode: VertexAuthMode): string {
    return mode === "serviceAccount" ? "Service Account" : "API Key (Express Mode)";
}

export function getVertexLocationForModel(model: string): string {
    const normalized = model.trim().toLowerCase();

    if (normalized.startsWith("gemini-3")) {
        return GLOBAL_VERTEX_LOCATION;
    }

    return DEFAULT_VERTEX_LOCATION;
}

export function getVertexLocationLabel(location: string): string {
    return VERTEX_LOCATION_OPTIONS.find((option) => option.value === location)?.label || location;
}

export function isVertexExpressUnsupportedModel(model: string): boolean {
    return model.trim().toLowerCase().startsWith("gemini-3");
}

export function sanitizeModelForProvider(
    provider: AIProvider,
    model: string,
    vertexAuthMode: VertexAuthMode = DEFAULT_VERTEX_AUTH_MODE
): string {
    if (provider === "vertex" && vertexAuthMode === "apiKey" && isVertexExpressUnsupportedModel(model)) {
        return DEFAULT_VERTEX_EXPRESS_MODEL;
    }

    return model;
}

export function filterModelsForProvider<T extends { value: string }>(
    provider: AIProvider,
    models: T[],
    vertexAuthMode: VertexAuthMode = DEFAULT_VERTEX_AUTH_MODE
): T[] {
    if (provider !== "vertex" || vertexAuthMode !== "apiKey") {
        return models;
    }

    return models.filter((model) => !isVertexExpressUnsupportedModel(model.value));
}

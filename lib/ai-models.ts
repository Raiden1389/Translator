export const AI_MODELS = [
    { value: "gemini-3-flash-preview", label: "Gemini 3.0 Flash (Paid Tier)", inputPrice: 0.15, outputPrice: 0.6 },
    { value: "gemini-3-pro-preview", label: "Gemini 3.0 Pro (Paid Tier)", inputPrice: 1.25, outputPrice: 5.0 },
    { value: "gemini-2.5-flash-preview-09-2025", label: "Gemini 2.5 Flash (Paid Tier)", inputPrice: 0.075, outputPrice: 0.3 },
    { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash Exp (Free)", inputPrice: 0, outputPrice: 0 },
    { value: "gemini-1.5-pro-002", label: "Gemini 1.5 Pro 002", inputPrice: 1.25, outputPrice: 5.0 },
    { value: "gemini-1.5-flash-002", label: "Gemini 1.5 Flash 002", inputPrice: 0.075, outputPrice: 0.3 },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash", inputPrice: 0.075, outputPrice: 0.3 },
    { value: "gemini-1.5-flash-8b", label: "Gemini 1.5 Flash 8B", inputPrice: 0.0375, outputPrice: 0.15 },
];

export const DEFAULT_MODEL = "gemini-3-flash-preview";

export const migrateModelId = (oldId: string): string => {
    if (oldId === "gemini-3-flash" || oldId === "gemini-3.0-flash") return "gemini-3-flash-preview";
    if (oldId === "gemini-2.5-flash") return "gemini-2.5-flash-preview-09-2025";
    return oldId;
};

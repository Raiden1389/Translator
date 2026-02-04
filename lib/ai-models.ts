export const AI_MODELS = [
    { value: "gemini-3-flash-preview", label: "Gemini 3.0 Flash (Paid Tier)", inputPrice: 0.15, outputPrice: 0.6 },
    { value: "gemini-3-pro-preview", label: "Gemini 3.0 Pro (Paid Tier)", inputPrice: 1.25, outputPrice: 5.0 },
    { value: "gemini-2.5-flash-preview-09-2025", label: "Gemini 2.5 Flash (Sếp đang dùng)", inputPrice: 0.075, outputPrice: 0.3 },
];

export const DEFAULT_MODEL = "gemini-2.5-flash-preview-09-2025";

export const migrateModelId = (oldId: string): string => {
    if (oldId.includes("gemini-3")) return "gemini-3-flash-preview";
    if (oldId.includes("gemini-1.5") || oldId.includes("gemini-2.0")) return "gemini-2.5-flash-preview-09-2025";
    return oldId;
};


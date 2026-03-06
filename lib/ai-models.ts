export const AI_MODELS = [
    { value: "gemini-3-flash-preview", label: "Gemini 3.0 Flash (Paid Tier)", inputPrice: 0.50, outputPrice: 3.00 },
    { value: "gemini-3-pro-preview", label: "Gemini 3.0 Pro (Paid Tier)", inputPrice: 1.25, outputPrice: 5.0 },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (GA)", inputPrice: 0.10, outputPrice: 0.40 },  // Non-thinking pricing (thinkingBudget: 0)
    { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", inputPrice: 0.10, outputPrice: 0.40 },
    { value: "antigravity-bridge", label: "Antigravity Bridge (Free - Agent Powered)", inputPrice: 0, outputPrice: 0 },
];

export const DEFAULT_MODEL = "gemini-2.5-flash";

export const migrateModelId = (oldId: string): string => {
    // Migrate old preview IDs to GA
    if (oldId === "antigravity-bridge") return oldId;
    if (oldId.includes("gemini-2.5-flash-preview")) return "gemini-2.5-flash";
    if (oldId.includes("gemini-3")) return "gemini-3-flash-preview";
    if (oldId.includes("gemini-1.5") || oldId.includes("gemini-2.0")) return "gemini-2.5-flash";
    return oldId;
};

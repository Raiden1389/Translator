import { GoogleGenAI } from "@google/genai"

export const HEALTHCHECK_MODEL = "gemini-2.0-flash"

/**
 * Standardized parser for the key pool string
 */
export const parseKeyPool = (raw: string): string[] => {
    return raw
        .split(/[\n,;]+/)
        .map(k => k.trim())
        .filter(k => k.length > 10)
}

/**
 * Validates a Gemini API Key using a stable model
 */
export async function checkKeyHealth(key: string): Promise<{ ms: number }> {
    const start = Date.now()
    const ai = new GoogleGenAI({ apiKey: key })

    // Use a fixed target model for healthchecks to avoid issues with user selection
    await ai.models.generateContent({
        model: HEALTHCHECK_MODEL,
        contents: "hi" // Minimal prompt
    })

    return { ms: Date.now() - start }
}

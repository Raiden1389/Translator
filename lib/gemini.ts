import { db } from "./db";

export interface TranslationLog {
    timestamp: Date;
    message: string;
    type: 'info' | 'error' | 'success';
}

export interface GeminiRef {
    log: (message: string, type?: 'info' | 'error' | 'success') => void;
}

export const translateChapter = async (
    text: string,
    onLog: (log: TranslationLog) => void,
    onSuccess: (translatedText: string) => void,
    customInstruction?: string // <-- Added parameter
) => {
    // 1. Get Settings
    const primaryKey = await db.settings.get("apiKeyPrimary");
    const model = await db.settings.get("aiModel");
    const dict = await db.dictionary.toArray();

    if (!primaryKey?.value) {
        onLog({ timestamp: new Date(), message: "Missing API Key. Please configure in Settings.", type: 'error' });
        return;
    }

    const aiModel = model?.value || "gemini-1.5-flash";
    const apiKey = primaryKey.value;

    onLog({ timestamp: new Date(), message: `Using Model: ${aiModel}`, type: 'info' });

    // 2. Prepare Dictionary Context
    // We fetch all terms. For large dictionaries, we might need a more sophisticated keyword extraction.
    // Current strategy: exact match check.
    const relevantDict = dict.filter(d => text.includes(d.original));

    // Sort by length desc to ensure sub-phrases don't override longer phrases if we were doing replace, 
    // but for AI context, list order matters less, though prioritizing complex terms helps.
    relevantDict.sort((a, b) => b.original.length - a.original.length);

    const glossary = relevantDict.map(d => `${d.original}=${d.translated}`).join("\n");

    onLog({ timestamp: new Date(), message: `Context: Found ${relevantDict.length} terms in Dictionary.`, type: 'info' });

    // 3. Construct Prompts
    const systemPrompt = `You are a professional novel translator (Chinese to Vietnamese).
Task: Translate the following text into Vietnamese.

Guidelines:
- Style: Fluent, modern, engaging, suitable for web novels (Tiên Hiệp/Ngôn Tình).
- Pronouns: Maintain consistent character genders and pronouns based on context.
- Terminology: STRICTLY follow the provided Glossary. If a term is in the glossary, you MUST use the provided translation.

${customInstruction ? `### Custom Instruction from User:\n${customInstruction}\n` : ''}

${glossary ? `### Glossary (Vietphrase Data):\n${glossary}\n` : ''}

Output only the translated text. Do not include notes, comments, or original text.`;

    const userPrompt = text;

    // 4. Call API
    onLog({ timestamp: new Date(), message: "Sending request to Gemini...", type: 'info' });

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                contents: [{
                    parts: [{ text: userPrompt }]
                }],
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "Unknown API Error");
        }

        const data = await response.json();

        const candidate = data.candidates?.[0];
        const resultText = candidate?.content?.parts?.[0]?.text;

        if (resultText) {
            onLog({ timestamp: new Date(), message: "Translation completed successfully.", type: 'success' });
            // Calculate output tokens (rough estimate or use usageMetadata if available)
            const usage = data.usageMetadata;
            if (usage) {
                onLog({ timestamp: new Date(), message: `Token Usage: ${usage.totalTokenCount} (Prompt: ${usage.promptTokenCount}, Candidates: ${usage.candidatesTokenCount})`, type: 'info' });
            }

            // --- Post-Processing: Apply Correction Rules (Viet -> Viet) ---
            let finalOutput = resultText;
            const correctionRules = dict.filter(d => d.type === 'correction');
            if (correctionRules.length > 0) {
                // Sort by length desc to prevent partial replacements of longer phrases
                correctionRules.sort((a, b) => b.original.length - a.original.length);

                let appliedCount = 0;
                for (const rule of correctionRules) {
                    if (finalOutput.includes(rule.original)) {
                        // Use global replace
                        const escapedOld = rule.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(escapedOld, 'g');
                        finalOutput = finalOutput.replace(regex, rule.translated);
                        appliedCount++;
                    }
                }
                if (appliedCount > 0) {
                    onLog({ timestamp: new Date(), message: `Applied ${appliedCount} auto-correction rules.`, type: 'info' });
                }
            }

            onSuccess(finalOutput);
        } else if (candidate?.finishReason) {
            let msg = `AI Stopped. Reason: ${candidate.finishReason}`;
            if (candidate.finishReason === 'SAFETY') {
                msg += " (Content blocked by safety filters)";
            }
            if (candidate.finishReason === 'RECITATION') {
                msg += " (Content flagged as recitation/copyright)";
            }
            throw new Error(msg);
        } else {
            console.error("Gemini Raw Response:", data);
            const rawData = JSON.stringify(data, null, 2);

            if (data.promptFeedback?.blockReason === "PROHIBITED_CONTENT") {
                throw new Error("Content Blocked (SafeFilters). Recommendation: Go to Settings -> AI -> Select 'gemini-1.5-pro' or 'gemini-1.5-flash'. Newer models like 2.5 often have stricter filters.");
            }

            throw new Error(`Empty response from AI. Raw Data: ${rawData}`);
        }

    } catch (e: any) {
        onLog({ timestamp: new Date(), message: `Translation Failed: ${e.message}`, type: 'error' });
    }
};

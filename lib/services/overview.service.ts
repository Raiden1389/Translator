import { db, Workspace } from "@/lib/db";
import { generateBookSummary } from "@/lib/gemini";

/**
 * Xử lý resize và nén ảnh bìa
 */
export async function processCoverImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // JPEG 80% quality
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

import { AI_MODELS } from "@/lib/ai-models";
import { format, subDays, eachDayOfInterval } from "date-fns";

/**
 * Thống kê tổng hợp dữ liệu Workspace
 */
export async function getWorkspaceStats(workspaceId: string) {
    const chapters = await db.chapters.where("workspaceId").equals(workspaceId).toArray();
    const [total, translated, terms, chars] = await Promise.all([
        db.chapters.where("workspaceId").equals(workspaceId).count(),
        db.chapters.where("workspaceId").equals(workspaceId).filter(c => c.status === 'translated').count(),
        db.dictionary.where("workspaceId").equals(workspaceId).filter(d => d.type !== 'name').count(),
        db.dictionary.where("workspaceId").equals(workspaceId).filter(d => d.type === 'name').count(),
    ]);

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalThinkingTokens = 0;
    let totalCostUSD = 0;

    chapters.forEach(c => {
        if (c.stats?.tokens) {
            totalInputTokens += c.stats.tokens.input || 0;
            totalOutputTokens += c.stats.tokens.output || 0;
            totalThinkingTokens += c.stats.tokens.thinking || 0;

            // Calculate cost based on the model used for this chapter
            const modelId = c.translationModel || "gemini-2.5-flash";
            const modelInfo = AI_MODELS.find(m => m.value === modelId) || AI_MODELS[0];

            const costInput = ((c.stats.tokens.input || 0) / 1_000_000) * (modelInfo.inputPrice || 0);
            // Thinking tokens are billed as output tokens
            const costOutput = (((c.stats.tokens.output || 0) + (c.stats.tokens.thinking || 0)) / 1_000_000) * (modelInfo.outputPrice || 0);
            totalCostUSD += (costInput + costOutput);
        }
    });

    return {
        totalChapters: total,
        translatedChapters: translated,
        termCount: terms,
        charCount: chars,
        totalInputTokens,
        totalOutputTokens,
        totalThinkingTokens,
        totalCostUSD,
        totalCostVND: totalCostUSD * 25400
    };
}

/**
 * Lịch sử sử dụng Token theo ngày (7 ngày gần nhất)
 */
export async function getUsageHistory(workspaceId: string) {
    const chapters = await db.chapters
        .where("workspaceId")
        .equals(workspaceId)
        .filter(c => !!c.lastTranslatedAt && !!c.stats?.tokens)
        .toArray();

    const last7Days = eachDayOfInterval({
        start: subDays(new Date(), 6),
        end: new Date()
    });

    const historyMap = new Map<string, { tokens: number; cost: number }>();
    last7Days.forEach(date => {
        historyMap.set(format(date, 'yyyy-MM-dd'), { tokens: 0, cost: 0 });
    });

    chapters.forEach(c => {
        if (c.lastTranslatedAt && c.stats?.tokens) {
            const dateStr = format(c.lastTranslatedAt, 'yyyy-MM-dd');
            if (historyMap.has(dateStr)) {
                const current = historyMap.get(dateStr)!;
                // Include thinking tokens in total
                const totalTokens = (c.stats.tokens.input || 0) + (c.stats.tokens.output || 0) + (c.stats.tokens.thinking || 0);

                const modelId = c.translationModel || "gemini-2.5-flash";
                const modelInfo = AI_MODELS.find(m => m.value === modelId) || AI_MODELS[0];
                // Thinking tokens are billed as output tokens
                const cost = ((c.stats.tokens.input || 0) / 1_000_000) * (modelInfo.inputPrice || 0) +
                    (((c.stats.tokens.output || 0) + (c.stats.tokens.thinking || 0)) / 1_000_000) * (modelInfo.outputPrice || 0);

                historyMap.set(dateStr, {
                    tokens: current.tokens + totalTokens,
                    cost: current.cost + cost
                });
            }
        }
    });

    return Array.from(historyMap.entries()).map(([date, data]) => ({
        date,
        ...data
    }));
}


/**
 * Tạo tóm tắt truyện bằng AI
 */
export async function generateAiSummary(workspace: Workspace): Promise<string> {
    // 1. Fetch First 5 chapters
    const firstChapters = await db.chapters
        .where("workspaceId")
        .equals(workspace.id)
        .limit(5)
        .toArray();

    // 2. Fetch Latest Translated Chapter
    const latestChapter = await db.chapters
        .where("workspaceId")
        .equals(workspace.id)
        .filter(c => c.status === 'translated')
        .reverse()
        .limit(1)
        .toArray();

    const contextText = [...firstChapters, ...latestChapter]
        .map(c => `Chapter: ${c.title}\n${c.content_original.slice(0, 1000)}...`)
        .join("\n\n---\n\n");

    if (!contextText.trim()) {
        throw new Error("Cần ít nhất một chương để tóm tắt.");
    }

    const modelSetting = await db.settings.get("aiModel");
    const aiModel = (modelSetting?.value as string) || "gemini-2.5-flash";

    return await generateBookSummary(contextText, aiModel);
}

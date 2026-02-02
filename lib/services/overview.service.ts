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

    chapters.forEach(c => {
        if (c.stats?.tokens) {
            totalInputTokens += c.stats.tokens.input || 0;
            totalOutputTokens += c.stats.tokens.output || 0;
        }
    });

    // Cost estimation for Gemini 2.0 Flash (approximate)
    // Input: $0.1 / 1M tokens, Output: $0.4 / 1M tokens (as of Feb 2025)
    const costInput = (totalInputTokens / 1_000_000) * 0.1;
    const costOutput = (totalOutputTokens / 1_000_000) * 0.4;
    const totalCostUSD = costInput + costOutput;

    return {
        totalChapters: total,
        translatedChapters: translated,
        termCount: terms,
        charCount: chars,
        totalInputTokens,
        totalOutputTokens,
        totalCostUSD,
        totalCostVND: totalCostUSD * 25400
    };
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
    const aiModel = (modelSetting?.value as string) || "gemini-2.5-flash-preview-09-2025";

    return await generateBookSummary(contextText, aiModel);
}

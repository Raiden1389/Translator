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
    const [total, translated, terms, chars, usage] = await Promise.all([
        db.chapters.where("workspaceId").equals(workspaceId).count(),
        db.chapters.where("workspaceId").equals(workspaceId).filter(c => c.status === 'translated').count(),
        db.dictionary.where("workspaceId").equals(workspaceId).filter(d => d.type !== 'name').count(),
        db.dictionary.where("workspaceId").equals(workspaceId).filter(d => d.type === 'name').count(),
        db.apiUsage.toArray() // Ideally filter by workspace if possible, but schema seems global for usage? 
        // Based on existing code, it shows global usage.
    ]);

    const totalInputTokens = usage.reduce((acc, curr) => acc + (curr.inputTokens || 0), 0);
    const totalOutputTokens = usage.reduce((acc, curr) => acc + (curr.outputTokens || 0), 0);
    const totalCostUSD = usage.reduce((acc, curr) => acc + (curr.totalCost || 0), 0);

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
    const aiModel = (modelSetting?.value as string) || "gemini-2.0-flash-exp";

    return await generateBookSummary(contextText, aiModel);
}

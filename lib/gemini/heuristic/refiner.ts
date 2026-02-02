import { db } from '../../db';
import { withKeyRotation } from '../client';
import { DEFAULT_MODEL } from '../../ai-models';
import { SyllableRepository } from '../../repositories/syllable-repo';

/**
 * AI HEURISTIC TERMS REFINER v3.1 (The Hybrid Engine)
 * Purpose: Use AI only for classification and filtering. Use LOCAL dictionary for 100% Han-Viet translation.
 */
export async function refineHeuristicTerms(workspaceId: string, onLog?: (msg: string) => void) {
    const modelSetting = await db.settings.get("aiModel");
    const aiModel = (modelSetting?.value as string) || DEFAULT_MODEL;

    const totalTerms = await db.heuristicTerms
        .where('workspaceId')
        .equals(workspaceId)
        .and(t => !t.isApproved && !t.isGarbage)
        .toArray();

    if (totalTerms.length === 0) {
        if (onLog) onLog("✨ Không có thuật ngữ mới cần AI thẩm định.");
        return;
    }

    // Prepare Local Dictionary (v2.9)
    if (onLog) onLog("🔋 Đang nạp bộ từ điển Hán-Việt... (Dùng 100% nội bộ)");
    const repo = SyllableRepository.getInstance();
    await repo.load("/dicts/ChinesePhienAmWords.txt");

    const CHUNK_SIZE = 100;
    const totalChunks = Math.ceil(totalTerms.length / CHUNK_SIZE);

    if (onLog) onLog(`📡 Đã tìm thấy ${totalTerms.length} từ. Chia làm ${totalChunks} đợt phân loại...`);

    // --- LEARN FROM BLACKLIST (v3.0) ---
    const blacklist = await db.blacklist
        .where('[workspaceId+source]')
        .equals([workspaceId, 'heuristic'])
        .toArray();
    const blacklistExamples = blacklist.slice(-20).map(b => b.word).join(', ');
    const learnSection = blacklistExamples
        ? `\nVí dụ rác NHẬN DIỆN RIÊNG cho Workspace này (Người dùng đã xoá):\n[${blacklistExamples}]`
        : "";

    if (onLog && blacklist.length > 0) onLog(`🧠 AI đang học từ ${blacklist.length} rác anh đã xoá...`);

    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = start + CHUNK_SIZE;
        const chunk = totalTerms.slice(start, end);

        if (onLog) onLog(`⚙️ Đang phân loại đợt ${i + 1}/${totalChunks} (${chunk.length} từ)...`);

        const termList = chunk.map(t => `${t.original} (${t.type})`).join('\n');

        const systemInstruction = `
Lọc từ điển truyện (v3.1 - Extreme Noise Filter).
Mục tiêu: PHÂN LOẠI thực thể (Tên người/Chiêu thức/Địa danh) và TIÊU DIỆT rác ngữ pháp.
${learnSection}

QUY TẮC THANH TRỪNG CỰC ĐOAN (XÓA 100%):
1. Grammar Particles: Hiện tại, Thực tại, Tự kỷ/Tự mình, Phát hiện, Cảm giác, Thành công, Bình thường, Đồng thời, Thật ra, Hóa ra, Sau đó.
2. Pronouns: Hắn, Nàng, Hai người, Bọn họ...
3. Verbs: Nhận vi, Thấy, Quyết định, Chuẩn bị, Bắt đầu...
4. Status: Vô cùng, Rất, Đặc biệt, Nhất thời, Đột nhiên.

CHỈ PHÂN LOẠI - TUYỆT ĐỐI KHÔNG DỊCH:
- character: Tên người.
- skill: Công pháp, chiêu thức.
- location: Địa danh.

YÊU CẦU: Trả về JSON mảng: [{"original": "...", "type": "character | skill | location"}]
`;

        try {
            const rawResult = await withKeyRotation<{
                candidates: { content: { parts: { text: string }[] } }[],
                usageMetadata?: { promptTokenCount: number, candidatesTokenCount: number }
            }>(
                {
                    model: aiModel,
                    systemInstruction,
                    prompt: `Hãy phân loại và loại rác danh sách sau:\n${termList}`,
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 8192,
                    }
                }
            );

            const { recordUsage } = await import('../client');
            if (rawResult.usageMetadata) {
                recordUsage(aiModel, rawResult.usageMetadata);
                totalInputTokens += rawResult.usageMetadata.promptTokenCount;
                totalOutputTokens += rawResult.usageMetadata.candidatesTokenCount;
            }

            const rawText = rawResult.candidates[0].content.parts[0].text;
            let refined: { original: string, type: string }[] = [];

            try {
                const cleanText = rawText.replace(/```json|```/g, "").trim();
                const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
                const jsonStr = jsonMatch ? jsonMatch[0] : cleanText;

                try {
                    refined = JSON.parse(jsonStr);
                } catch (parseErr: unknown) {
                    const lastBrace = jsonStr.lastIndexOf('}');
                    if (lastBrace !== -1) {
                        const repaired = jsonStr.substring(0, lastBrace + 1) + "]";
                        refined = JSON.parse(repaired);
                    } else {
                        throw parseErr;
                    }
                }
            } catch {
                if (onLog) onLog(`⚠️ Đợt ${i + 1} phản hồi lỗi định dạng, đang bỏ qua...`);
                continue;
            }

            let updateCount = 0;
            const validOriginals = new Set(refined.map(r => r.original));
            const chunkOriginals = chunk.map(t => t.original);
            const garbageOriginals = chunkOriginals.filter(o => !validOriginals.has(o));

            if (garbageOriginals.length > 0) {
                await db.heuristicTerms
                    .where('workspaceId').equals(workspaceId)
                    .and(t => garbageOriginals.includes(t.original))
                    .modify({ isGarbage: true, updatedAt: new Date() });
            }

            for (const item of refined) {
                const existing = chunk.find(t => t.original === item.original);
                if (existing) {
                    const normalizedType = item.type?.toLowerCase();
                    const finalType = ['character', 'skill', 'location'].includes(normalizedType) ? normalizedType : 'unknown';
                    const localTranslated = repo.toHanViet(item.original);

                    await db.heuristicTerms.update(existing.id!, {
                        translated: localTranslated,
                        type: finalType as any,
                        confidence: 99,
                        updatedAt: new Date()
                    });
                    updateCount++;
                }
            }

            if (onLog) onLog(`✅ Xong đợt ${i + 1}. Giữ ${updateCount}, dọn ${garbageOriginals.length} rác.`);
        } catch (error: unknown) {
            console.error(`Error in chunk ${i}:`, error);
            if (onLog) onLog(`⚠️ Đợt ${i + 1} gặp lỗi API.`);
        }
    }

    if (onLog) {
        onLog(`📊 TỔNG KẾT: Đã sử dụng ${totalInputTokens} input / ${totalOutputTokens} output tokens.`);
        onLog(`✨ HOÀN TẤT. Đã dùng bộ phiên âm nội bộ để dịch 100% thuật ngữ.`);
    }
}

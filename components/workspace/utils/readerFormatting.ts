import { InspectionIssue } from "@/lib/types";
import { normalizeVietnameseContent } from "@/lib/gemini/helpers";

const escapeHTML = (str: string) => {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

/**
 * Split text into paragraphs lines using absolute strict newline splitting.
 * Follows the "Raw TXT" philosophy: Source Line -> Target Line.
 */
export function splitIntoParagraphs(text: string): string[] {
    if (!text) return [];

    // 0. Auto-nuke "Phantom Brackets" & Unicode garbage before formatting
    // This ensures that even old chapters in DB get cleaned visually
    let cleanedText = normalizeVietnameseContent(text);

    // 1. Chuẩn hóa xuống dòng & Ép phê ngay tại đây
    cleanedText = cleanedText.replace(/\r\n/g, "\n");

    // HEALING LOGIC: Squash dialogue breaks
    // Matches: "Name:\n\n[" OR "Name: \n[" OR "Name:\n ["
    cleanedText = cleanedText.replace(/:\s*\n+\s*\[/g, ": [");

    // 3. CHẶN CƯỠNG BÁCH: Không tự ý chặt dòng nếu không thực sự cần thiết
    cleanedText = cleanedText
        // .replace(/\]\s*(?=\[)/g, "]\n") 
        .replace(/([.!?;…])\s+(?=\[)/g, "$1\n"); // Chỉ chặt sau dấu câu kết thúc câu nếu đằng sau có [

    // 3. Bây giờ mới split theo dấu xuống dòng
    return cleanedText
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);
}

/**
 * Format text for reader display: minimal processing, strictly TXT style.
 */
export function formatReaderText(
    text: string,
    issues: InspectionIssue[] = [],
    activeTTSIndex: number | null = null
): string {
    if (!text) return "";

    const paragraphs = splitIntoParagraphs(text);

    return paragraphs.map((para, index) => {
        // Trả về text thuần túy, chỉ bọc thẻ <p> để dùng CSS thụt đầu dòng
        // Xóa sạch mọi logic bọc <span> hay màu tím/vàng mờ tịt

        const isHighlighted = activeTTSIndex === index;

        // Chỉ để lại class duy nhất để chỉnh hiển thị, không thêm logic màu mè
        // Nếu highlight, dùng style nhẹ. Nếu không, dùng style chuẩn TXT.
        const finalClass = isHighlighted
            ? "reader-txt-style bg-yellow-500/20 rounded transition-colors duration-300"
            : "reader-txt-style transition-colors duration-500";

        return `<p id="tts-para-${index}" class="${finalClass}">${escapeHTML(para)}</p>`;
    }).join('');
}

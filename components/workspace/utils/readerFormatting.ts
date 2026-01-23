import { InspectionIssue } from "@/lib/gemini";
import { normalizeVietnameseContent } from "@/lib/gemini/helpers";

/**
 * Split text into paragraphs lines using absolute strict newline splitting.
 * Follows the "Raw TXT" philosophy: Source Line -> Target Line.
 */
export function splitIntoParagraphs(text: string): string[] {
    if (!text) return [];

    // 0. Auto-nuke "Phantom Brackets" & Unicode garbage before formatting
    // This ensures that even old chapters in DB get cleaned visually
    let cleanedText = normalizeVietnameseContent(text);

    // 1. Chuẩn hóa xuống dòng
    cleanedText = cleanedText.replace(/\r\n/g, "\n");

    // 2. CHẶT CƯỠNG BÁCH: Chỉ thêm dấu xuống dòng, KHÔNG được nhét thêm dấu [ hay ] vào chuỗi thay thế
    // Lookahead (?=...) giúp ta nhìn thấy dấu [ mà không "nuốt" mất nó, nên không được viết lặp lại [ ở phần replace.
    cleanedText = cleanedText
        .replace(/\]\s*(?=\[)/g, "]\n")       // Tìm ] mà đằng sau là [ thì chỉ xuống dòng sau ]
        .replace(/([.!?;:…])\s+(?=\[)/g, "$1\n"); // Tìm dấu câu mà đằng sau là [ thì chỉ xuống dòng sau dấu câu

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

        return `<p id="tts-para-${index}" class="${finalClass}">${para}</p>`;
    }).join('');
}

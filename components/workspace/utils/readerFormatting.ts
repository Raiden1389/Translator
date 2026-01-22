import { InspectionIssue } from "@/lib/gemini";

/**
 * Split text into paragraphs with bracket-aware cleaning
 * Prevents orphaned closing brackets from appearing on separate lines
 */
export function splitIntoParagraphs(text: string): string[] {
    if (!text) return [];

    // 1. Dọn dẹp khoảng trắng thừa nhưng GIỮ LẠI cấu trúc đoạn
    let cleanedText = text
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+/g, ' ') // Layer 1: Clean spaces
        .replace(/^\s+|\s+$/gm, '') // Layer 1: Trim lines
        .replace(/\n{2,}/g, '\n\n'); // Layer 2: Paragraph Breathing

    // Layer 2.5: Dialogue Splitting (Fix text san sát nhau)
    // Rule 1: Quotes - BẮT BUỘC có dấu cách (để tránh cắt nhầm "Á!")
    cleanedText = cleanedText.replace(/([.!?;:…\]])\s+(["“])/g, "$1\n\n$2");

    // Rule 2: Dashes - Có thể dính liền (Vd: .—)
    cleanedText = cleanedText.replace(/([.!?;:…\]])\s*([-–—])/g, "$1\n\n$2");

    // 2. FIX RỤNG DẤU: Dán cái dấu ] vào câu trước nếu lỡ bị xuống dòng láo
    cleanedText = cleanedText.replace(/(.)\n\]/g, "$1]");

    // 3. THÊM DÒNG CHO HỆ THỐNG:
    // a. Đảm bảo mỗi cái [ ] là một dòng nếu dính liền
    cleanedText = cleanedText.replace(/\]\s*\[/g, "]\n[");

    // b. Xử lý dạng hội thoại: [Nội dung A] Tên B: [Nội dung B] -> xuống dòng trước Tên B
    // Regex logic: Tìm dấu ] + khoảng trắng + (Tên Speaker < 40 ký tự) + khoảng trắng tùy ý + dấu : + dấu [
    cleanedText = cleanedText.replace(/\]\s*([^\n:\[\]]{1,40})\s*:\s*\[/g, "]\n$1: [");

    // 4. FIX NGẮT DÒNG SAU DẤU PHẨY (User feedback)
    // Nối các dòng kết thúc bằng dấu phẩy lại VỚI ĐIỀU KIỆN dòng tiếp theo KHÔNG phải là hội thoại (bắt đầu bằng " hoặc -)
    // Regex: tìm dấu phẩy + xuống dòng + khoảng trắng, NHƯNG phía sau không được là " hoặc -
    cleanedText = cleanedText.replace(/,\s*\n\s*(?!["\-])/g, ", ");

    // 4. CHỐT HẠ: Split theo dấu xuống dòng
    // Chúng ta split theo 1 hoặc nhiều dấu xuống dòng để tạo mảng paragraphs
    return cleanedText.split(/\n/).map(p => p.trim()).filter(p => p.length > 0);
}

/**
 * Format text for reader display with styling and issue highlighting
 * @param text - Raw text content
 * @param issues - AI inspection issues to highlight
 * @param activeTTSIndex - Currently active TTS paragraph index
 * @returns HTML string with formatted paragraphs
 */
export function formatReaderText(
    text: string,
    issues: InspectionIssue[] = [],
    activeTTSIndex: number | null = null
): string {
    if (!text) return "";

    const paragraphs = splitIntoParagraphs(text);

    return paragraphs.map((para, index) => {
        let formattedPara = para;

        // Layer 1: Clean & Normalize (Spaces)
        formattedPara = formattedPara.replace(/[ \t]+/g, ' ');

        // Layer 3: Punctuation Beauty
        formattedPara = formattedPara.replace(/"([^"]*)"/g, '“$1”'); // Smart quotes
        // Fix: Only add space if NOT followed by another dot or digit
        formattedPara = formattedPara.replace(/([.!?,])(?=[^ \d.])/g, '$1 ');

        // Layer 4: Structure Repair (Comma -> Period heuristics)
        // Expanded list based on user feedback (Vị, Thở, Ngước, Thấy, Đích, Tên, Cũng, Thường, Thế...)
        const pronouns = "Hắn|Nó|Gã|Mụ|Lão|Người|Kẻ|Cô|Anh|Chị|Ông|Bà|Tên|Con|Thằng|Bọn|Lũ|Các|Những|Mọi|Mỗi|Một";
        const conjunctions = "Nhưng|Và|Thì|Mà|Bởi|Tuy|Nên|Rồi|Đã|Đang|Sẽ|Tại|Vì|Nếu|Do|Để|Với|Cùng|Cũng|Thế";
        const prepositions = "Trong|Ngoài|Trên|Dưới|Trước|Sau|Lúc|Khi|Giờ";
        const verbs = "Thở|Ngước|Nhìn|Thấy|Nghe|Nói|Bảo|Hỏi|Đáp|Cười|Khóc|Đứng|Ngồi|Đi|Chạy|Đến|Về|Vén";
        const others = "Cái|Cố|Vị|Đích|Chỉ|Có|Không|Chưa|Chẳng|Biết|Nhớ|Quên|Muốn|Thích|Yêu|Ghét|Thường|Thôi";

        const safeWords = `${pronouns}|${conjunctions}|${prepositions}|${verbs}|${others}`;
        const regex = new RegExp(`, (${safeWords})`, 'g');
        formattedPara = formattedPara.replace(regex, '. $1');

        // Dashes: - Hello -> - <i>Hello</i>
        if (formattedPara.trim().startsWith('-') || formattedPara.trim().startsWith('—')) {
            formattedPara = formattedPara.replace(/^([-—])\s*(.*)/, '$1 <i>$2</i>');
        }

        // 3. Apply Issues Highlighting
        issues.sort((a, b) => b.original.length - a.original.length).forEach(issue => {
            if (formattedPara.includes(issue.original)) {
                formattedPara = formattedPara.split(issue.original).join(
                    `<span class="bg-yellow-500/20 underline decoration-yellow-500 decoration-wavy cursor-pointer hover:bg-yellow-500/30 transition-colors" data-issue-original="${issue.original}">
                        ${issue.original}
                      </span>`
                );
            }
        });

        const isHighlighted = activeTTSIndex === index;
        const isTTSMode = activeTTSIndex !== null;

        const highlightClass = isHighlighted
            ? "opacity-100 bg-white/[0.04] px-6 -mx-6 py-4 rounded-xl border-l-2 border-emerald-400 mb-6 transition-all duration-300 ease-out"
            : `mb-5 leading-loose whitespace-pre-line transition-all duration-500 ${isTTSMode ? "opacity-50 hover:opacity-100" : "opacity-100"}`;

        return `<p id="tts-para-${index}" class="${highlightClass}">${formattedPara}</p>`;
    }).join('');
}

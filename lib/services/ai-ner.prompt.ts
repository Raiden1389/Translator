export function buildGeminiNERPrompt(chunkText: string, typesList: string): string {
    return `Bạn là chuyên gia dịch truyện Trung-Việt. Trích xuất các thực thể (Tên người, Địa danh, Tổ chức, Công pháp/Kỹ năng) từ văn bản tiếng Trung và PHẢI DỊCH/PHIÊN ÂM SANG TIẾNG VIỆT:

Loại cần trích: ${typesList}

Văn bản tiếng Trung:
"""
${chunkText}
"""

YÊU CẦU BẮT BUỘC:
1. "original": Phải là TÊN TIẾNG VIỆT (Hán Việt hoặc phiên âm Latin). TUYỆT ĐỐI KHÔNG ĐỂ NGUYÊN CHỮ HÁN.
2. "chinese": Tên gốc tiếng Trung (chữ Hán).
3. "context": Mô tả ngắn bằng tiếng Việt về thực thể này trong cốt truyện.

VÍ DỤ ĐÚNG:
[
  {"original":"Trương Tam Phong","chinese":"张三丰","type":"Person","context":"Cao thủ võ lâm của phái Võ Đang"},
  {"original":"Võ Đang Sơn","chinese":"武当山","type":"Location","context":"Địa điểm tu luyện chính"},
  {"original":"Arthur","chinese":"亚瑟","type":"Person","context":"Kỵ sĩ vương"}
]

Trả về JSON array. CHỈ trả JSON, không thêm text giải thích.`;
}

export function buildVertexSeedPrompt(chunkText: string, typesList: string): string {
    return `Bạn là bộ quét thực thể cho app dịch truyện Trung-Việt.
NHIỆM VỤ: vét CÀNG ĐỦ CÀNG TỐT tất cả thực thể mới xuất hiện trong đoạn, không bỏ sót tên chỉ xuất hiện 1 lần.

Loại cần trích: ${typesList}

Văn bản tiếng Trung:
"""
${chunkText}
"""

QUY TẮC:
1. Ưu tiên RECALL: thà trả hơi dư còn hơn bỏ sót.
2. Mỗi thực thể trả 1 object gồm:
   - "chinese": chữ Hán gốc
   - "type": chỉ được là Person | Location | Organization | Skill | Item | Unknown
   - "context": mô tả ngắn bằng tiếng Việt
3. Không cần dịch sang tiếng Việt ở bước này.
4. Gộp mục trùng nhau trong cùng đoạn.
5. Nếu không có thì trả [].

CHỈ trả JSON array, không thêm giải thích.`;
}

export function buildVertexTranslatePrompt(seedJson: string): string {
    return `Bạn là chuyên gia đặt thuật ngữ Trung-Việt cho app dịch truyện.
Hãy đổi danh sách thực thể sau sang tên tiếng Việt chuẩn.

QUY TẮC:
1. Giữ nguyên số lượng phần tử, không được bỏ mục nào.
2. "original" phải là tên tiếng Việt/Hán Việt/phiên âm Latin phù hợp ngữ cảnh.
3. "chinese" giữ nguyên chữ Hán đầu vào.
4. "type" giữ nguyên giá trị đầu vào.
5. "context" viết ngắn gọn bằng tiếng Việt, có thể cải thiện cho tự nhiên hơn.
6. Với tên người Tây phương, ưu tiên dạng Latin tự nhiên.
7. Với địa danh/công pháp/vật phẩm kiểu tiên hiệp, ưu tiên Hán Việt chuẩn.

Input JSON:
${seedJson}

CHỈ trả JSON array theo dạng:
[
  {"original":"...","chinese":"...","type":"Person","context":"..."}
]`;
}

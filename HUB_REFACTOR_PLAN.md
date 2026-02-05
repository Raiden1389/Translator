# 🚀 PLAN: RAIDEN INTELLIGENCE HUB REFACTOR (V1.0)

> **Mục tiêu**: Hợp nhất Heuristic, Dictionary (ai quét), Persona, Corrections và Blacklist vào một trung tâm điều khiển duy nhất. Xây dựng Portal kết nối mượt mà với Reader.

---

## 🏗️ 1. CẤU TRÚC LAYOUT (HUB STRUCTURE)
Thay thế hệ thống Tab ngang bằng **Sidebar Dọc Nội Bộ** (Internal Vertical Sidebar).

### 📐 Danh sách các Module trong Hub:
| Module Icon | Tên Module | Chức năng chính | Thành phần (Components) |
| :-- | :-- | :-- | :-- |
| 🔍 | **Discovery** | Inbox tổng hợp kết quả (Heuristic + AI Scan) | `HeuristicScanner`, `ReviewInbox`, `ResultTable` |
| 📖 | **Glossary** | Quản lý tên riêng, thuật ngữ đã chốt | `DictionaryView`, `TermDetails` |
| 🎭 | **Persona** | Hồ sơ nhân vật (Giới tính, xưng hô) | `CharacterTab` |
| ⚙️ | **Tuning** | Hiệu chính văn bản từ Reader | `CorrectionsView` |
| 🚫 | **Sanitizer** | Vùng cách ly (Blacklist) | `BlacklistView` |

---

## 🧩 2. CHIẾN LƯỢC COMPONENTIZE (REFACTOR DETAIL)

### 📡 A. Phân tách Heuristic (Mới):
Bóc tách file `HeuristicTab.tsx` thành các linh kiện nhỏ:
*   `HeuristicScanner.tsx`: Quản lý tác vụ quét & Progress bar.
*   `HeuristicFilters.tsx`: Bộ lọc thông minh (All, Pending, Approved).
*   `HeuristicTermList.tsx`: Logic render Virtual List (hiệu năng cao).
*   `HeuristicTermItem.tsx`: Render từng dòng thuật ngữ đơn lẻ (Atom UI).
*   `HeuristicStatsCard.tsx`: Báo cáo Forensic & độ tin cậy.

### 📚 B. Kế thừa Dictionary (Đã refactor):
Tích hợp các thành phần sếp đã chia nhỏ vào cấu trúc Hub:
*   **Views**: `DictionaryView`, `CorrectionsView`, `BlacklistView`.
*   **Hooks**: `useDictionary`, `useDictionaryAI`, `useCorrections`, `useBlacklist`.
*   **Review**: Chuyển `ReviewDialog` thành `UnifiedReviewInbox` (Giao diện duyệt từ phẳng, không dùng Dialog che màn hình).

---

## 🔄 3. DỮ LIỆU & PORTAL FLOW
*   **Reader Portal**: Thêm nút `PortalJump` trên Reader Header.
*   **State Persistence**: Lưu vị trí `scroll`, `chapterId` khi nhảy sang Hub.
*   **Back Link**: Nút `Return to Battle` trên Hub Sidebar để quay lại đúng ngữ cảnh đang đọc.
*   **Context Preview**: Tính năng hover xem ngữ cảnh bằng văn bản Convert (0đ chi phí).

---

## ✅ 4. ĐÁNH GIÁ PROS & CONS

### **Pros (Lợi ích):**
1.  **Vibe "Studio"**: Giao diện chuyên nghiệp, tập trung cao độ.
2.  **Xóa bỏ Tab Inception**: Không còn tab chồng tab gây rối mắt.
3.  **Tối ưu Quy trình**: Duyệt từ mới (Discovery) và quản lý kho (Glossary) nằm cạnh nhau.
4.  **Zero-Cost Context**: Check từ chuẩn hơn mà không tốn xu nào.

### **Cons (Thách thức):**
1.  **Refactor tốn sức**: Cần cẩn thận khi bóc tách Heuristic để không hỏng logic quét.
2.  **Điều hướng**: Cần xử lý mượt mà trạng thái "đang đọc" khi nhảy sang Hub.

---

## 🛠️ 5. REFACTOR LIST (MANDATORY FILES)
1.  `WorkspaceClient.tsx` -> Re-layout với `IntelligenceHub`.
2.  `HeuristicTab.tsx` -> **DELETE** (Sau khi đã bóc tách hết vào linh kiện).
3.  `DictionaryTab.tsx` -> **DELETE** (Đưa vào Hub Sidebar).
4.  `ReaderHeader.tsx` -> Thêm icon Portal.
5.  `ReaderModal.tsx` -> Xử lý Portal state.

---

## 🛡️ IMPACT REPORT (SAFE PROTOCOL)
*   🎯 **Mục tiêu**: Xây dựng Raiden Intelligence Hub trung tâm.
*   🧩 **Thay đổi**: Refactor UI 2 tab cũ thành Sidebar Layout mới.
*   🗑️ **Xóa/Ghi đè**: YES (UI cũ), 🚫 NO (Dữ liệu DB).
*   🔙 **Rollback**: YES.

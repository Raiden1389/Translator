# 🥇 TABLE UX GOLD STANDARD

(App-wide, mandatory, non-negotiable)

## 0. TRIẾT LÝ CỐT LÕI
Table = công cụ quét thông tin, không phải trang trí
Ưu tiên: 
- Dễ đọc
- Dễ quét
- Không mỏi mắt
Người dùng phải hiểu bảng trong 3 giây đầu, không cần suy nghĩ

## 1. LAYER & DEPTH (BẮT BUỘC)
### 1.1 Table KHÔNG được đặt trực tiếp trên nền trắng
Luôn có 3 lớp rõ ràng:
1. App background (muted)
2. Table container (card)
3. Row (white)

Chuẩn:
- App bg → `bg-muted` / off-white
- Table wrapper → `bg-muted/30–40`
- Table body → `bg-card` / white

❌ CẤM:
- Table = nền app = cùng 1 màu
- White on white không phân lớp

## 2. TABLE HEADER (ANCHOR CỦA MẮT)
### 2.1 Header là “điểm neo thị giác”
Header phải:
- Đậm hơn row
- Tách khỏi body rõ ràng
- Không lẫn với data

Chuẩn:
- Background: `bg-muted/50`
- Text: `font-semibold`, `text-foreground`
- Border bottom: `border-border-strong` (hoặc `border-b-2`)

❌ CẤM:
- Header mờ hơn row
- Header cùng màu body

## 3. ROW DESIGN (KHẢ NĂNG QUÉT)
### 3.1 Zebra nhẹ, KHÔNG lòe loẹt
Zebra chỉ để giữ dòng, không dùng màu mạnh.
Chuẩn:
- Odd row → `bg-white`
- Even row → `bg-muted/20`

### 3.2 Hover phải “dẫn mắt”, không gây giật
Hover = feedback, không phải highlight dữ liệu.
Chuẩn:
- `bg-blue-50` hoặc tương đương rất nhạt
- Transition nhanh (100–150ms)

❌ CẤM:
- Hover đậm hơn status color
- Hover làm mất focus nội dung

## 4. HIERARCHY TRONG 1 ROW (RẤT QUAN TRỌNG)
### 4.1 Mỗi row chỉ có 1 primary focus
Ví dụ: Tên truyện, Tên người, Tên task.
Chuẩn:
- Primary: đậm, màu chính
- Secondary: nhạt hơn, nhỏ hơn
- Meta: muted, không đậm

❌ CẤM:
- 2–3 text cùng weight
- Không phân cấp → đọc mệt

### 4.2 Text hierarchy chuẩn
- Primary → `font-medium` / `semibold`
- Secondary → `normal` / `italic`
- Meta → `text-muted-foreground`

## 5. STATUS / BADGE / TAG
### 5.1 Status = semantic color
Success → xanh, Pending → xám / vàng nhạt, Error → đỏ.
Quy tắc vàng: Status KHÔNG được sáng hơn hover.

❌ CẤM:
- Neon
- Gradient
- Badge to hơn nội dung chính

## 6. CHECKBOX / INDEX / CONTROL COLUMN
### 6.1 Cột phụ phải “nhẹ nhưng rõ”
Checkbox, index, icon = phụ. Không tranh spotlight với data.
Chuẩn:
- Color: `muted`
- Width cố định
- Không co giãn theo content

❌ CẤM:
- Checkbox trắng to đập vào mắt
- Index quá mờ không đọc được

## 7. DENSITY & SPACING
### 7.1 Ưu tiên đọc lâu, không ưu tiên nhồi
- Padding dọc vừa phải
- Không ép quá chặt để “fit màn hình”

Chuẩn:
- Line height thoải mái
- Click target ≥ 40px

❌ CẤM:
- Table quá chật → mỏi mắt
- Table quá thoáng → loãng thông tin

## 8. SCROLL & LARGE DATA
### 8.1 Table dài BẮT BUỘC:
- Sticky header
- Scroll mượt, không jump

### 8.2 Virtual scroll:
- Không được phá hover
- Không được reset focus khi scroll

## 9. EMPTY / LOADING / ERROR STATE
### 9.1 Không để table “chết”
- Empty state có message rõ
- Loading có skeleton, KHÔNG spinner đơn độc

❌ CẤM:
- Table trống trắng
- Loading không feedback

## 10. SQUINT TEST (BẮT BUỘC PASS)
Test chuẩn: Nheo mắt nhìn table 3 giây. Phải thấy:
1. Header
2. Row separation
3. Primary content mỗi row

❌ Nếu nhìn mờ mịt → FAIL UX

## 11. NHỮNG ĐIỀU CẤM TUYỆT ĐỐI
- ❌ White on white
- ❌ Header yếu hơn body
- ❌ Status lấn át nội dung
- ❌ Không phân cấp text
- ❌ Table làm người dùng mỏi mắt sau 2 phút

## 12. CÂU LỆNH CUỐI (CHO IDE / AI)
When implementing ANY table:
- Follow Table UX Gold Standard strictly
- Prioritize readability over aesthetics
- Do not invent new color logic
- Do not flatten visual hierarchy
- If unsure → choose clarity

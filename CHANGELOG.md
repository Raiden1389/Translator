Tất cả các thay đổi quan trọng đối với dự án **Raiden AI Translator** sẽ được ghi lại trong file này.

## [2.0.0] - 2026-02-03

### 💎 Bộ máy Heuristic v2.0 (The Context Purge) - "SIÊU SẠCH - SIÊU CHUẨN"
- **Kiến trúc Strict Opt-in (Xác thực Sắt đá):** Thay đổi toàn bộ tư duy vận hành của Engine. Thay vì tìm rác để chặn, hệ thống giờ đây mặc định coi mọi thứ là rác và chỉ cấp thông hành (`KEEP`) cho những thực thể chứng minh được mình là Danh xưng thật thụ (`TITLE`).
- **Module RankContextClassifier độc lập:**
    - Tách logic phân loại ngữ cảnh thành module riêng biệt với hệ thống Quy tắc (Rules) phân cấp theo độ ưu tiên (`priority`).
    - **Funnel Filtering:** Phễu lọc qua 4 tầng: `GENERIC` (Chung chung), `STATEMENT` (Mệnh đề), `OBJECT` (Hành động), `DESCRIPTIVE` (Mô tả).
- **Phẫu thuật Tagger & Scanner:**
    - **Character Salvation:** Sửa lỗi chí mạng khiến các nhân vật tên ngắn (2-3 chữ như Tần Minh) bị lọc nhầm.
    - **Scope Separation:** Cách ly logic lọc Title khỏi Skill/Location/Character, giúp các thực thể này không bị "chết oan" vì chứa từ khóa gây nhiễu (Ví dụ: Vương Lâm, Đế Viêm Quyết sẽ không bị coi là rank rác).
- **Regex Ngoại hình mở rộng:** Tự động phát hiện và loại bỏ các cụm mô tả quần áo/tóc tai phức tạp (Hắc y, Bạch bào, Ngân phát...) thường gây nhiễu danh từ riêng.
- **Diệt rác 'Đích' (`的`):** Quét và loại bỏ triệt để các cụm từ mang tính sở hữu/mô tả rác (VD: Chức đích Thánh đồ) lọt vào danh sách.

### 🎨 Cải tiến Giao diện Heuristic Center
- **Mount-State Protection:** Tích hợp `isMounted` ref để ngăn chặn lỗi React update state trên component đã unmount, đảm bảo app không bị crash khi người dùng chuyển tab nhanh trong lúc đang quét.
- **Metric Fixes:** Sửa lỗi hiển thị `NAN%` trên thanh tiến trình khi dữ liệu chưa tải xong.
- **Blacklist Reset:** Thêm nút "Xóa Sạch" bộ nhớ Blacklist Heuristic để người dùng dễ dàng reset engine khi có cập nhật logic mới.
- **Tối ưu hóa Phối màu:** Điều chỉnh màu sắc trạng thái (Character/Skill/Location) rực rỡ và dễ phân biệt hơn.

### 🛠️ Kỹ thuật (Technical Maintenance)
- **Lint Nuke:** Dọn dẹp sạch sẽ các lỗi JSDoc, tham số không sử dụng và lỗi ép kiểu `any` trong toàn bộ module Heuristic.
- **Modularization:** Dễ dàng mở rộng Rule Set cho các loại thực thể mới (Pháp bảo, Cảnh giới) mà không cần can thiệp vào lõi Scanner.

## [1.9.0] - 2026-02-01

### 🧠 Động cơ Kể chuyện v5.1 (Storyteller Engine v5.1) - "SỐNG ĐỘNG HÓA AI"
- **Sensory Structure (Cấu trúc Cảm quan):** Thay đổi hoàn toàn tư duy của AI. Chuyển đổi từ mô tả sinh lý học (phản xạ cơ thể) sang mô tả cảm giác xã hội.
    - *Ví dụ:* Tự động chuyển "Hít một hơi lạnh" thành "Xuýt xoa", "Kinh ngạc".
- **Emotion Intensity Ladder (Ma trận Cường độ):** Thiết lập 7 kênh cảm xúc (Bất ngờ, Sợ hãi, Regret, Nhịp điệu, Khinh miệt, Đau đớn, Giận dữ) với 3 cấp độ cường độ. AI giờ đây biết chọn từ ngữ "đủ liều lượng" cho từng tình huống (Lv1: Khẽ giật mình -> Lv3: Sững sờ/Vỡ vụn).
- **Social Register (Phân cấp Vai diễn):** Nâng cấp Heuristic Scan để nhận diện và áp dụng phong thái riêng cho từng nhân vật:
    - *Tiểu thư/Tiên tử:* Mỹ miều, nhã nhặn.
    - *Lưu manh/Côn đồ:* Thô, gãy, lóng gắt.
    - *Lão quái/Trưởng bối:* Uy nghiêm, triết lý, cô đọng.
    - *Thiếu nhi/Linh thú:* Nhí nhảnh, cảm thán nhiều (nha, ạ, nhé).
- **Onomatopoeia (Âm thanh huyên náo):** Tích hợp bộ từ tượng thanh thuần Việt (Bốp, Chát, Thịch, Rầm, Vút) vào cảnh chiến đấu để tăng tính hình động.
- **Battle Feedback & Face Metaphors:** Tự động chuyển đổi các cụm từ ước lệ (Máu chảy thành sông -> Máu tươi loang lổ) và các ẩn dụ thể diện (Mất mặt -> Muối mặt, Ếch ngồi đáy giếng) để câu văn đậm chất Việt.

### 🛡️ Chốt chặn An toàn & Chống Over-polish
- **Anti-Overdramatization:** Khóa các mô tả kịch tính quá mức (rợn người, sát khí...) trong các tình huống đời thường hoặc thoại ngắn.
- **Dialogue Protection:** Đảm bảo lời thoại ngắn (Ví dụ: "Cút!") luôn được giữ sự thô ráp, trực diện, không bị AI "hoa lá cành".
- **Slang Pacing:** Giãn cách mật độ dùng tiếng lóng mạnh để tránh loạn tone truyện.
- **Whitelist Flexibility:** Cho phép AI phá rào Whitelist nếu việc rewrite mang lại câu văn tự nhiên hơn cho người Việt.

### 📊 Thang điểm Chấm dịch v5.1
- Áp dụng Framework chấm điểm 10 điểm (Tầng Cứng - Tầng Mượt - Tầng Linh Hồn - Xuất Thần) để kiểm soát chất lượng đầu ra một cách khoa học.

## [1.8.0] - 2026-01-31

### 🚀 Khôi phục & Tái cấu trúc Action Hub (Feature Restoration)
- **Action Hub 2.0:** Thiết kế lại thanh công cụ nhanh dưới dạng lưới 2 hàng (Grid Layout) cực kỳ tối ưu.
    - **Hàng 1:** Dọn dẹp Cache AI (Eraser), Xuất JSON (Download), Nhập JSON (UploadCloud).
    - **Hàng 2:** Nhập Epub/Txt (FileText), Quét thuật ngữ AI (ScanLine), Lịch sử & Hoàn tác (Clock).
- **Nút Cải chính Thông minh:** Chuyển nút hành động chính trên Header thành "Cải chính" (ShieldCheck) để người dùng áp dụng quy tắc từ điển nhanh chóng.
- **Batch Processing UX:** Nâng cấp `handleApplyCorrections` - tự động hỏi để áp dụng cho toàn bộ chương đã dịch nếu người dùng không chọn chương cụ thể nào.

### 🧹 Xử lý triệt để Lỗi hiển thị ("txt lỗi")
- **Auto-Normalization:** Tự động phát hiện và chuyển đổi các thẻ `<br>`, `&lt;br&gt;` thành ký tự xuống dòng thật sự ngay khi nạp file JSON (Import) và khi hiển thị (Reader).
- **Title Cleaning:** Loại bỏ hoàn toàn dấu xuống dòng thừa trong tiêu đề chương ở chế độ xem Danh sách và Thẻ.
- **HTML Safety:** Cho phép hiển thị các thẻ định dạng cơ bản (`<b>`, `<i>`) trong văn bản dịch thay vì mã hóa chúng.

### 🔇 Tối ưu hóa Giọng đọc (TTS Stability)
- **Timeout Protection:** Thêm cơ chế tự ngắt sau 10 giây nếu Edge TTS không phản hồi, tránh treo giao diện.
- **State Cleanup:** Tự động reset trạng thái "Đang phát" khi gặp lỗi mạng hoặc lỗi API.
- **Segment Filtering:** Tự động bỏ qua các đoạn văn bản rỗng hoặc chỉ chứa khoảng trắng để giọng đọc mượt mà hơn.

### 🛠️ Kỹ thuật (Technical Maintenance)
- **Tailwind v4 Migration:** Cập nhật cú pháp biến CSS `mb-(...)` thay thế cho `mb-[var(...)]` theo chuẩn mới.
- **Codebase Cleanup:** Loại bỏ hoàn toàn các prop và import dư thừa (`onFixBrackets`, `Wand2`, `Plus`...) để tối ưu hiệu năng.
- **Safe Database Clean:** Bổ sung tính năng xóa cache AI trong Action Hub giúp xử lý các trường hợp AI bị "kẹt" prompt cũ.

## [1.7.5] - 2026-01-30

### 🧹 Loại bỏ Crawler & Tinh gọn Hệ thống (System Streamlining)
- **Scrap Internal Crawler:** Gỡ bỏ hoàn toàn bộ máy cào truyện nội bộ và các UI liên quan (`CrawlerDialog`, `GlobalCrawlerProgress`, etc.) để giảm nhẹ dung lượng app và loại bỏ triệt để các lỗi liên quan đến Cloudflare chặn.
- **JSON Direct Workflow:** Chuyển đổi sang quy trình làm việc 100% dựa trên file JSON nạp từ bên ngoài. Hệ thống giờ đây tập trung hoàn toàn vào việc dịch và quản lý dữ liệu thay vì cào dữ liệu.
- **Tối ưu hóa Backend:** Xóa bỏ các lệnh Rust không còn sử dụng (`native_crawl_v2`), giúp file thực thi gọn gàng và ổn định hơn.
- **Cải thiện TranslationProvider:** Tự động kiểm tra nội dung gốc trước khi dịch, đưa ra cảnh báo rõ ràng nếu chương thiếu nội dung (do import lỗi).

## [1.7.0] - 2026-01-30

### 📤 Cổng Nhập Dữ liệu Thông minh (JSON Import Gateway)
- **Kiến trúc "Chia để trị":** Chuyển đổi toàn bộ engine cào truyện (Crawler) sang công cụ Web bên ngoài để phá đảo Cloudflare, giúp App chính luôn ổn định và không bị chặn IP.
- **Import Universal:** Hỗ trợ nạp bộ truyện cực nhanh từ file JSON chuẩn hóa. Tự động khởi tạo Workspace, nạp Metadata (Bìa, Tên, Tác giả) và hàng loạt chương chỉ trong một nốt nhạc.
- **Dọn dẹp UI:** Gỡ bỏ các thành phần crawler cũ gây nặng máy và dễ lỗi, thay bằng giao diện nạp file chuyên dụng và tinh gọn.

### 🎨 Tối ưu hóa Giao diện (Premium UI Polish)
- **Chapter Preview Redesign:** Làm lại hoàn toàn bảng xem trước chương với phong cách Glassmorphism, đổ bóng sâu và typography hiện đại.
- **Hệ thống Thông báo Toàn cục:** Tích hợp thanh tiến trình nạp dữ liệu đồng bộ, giúp người dùng theo dõi trạng thái import chuẩn xác hơn.

## [1.6.0] - 2026-01-30

### 🧠 Bộ máy Cải chính Thông minh (Correction Engine v2.0)
- **Tự động nhận diện Chữ hoa/Chữ thường:** Chỉ cần thêm 1 quy tắc viết thường, hệ thống tự động sửa cho cả bản viết hoa và viết hoa đầu câu.
- **Bảo lưu định dạng (Case-Preserving):** Ví dụ: `chủ công` -> `chúa công` thì `Chủ công` tự động thành `Chúa công`, `CHỦ CÔNG` thành `CHÚA CÔNG`.
- **Cải chính Trực tiếp (Live Correction):** Các thay đổi trong bảng Cải chính sẽ được áp dụng ngay lập tức lên giao diện trình đọc mà không cần dịch lại hay load lại chương.
- **Thanh tẩy ký tự ẩn (Invisible Character Nuke):** Tự động loại bỏ các ký tự tàng hình (zero-width) và chuẩn hóa khoảng trắng để đảm bảo khớp 100% quy tắc.
- **Chuẩn hóa Unicode (NFC):** Đảm bảo tính đồng nhất của các ký tự Tiếng Việt (dấu hỏi, dấu ngã) giữa bản gốc AI và dữ liệu người dùng nhập.

### 📖 Trình đọc & UI (Reader & UX Enhancements)
- **Đối chiếu Song song (Better Parallel View):** Văn bản gốc Tiếng Trung giờ đây được chia đoạn (paragraph) khớp với bản dịch, giúp việc đối chiếu trở nên dễ dàng hơn.
- **Độ chật văn bản (Compact Layout):** Giảm chiều cao dòng và khoảng cách đoạn văn để hiển thị được nhiều nội dung hơn trên một màn hình, giảm mỏi tay khi cuộn.
- **Scrolling Cải chính:** Thiết kế lại tab Cải chính với danh sách có thể cuộn độc lập và nút "Áp dụng" luôn cố định ở dưới cùng, cực kỳ dễ dùng trên mọi kích cỡ màn hình.

## [1.5.0] - 2026-01-28

### 🚀 Tái cấu trúc Hệ thống Trình trích xuất (AI NER v3.0)
- **Hệ thống Mô tả Thực thể:** AI giờ đây tự động tạo mô tả ngắn gọn cho nhân vật và thuật ngữ dựa trên ngữ cảnh (VD: "Thiếu gia nhà họ Lâm", "Thủ đô của nước Thục").
- **Bảo vệ Dữ liệu:** Ngăn chặn AI ghi đè lên các mô tả cũ mà người dùng đã dày công biên soạn. AI chỉ thêm mô tả nếu ô đó đang trống.
- **Dọn dẹp Công cụ:** Loại bỏ hoàn toàn Modal "Name Hunter" cũ để tập trung vào một quy trình Quét AI duy nhất, ổn định và mạnh mẽ hơn.
- **Hợp nhất & Lọc thông minh:** Tự động ẩn các thuật ngữ đã có trong từ điển, giúp người dùng chỉ tập trung vào các thực thể mới.

### ✨ Giao diện & Trải nghiệm (Review UI)
- **Visual Anchoring:** Tối ưu hóa hiển thị cặp Tên gốc - Dịch thuật. Chữ Hán được hiển thị với font Serif trang trọng, tên dịch nổi bật với màu xanh Emerald.
- **Chỉ báo dòng (Left Indicator):** Thêm thanh màu xanh ở lề trái cho các hàng đang được chọn để tăng khả năng định vị thị giác.
- **Footer Tinh gọn:** Thiết kế lại thanh hành động phía dưới để tối ưu diện tích và tập trung vào các thao tác Save/Cancel.
- **Tự động Hán Việt:** Toàn bộ thực thể quét ra từ văn bản gốc sẽ được tự động chuyển sang âm Hán Việt chuẩn xác.

## [1.4.1] - 2026-01-28

### ✨ Được cải tiến (Improved)
- **Hệ thống Viết hoa Thông minh (v2.0):** Nâng cấp hàm `finalSweep` thành một engine động. Tự động nhận diện và viết thường các đại từ, danh từ chung (Ta, Đại ca, Tướng quân...) khi đứng giữa câu dựa trên danh sách hệ thống và Từ điển của người dùng.
- **Prompt Engineering (v2.4): Hàn lại đoạn này bị cắt mất ở prompt gốc** Cập nhật `SYSTEM_INSTRUCTION` với các quy tắc viết hoa "hung dữ" và ví dụ Sai/Đúng trực quan, buộc AI tuân thủ nghiêm ngặt hơn.
- **Giao diện Tạo Workspace:** Làm lại hoàn toàn dialog `NewWorkspaceDialog` với thiết kế hiện đại, chia nhóm thể loại rõ ràng và hiệu ứng chuyển cảnh mượt mà.
- **Thanh công cụ Batch Actions:** Tái cấu trúc phân cấp thị giác cho toolbar. Chuyển các nút quét thuật ngữ thành dạng `outline` để giảm nhiễu màu sắc, ưu tiên nút "Dịch" chính.
- **Fix lỗi Logic:** Cập nhật nhận diện dấu hai chấm (`:`) là điểm ngắt câu để giữ viết hoa cho tiêu đề chương (VD: "Chương 1: Ta...").

### ➕ Đã thêm (Added)
- **AI Scan (Cũ):** Khôi phục tính năng quét thuật ngữ bằng AI nguyên bản, hoạt động song song với Name Hunter mới.
- **Review Dialog Integration:** Kết nối trình duyệt kết quả AI (ReviewDialog) vào cả Chapter List và Reader để người dùng duyệt thuật ngữ trước khi lưu.

### 🐞 Đã sửa (Fixed)
- **Lỗi Text Selection:** Khắc phục triệt để lỗi text bị tự động bôi đen toàn bộ (select-all) trong ô nội dung gốc. Giờ đây người dùng có thể chọn từng đoạn text bình thường.
- **Lint Errors:** Dọn dẹp các biến thừa, sửa lỗi sai prop name (`onConfirm` -> `onSave`) và tối ưu hóa các class Tailwind v4.

---

## [1.4.0] - 2026-01-26
- Phiên bản ổn định với tính năng Name Hunter mới và giao diện Raiden Mode.

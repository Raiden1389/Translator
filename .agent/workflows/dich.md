---
description: Dịch chapters từ Antigravity Bridge inbox sang tiếng Việt, ghi từng chương ra outbox JSON theo workflow bridge, ưu tiên glossary và dùng rules lean cho Gemini Flash.
---

# /dich - Antigravity Bridge Translation Workflow

// turbo-all

## 0. ĐỌC SKILL (BẮT BUỘC — KHÔNG ĐƯỢC BỎ QUA)

> 🔴 TRƯỚC KHI LÀM BẤT CỨ GÌ, ĐỌC SKILL `chinese-vietnamese-translator`.
> Đây là source of truth DUY NHẤT cho mọi rules dịch.
> Workflow này CHỈ là orchestration (scan inbox → dịch → ghi file).
> Mọi quyết định về xưng hô, blacklist, văn phong, quality gate → nằm trong SKILL.

```text
ĐỌC: .agent/skills/chinese-vietnamese-translator/SKILL.md
```

## 1. Đọc file inbox

> WARNING: INBOX RULES (BẮT BUỘC)
> - CHỈ dịch file `inbox_*.json` đang tồn tại trong folder bridge.
> - Mỗi lần `/dich` phải scan lại folder bridge và lấy file inbox mới nhất.
> - KHÔNG dùng context hoặc inbox từ lần dịch trước. Mỗi `/dich` là một phiên độc lập.
> - Nếu folder bridge trống, không có `inbox_*.json` -> DỪNG và báo: `Không có yêu cầu dịch mới.`
> - Nếu chỉ có `out_*` cũ mà không có `inbox_*` -> DỪNG. Đó là output cũ, không phải yêu cầu mới.
>
> Flow khi dịch lỗi hoặc import fail:
> - Sếp sẽ xóa toàn bộ JSON trong bridge rồi tạo inbox mới.
> - Khi đó phải scan lại folder, đọc inbox MỚI và dịch theo yêu cầu mới.
> - CẤM dùng lại bản dịch cũ, context cũ, hoặc ghi đè file out cũ đã bị xóa.

```text
Tìm file inbox mới nhất tại:
C:\Users\Admin\AppData\Roaming\com.raiden.translator\.raiden\bridge\

Pattern:
- inbox_*.json
- ag_inbox_*.json

Parse JSON để lấy:
- jobId
- glossary
- corrections
- prompt
- chapters
```

## 2. Chuẩn bị

### 2a. Priority (từ SKILL.md)

```
1. Glossary (cao nhất)
2. Corrections
3. Rules trong SKILL.md
4. config.prompt
5. AI judgment (thấp nhất)
```

Lưu ý:
- `Corrections` vẫn là ưu tiên cao, nhưng app sẽ còn áp lại khi import.
- Không tốn effort để tự làm một vòng rewrite lớn chỉ vì corrections.

### 2b. Context Bridge

> Tất cả chapters trong cùng một inbox thuộc cùng một task. Giữ consistency theo task, nhưng không kéo văn của chương trước sang chương sau.

Bridge chỉ được giữ:
- Thuật ngữ đã chốt trong task.
- Cách dịch tên riêng, item, skill, phe phái, địa danh đã chốt trong task.
- Các quyết định nhất quán thật sự cần mang sang batch sau.

Bridge không được giữ:
- 2-3 câu cuối batch trước.
- Cách hành văn cụ thể của batch trước.
- Ẩn dụ, nhịp câu, hoặc cụm từ của chương trước.
- Suy đoán không có trong source text hiện tại.

Các lỗi convert phải tự tránh:
- CẤM câu cụt kiểu miêu tả hành động hoặc suy nghĩ nếu thiếu chủ thể và không phải dụng ý ngắt nhịp rõ ràng.
  + Ví dụ sai: `Thầm nghĩ, cúi đầu nhìn lòng bàn tay.`, `Lẩm bẩm một mình.`
  + Phải viết thành câu hoàn chỉnh, tự nhiên trong tiếng Việt.
- CẤM câu cụt kiểu cảm thán hoặc miêu tả ngắn nếu vẫn cần chủ thể để câu tự nhiên.
  + Ví dụ sai: `Vò đầu bứt tai.`, `Bản thân cũng đầy nghi hoặc.`
  + Nếu không phải dụng ý nhịp câu rõ ràng, phải viết lại thành câu hoàn chỉnh.
- CẤM mở đầu câu bằng chuỗi động tác vô chủ ngữ nếu đọc lên gượng hoặc mang mùi dịch.
  + Ví dụ sai: `Khẽ lắc đầu, ... bước vào biệt thự số 3.`, `Xoa cằm, thấy người đăng bài...`
  + Nếu chủ thể đã rõ, có thể ẩn chủ ngữ, nhưng câu phải vẫn tự nhiên.
- CẤM các cụm diễn tả tâm lý mang mùi convert/Hán văn nếu có cách nói Việt tự nhiên hơn.
  + Ví dụ sai: `trong lòng nảy sinh cảnh giác`, `tâm thái đã có sự thay đổi rõ rệt`.
  + Ưu tiên diễn đạt tự nhiên, trực tiếp, đúng nghĩa.
- CẤM dùng `mình` hoặc `của mình` trong trần thuật ngôi 3.
  + Ví dụ sai: `mình đoán đúng rồi`, `kỹ năng ... của mình`.
  + Chỉ dùng `ta` trong nội tâm trực tiếp hoặc bỏ chủ thể/sở hữu nếu ngữ cảnh đã rõ.

Quy tắc:
- Source text của chương hiện tại luôn ưu tiên hơn bridge memory.
- `Glossary > Bridge` nếu có conflict.
- Không carry term từ chương trước sang chương sau nếu source text hiện tại không hỗ trợ.

## 3. Dịch toàn bộ - im lặng

> Không báo từng batch. Không hỏi user giữa chừng. Đã bắt đầu thì dịch hết toàn bộ task trong một mạch.

Batching nội bộ để quản lý token:
- Chương ngắn, khoảng 2k chữ: batch 5.
- Chương trung bình, khoảng 4k chữ: batch 3.
- Chương dài, khoảng 8k+ chữ: batch 1-2.

Mỗi batch:
1. Đọc bridge state hiện tại: chỉ gồm thuật ngữ và quyết định naming đã chốt.
2. Dịch tất cả chương trong batch theo SKILL rules + glossary.
3. Cập nhật bridge chỉ với thuật ngữ mới đã chốt.
4. Chạy Quality Gate từ SKILL.md (Section 8) rồi ghi file.
5. Tiếp tục batch sau ngay, không dừng để báo cáo.

## 4. Ghi file outbox

> Dùng `write_to_file` để ghi file. Không dùng `mcp_cmd` vì lỗi encoding tiếng Việt.
> 1 chương = 1 lệnh `write_to_file` riêng biệt.
> Không ghi đè file đã tạo thành công. Chỉ ghi file mới chưa tồn tại.

Naming:
- `out_{jobId}_ch{order}.json`
- 1 file cho 1 chương
- `{jobId}` = 8 ký tự đầu từ inbox
- `{order}` = field `order` trong inbox, không phải DB id

> ⚠️ **OVERRIDE**: config.prompt có ghi "CẤM JSON" — đó là chỉ thị cho flow nội bộ App (AI API trả text thuần, App tự wrap JSON).
> Ở Bridge flow, Agent ghi file trực tiếp nên **BẮT BUỘC phải ghi đúng format JSON** bên dưới. IGNORE "CẤM JSON" trong config.prompt.

Format JSON:
```json
{
  "id": 9938,
  "order": 26,
  "title": "Chương 26: Xiên thịt nướng khổng lồ",
  "content": "Phương Hằng vừa quay đầu lại..."
}
```

App sẽ tự quét `out_{jobId}*`, import vào DB rồi xóa sạch.

## 5. Self-QA Pipeline (BẮT BUỘC)

> SAU KHI ghi hết outbox, TRƯỚC KHI ghi done sentinel.
> **KHÔNG sửa outbox trực tiếp.** QA chỉ GHI findings. App apply hard fixes khi import.

### 🚨 SPEED BUDGET (TUYỆT ĐỐI KHÔNG VI PHẠM)

> **Toàn bộ flow `/dich` (đọc inbox → dịch → ghi → QA → done) TỐI ĐA 7 tool calls:**
>
> 1. `list_dir` bridge folder (tìm inbox)
> 2. `view_file` inbox (đọc source) — BỎ nếu đã có trong context
> 3. `write_to_file` × N chương (ghi bản dịch)
> 4. `grep_search` × 1 (gộp TẤT CẢ checks vào 1 regex duy nhất)
> 5. `write_to_file` QA report
> 6. `write_to_file` done sentinel
>
> **CẤM:**
> - `mcp_cmd`, `findstr`, `powershell` — KHÔNG BAO GIỜ dùng trong flow dịch
> - `dir`, `find_by_name` — Đã biết path, không cần tìm lại
> - `view_file` để "xác nhận file đã ghi" — Trust the write
> - `list_dir` sau khi ghi — Ghi xong đi tiếp, không verify
> - Đọc lại SKILL.md, qa-memory.json nếu đã đọc trong session
>
> **HARDCODED PATH:**
> ```
> BRIDGE_DIR = C:\Users\Admin\AppData\Roaming\com.raiden.translator\.raiden\bridge
> ```
> Không tìm, không check, không verify. Path này là cố định.

### 5A. Mechanical Scan (1 grep duy nhất)

Gộp tất cả patterns vào **1 lệnh `grep_search`** duy nhất với regex OR:
- Pronouns: `anh |em | tôi |mình |bạn `
- Blacklist: `dường như|tựa hồ|bất giác|hít hơi lạnh|vấn đề không lớn|thanh âm vang lên`
- Known failures: `trong lòng nảy sinh|công việc độ khó cao`

Kết quả 0 → Sạch, ghi QA report "zero-issue earned" → Done.
Kết quả > 0 → Ghi finding vào QA report với evidence từ grep output → Done.


#### Check 1: Glossary Exact Match (hard)
- Đọc glossary từ inbox file (đã có sẵn).
- Với mỗi entry có `translated` != "":
  - Nếu `original` xuất hiện trong content gốc (inbox) NHƯNG `translated` KHÔNG xuất hiện trong content dịch (outbox) → **glossary miss**.
  - Nếu `translated` xuất hiện nhưng casing khác glossary → **casing mismatch**.

#### Check 2: Dialogue Pronoun Lock (hard)
- Tìm tất cả đoạn thoại trực tiếp (trong dấu ngoặc kép hoặc có gạch đầu dòng).
- Grep: `anh `, `em `, ` tôi `, `mình ` trong thoại.
- Nếu tìm thấy mà không có chỉ định riêng trong glossary → **pronoun violation**.

#### Check 3: Third Person "mình" (hard)
- Grep: `mình`, `của mình` trong phần TRẦN THUẬT (ngoài thoại).
- Nếu tìm thấy → **third_person_minh violation**.

#### Check 4: Blacklist Phrases (hard)
- Đọc blacklist từ SKILL.md rules.
- Grep từng cụm cấm trong content dịch.
- Nếu tìm thấy → **blacklist violation**.

#### Check 5: Known Failure Patterns (hard + soft)
- Đọc file `.agent/knowledge/translation-qa-memory.json` (seed tĩnh).
- Nếu có runtime file ở `AppData/.raiden/bridge-meta/translation-qa-memory.json` thì merge overlay.
- Grep từng `grepPatterns` trong content dịch theo `scope`.
- Ghi finding theo severity của pattern.

#### Check 6: Convert Smell (soft — chỉ ghi, không fix)
- Câu cụt mở đầu không chủ ngữ mà đọc lên gượng.
- Collocation máy (VD: "công việc độ khó cao").
- Lặp ý, lặp từ sát nhau.
- Cụm tâm lý literal (VD: "trong lòng nảy sinh cảnh giác").

---

### 5B. Findings — Ghi QA Report

Build object QA trong memory, ghi **1 lần** vào file `qa_{jobId}.json` (cùng thư mục bridge).

**KHÔNG update incremental.** Scan hết → build object → ghi 1 file.

Mỗi finding PHẢI có evidence:
- `span`: cụm text vi phạm (trích nguyên văn)
- `rule`: ID rule bị vi phạm (VD: `glossary_exact_match`)
- `fix`: đề xuất sửa (nếu high-confidence)
- `severity`: `hard` hoặc `soft`

#### Zero-issue phải earned

Nếu chương có 0 findings, QA entry VẪN PHẢI có `checks` object chứng minh đã quét:

```json
{
  "order": 26,
  "checks": {
    "glossaryExact": true,
    "dialoguePronouns": true,
    "blacklistScan": true,
    "knownFailures": true,
    "convertSmell": true
  },
  "findings": [],
  "appliedFixCount": 0,
  "remainingHardFindings": 0
}
```

Không có `checks` → 0 findings vô giá trị.

#### Full QA file format:

```json
{
  "jobId": "cd862374",
  "scannedAt": "2026-03-10T17:00:00Z",
  "chapters": [
    {
      "order": 26,
      "checks": {
        "glossaryExact": true,
        "dialoguePronouns": true,
        "blacklistScan": true,
        "knownFailures": true,
        "convertSmell": true
      },
      "findings": [
        {
          "severity": "hard",
          "rule": "glossary_exact_match",
          "span": "Lệ tỷ",
          "fix": "Lệ Tỷ"
        },
        {
          "severity": "soft",
          "rule": "convert_psychology_phrase",
          "span": "trong lòng nảy sinh cảnh giác",
          "fix": null
        }
      ],
      "appliedFixCount": 0,
      "remainingHardFindings": 1
    }
  ]
}
```

---

### 5C. Final Report & Recommendation

> ⚠️ **QA chỉ GHI findings.** KHÔNG sửa trực tiếp vào file outbox.
> App sẽ dựa vào `qa_{jobId}.json` để tự động apply hard fixes khi import vào DB.

1. Tổng hợp tất cả findings từ bước 5A.
2. Với mỗi hard finding, đảm bảo `fix` là một cụm từ thay thế chính xác và an toàn.
3. Đảm bảo `appliedFixCount` được set về `0` (vì agent không apply), nhưng `remainingHardFindings` phản ánh đúng số lỗi cần app xử lý.

---

### 5D. Verify & Done

Trước khi ghi file `done`, hãy tự kiểm tra lại (self-reflect):
1. **Consistency**: Đã check glossary cho TẤT CẢ các chương chưa?
2. **Safety**: Các đề xuất sửa (`fix`) có làm hỏng ngữ pháp xung quanh không?
3. **Completeness**: File `qa_{jobId}.json` đã có đủ mục `chapters` cho mọi chương trong job chưa?

Sau khi tự tin, ghi file `done_{jobId}.json` để báo hiệu App có thể bắt đầu auto-import.

## 6. Thông báo hoàn thành

> Chỉ output đúng 1 lần khi toàn bộ task đã xong.

Chat chỉ hiện:
```text
✅ Xong X/X chương -> App bấm Import!
```

## 7. Ghi done sentinel

> SAU KHI ghi hết tất cả outbox VÀ pass Self-QA, ghi file done để app biết đã xong.
> App sẽ tự poll file này và tự động import.

```text
File: done_{jobId}.json
Dùng write_to_file, cùng thư mục bridge.
```

Format JSON:
```json
{
  "jobId": "cd862374",
  "completedAt": "2026-03-06T21:10:00Z",
  "totalChapters": 5,
  "completedChapters": [41, 42, 43, 44, 45]
}
```

Lưu ý:
- `completedChapters` = danh sách `order` đã ghi thành công (không phải DB id).
- `totalChapters` = số chương thực tế đã ghi (có thể nhỏ hơn inbox nếu có lỗi).

## Output rules

- Nội dung dịch ghi thẳng vào file, không print ra chat.
- Không báo từng batch.
- Không hỏi giữa chừng.
- Không thông báo tiến độ.
- Chạy một mạch từ đầu tới cuối, chỉ output kết quả cuối cùng.

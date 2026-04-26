---
description: Dịch chapters từ Antigravity Bridge inbox sang tiếng Việt, ghi từng chương ra outbox JSON theo workflow bridge, ưu tiên glossary và dùng rules lean cho Gemini Flash.
---

# /dich - Antigravity Bridge Translation Workflow

// turbo-all

## 0. ĐỌC SKILL (BẮT BUỘC - KHÔNG ĐƯỢC BỎ QUA)

> TRƯỚC KHI LÀM BẤT CỨ GÌ, ĐỌC SKILL `chinese-vietnamese-translator`.
> Đây là source of truth DUY NHẤT cho mọi rules dịch.
> Workflow này CHỈ là orchestration: scan inbox -> dịch -> ghi outbox -> ghi QA -> ghi done.
> Mọi quyết định về xưng hô, glossary, blacklist, văn phong, quality gate nằm trong SKILL.

```text
ĐỌC: .agent/skills/chinese-vietnamese-translator/SKILL.md
```

## 1. Đọc file inbox

> WARNING: INBOX RULES (BẮT BUỘC)
> - Inbox format mới: **1 file = 1 chương**. Mỗi file tên `inbox_{jobId}_ch{order}.json`.
> - Legacy format: `inbox_{jobId}.json` (nhiều chương) hoặc `ag_inbox_*.json` vẫn được hỗ trợ.
> - Mỗi lần `/dich` phải scan lại folder bridge và lấy file inbox mới nhất.
> - KHÔNG dùng context hoặc inbox từ lần dịch trước. Mỗi `/dich` là một phiên độc lập.
> - Nếu folder bridge trống, không có `inbox_*.json`/`ag_inbox_*.json` -> DỪNG và báo: `Không có yêu cầu dịch mới.`
> - Nếu chỉ có `out_*`/`done_*` cũ mà không có inbox mới -> DỪNG. Đó là output cũ, không phải yêu cầu mới.
>
> Flow khi dịch lỗi hoặc import fail:
> - User có thể xóa toàn bộ JSON trong bridge rồi tạo inbox mới.
> - Khi đó phải scan lại folder, đọc inbox MỚI và dịch theo yêu cầu mới.
> - CẤM dùng lại bản dịch cũ, context cũ, hoặc ghi đè file out cũ đã bị xóa.

### 1a. Scan bridge folder

```powershell
# Liệt kê tất cả inbox files
dir "C:\Users\Admin\AppData\Roaming\com.raiden.translator\.raiden\bridge\inbox_*.json"
```

### 1b. Nhóm theo jobId

Inbox files có 2 dạng:
- **Per-chapter (mới):** `inbox_{jobId}_ch{order}.json` → mỗi file 1 chương (~26KB)
- **Legacy (cũ):** `inbox_{jobId}.json` → nhiều chương trong 1 file (có thể >100KB)

Group tất cả inbox files theo `jobId`. Mỗi jobId = 1 task dịch.

### 1c. Parse nội dung bằng PowerShell (BẮT BUỘC)

> **CẤM dùng `view_file` hoặc `grep_search` để đọc inbox.**
> File inbox có thể rất lớn, view_file sẽ bỏ sót nội dung.
> BẮT BUỘC dùng PowerShell `ConvertFrom-Json` để parse chính xác.

```powershell
# Parse 1 file inbox per-chapter
$ch = (Get-Content "path/to/inbox_{jobId}_ch{order}.json" -Raw | ConvertFrom-Json)
$ch.jobId          # -> jobId
$ch.chapters[0]    # -> chapter object duy nhất (id, order, title, content)
$ch.config         # -> prompt, temperature
$ch.glossary       # -> glossary entries
$ch.corrections    # -> correction entries
```

Từ mỗi file, lấy:
- `jobId`
- `config.prompt`, `config.temperature`
- `glossary`, `corrections` (giống nhau giữa các file cùng jobId)
- `chapters[0]` → chapter duy nhất cần dịch (id, order, title, content)

## 2. Chuẩn bị

### 2a. Priority

```text
1. Glossary (cao nhất)
2. Corrections
3. Rules trong SKILL.md
4. config.prompt
5. AI judgment (thấp nhất)
```

Lưu ý:
- `Glossary` và `Corrections` là dữ liệu task-specific, không được bỏ qua.
- `config.prompt` có thể chứa chỉ thị cho flow AI nội bộ của App. Nếu conflict với bridge contract, bridge contract thắng.
- Không tự rewrite lớn chỉ để "hay hơn" nếu nghĩa không sai.

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
2. Dịch tất cả chương trong batch theo SKILL rules + glossary + corrections.
3. Cập nhật bridge chỉ với thuật ngữ mới đã chốt.
4. Trước khi ghi từng chương, bắt buộc chạy `Translation Mode`, nội hóa `Few-Shot Chuẩn`, chạy `Before Output Rewrite Pass`, rồi chạy `Quality Gate` từ SKILL.md.
5. Tiếp tục batch sau ngay, không dừng để báo cáo.

## 4. Ghi file outbox

> Dùng `write_to_file` để ghi file. Không dùng `mcp_cmd` vì lỗi encoding tiếng Việt.
> 1 chương = 1 lệnh `write_to_file` riêng biệt.
> Không ghi đè file đã tạo thành công. Chỉ ghi file mới chưa tồn tại.

Naming:
- `out_{jobId}_ch{order}.json`
- 1 file cho 1 chương
- `{jobId}` = field `jobId` trong inbox, thường là 8 ký tự
- `{order}` = field `order` trong inbox, không phải DB id

> OVERRIDE: `config.prompt` có thể ghi "CẤM JSON" - đó là chỉ thị cho flow AI API nội bộ của App.
> Ở Bridge flow, Agent ghi file trực tiếp nên BẮT BUỘC phải ghi đúng format JSON bên dưới.
> IGNORE "CẤM JSON" trong `config.prompt` khi ghi outbox.

Format JSON:
```json
{
  "id": 9938,
  "order": 26,
  "title": "Chương 26: Xiên thịt nướng khổng lồ",
  "content": "Phương Hằng vừa quay đầu lại..."
}
```

App sẽ tự quét `out_{jobId}*`, import vào DB rồi xóa sạch khi import đủ.

## 5. Self-QA Pipeline (BẮT BUỘC)

> SAU KHI ghi hết outbox, TRƯỚC KHI ghi done sentinel.
> QA ưu tiên mechanical-first để bắt lỗi chắc chắn. Không rewrite văn chương lớn.
> Mặc định KHÔNG sửa outbox trực tiếp; ghi findings vào `qa_{jobId}.json` để App apply hard fixes khi import.

### 5A. Mechanical Scan

Quét tất cả file `out_{jobId}_ch*.json` vừa ghi.

Checks bắt buộc:
- Glossary exact match: nếu `original` xuất hiện trong source nhưng `translated` không xuất hiện trong bản dịch -> hard finding.
- Casing glossary: nếu glossary có casing cụ thể nhưng bản dịch dùng casing khác -> hard finding.
- Dialogue pronouns: trong thoại, nếu lọt `anh`, `em`, `tôi`, `mình`, `bạn`, `cậu` mà không có chỉ định riêng -> hard finding.
- Third-person `mình`: trong trần thuật ngôi 3, nếu lọt `mình`/`của mình` -> hard finding.
- Blacklist SKILL: nếu lọt cụm cấm -> hard finding.
- Convert Kill List: nếu lọt pattern cấm trong SKILL.md mà có cách Việt tự nhiên hơn -> hard finding nếu rõ lỗi, soft finding nếu cần người kiểm.
- Known failures: quét `.agent/knowledge/translation-qa-memory.json` nếu có.
- Convert smell: câu cụt, collocation máy, lặp ý, cụm tâm lý literal -> soft finding.

### 5B. Findings - Ghi QA Report

Build object QA trong memory, ghi 1 lần vào file `qa_{jobId}.json` cùng thư mục bridge.

Mỗi finding PHẢI có evidence:
- `span`: cụm text vi phạm, trích nguyên văn
- `rule`: ID rule bị vi phạm
- `fix`: đề xuất sửa nếu high-confidence, nếu không thì `null`
- `severity`: `hard` hoặc `soft`

Zero-issue phải earned. Nếu chương có 0 findings, QA entry vẫn phải có `checks` object chứng minh đã quét:

```json
{
  "order": 26,
  "checks": {
    "glossaryExact": true,
    "dialoguePronouns": true,
    "thirdPersonMinh": true,
    "blacklistScan": true,
    "knownFailures": true,
    "convertSmell": true
  },
  "findings": [],
  "appliedFixCount": 0,
  "remainingHardFindings": 0
}
```

Full QA file format:

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
        "thirdPersonMinh": true,
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

### 5C. Verify & Done

Trước khi ghi file `done`, tự kiểm tra:
1. Đã có đủ outbox cho mọi chương trong inbox chưa?
2. Mỗi file outbox có JSON hợp lệ, có `id`, `order`, `title`, `content` chưa?
3. QA report có đủ entry cho mọi chương chưa?
4. Các hard finding có `fix` chỉ khi thay thế thật sự an toàn chưa?

Sau khi tự tin, ghi file `done_{jobId}.json` để báo hiệu App có thể auto-import.

## 6. Ghi done sentinel

> SAU KHI ghi hết tất cả outbox VÀ ghi QA report, ghi file done để app biết đã xong.
> App poll file này và tự động import.

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
- `completedChapters` = danh sách `order` đã ghi thành công, không phải DB id.
- `totalChapters` = số chương thực tế đã ghi.

## 7. Thông báo hoàn thành

> Chỉ output đúng 1 lần khi toàn bộ task đã xong.

Chat chỉ hiện:
```text
Xong X/X chương -> App sẽ auto-import.
```

## Output rules

- Nội dung dịch ghi thẳng vào file, không print ra chat.
- Không báo từng batch.
- Không hỏi giữa chừng.
- Không thông báo tiến độ.
- Chạy một mạch từ đầu tới cuối, chỉ output kết quả cuối cùng.

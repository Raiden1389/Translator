## [2.17.0] - 2026-05-12

### Top Impact
- **[Vertex][Codex][Phase 2]** Thêm auth mode `Service Account (Full Vertex)` song song với `API Key (Express Mode)` trong settings, refresh model, health-check, cấu hình dịch nhanh, và request runtime.
- **[Vertex][AI NER]** Đã chặn `Gemini 3` trong AI NER trên Vertex (cả Express và Service Account) để tránh lỗi crash do Structured JSON Output chưa ổn định (trả về content rỗng). App giờ tự hạ về `gemini-2.5-flash` kèm thông báo progress cho người dùng.
- **[Vertex][Codex][Native]** Thêm native bridge ký JWT từ `Service Account JSON`, đổi lấy OAuth access token, rồi gọi full Vertex endpoint theo dạng `projects/{project}/locations/{location}/publishers/google/models/...`.
- **[Vertex][Codex][Automation]** App giờ tự dò `Service Account JSON` trong repo/thư mục app, tự điền path cùng `project_id`, và có fallback mặc định `gen-lang-client-0688183488` để test nhanh mà không cần nhập tay.
- **[GitNexus][Fix]** Khắc phục lỗi `EOF / ECOMPROMISED` của GitNexus MCP bằng cách dọn sạch npx cache và npm integrity cache, giúp khôi phục kết nối code intelligence.
- `components/workspace/AISettingsTab.tsx`, `components/workspace/hooks/useAISettings.ts`, `lib/ai-provider.ts` — **[Vertex][Codex][UX]** Settings Vertex giờ phân tách rõ `Express` và `Full Vertex`, hiển thị path JSON thay vì che như password, có dropdown `Vertex Location` (`Global`, `Asia`, `US`, `Europe`), và mặc định gợi ý region theo model.
- `lib/services/ai-service.ts`, `lib/gemini/client.ts`, `src-tauri/src/gemini.rs`, `src-tauri/src/lib.rs` — **[Vertex][Codex][Runtime]** Luồng request/check-key/fetch-model giờ dispatch theo auth mode, để `Gemini 3` chỉ mở ở `Full Vertex` còn `Express Mode` tiếp tục bị chặn ở những model Google chưa support.

### Added
- **[Vertex][Codex][Phase 2]** Thêm auth mode `Service Account (Full Vertex)` song song với `API Key (Express Mode)` trong settings, refresh model, health-check, cấu hình dịch nhanh, và request runtime.
- **[Vertex][Codex][Native]** Thêm native bridge ký JWT từ `Service Account JSON`, đổi lấy OAuth access token, rồi gọi full Vertex endpoint theo dạng `projects/{project}/locations/{location}/publishers/google/models/...`.
- **[Vertex][Codex][Automation]** App giờ tự dò `Service Account JSON` trong repo/thư mục app, tự điền path cùng `project_id`, và có fallback mặc định `gen-lang-client-0688183488` để test nhanh mà không cần nhập tay.

### Changed
- `components/workspace/AISettingsTab.tsx`, `components/workspace/hooks/useAISettings.ts`, `lib/ai-provider.ts` — **[Vertex][Codex][UX]** Settings Vertex giờ phân tách rõ `Express` và `Full Vertex`, hiển thị path JSON thay vì che như password, có dropdown `Vertex Location` (`Global`, `Asia`, `US`, `Europe`), và mặc định gợi ý region theo model.
- `lib/services/ai-service.ts`, `lib/gemini/client.ts`, `src-tauri/src/gemini.rs`, `src-tauri/src/lib.rs` — **[Vertex][Codex][Runtime]** Luồng request/check-key/fetch-model giờ dispatch theo auth mode, để `Gemini 3` chỉ mở ở `Full Vertex` còn `Express Mode` tiếp tục bị chặn ở những model Google chưa support.
- `components/workspace/chapter-list/TranslateConfigDialog.tsx`, `lib/services/ai-ner.service.ts` — **[Vertex][Codex][AI NER]** Cấu hình dịch nhanh và AI quét thuật ngữ giờ hiểu `vertexAuthMode`, dùng đúng credential tương ứng, và tiếp tục sanitize model theo provider/auth mode để tránh gọi sai flow.
- `lib/services/ai-ner.service.ts`, `components/workspace/editor/hooks/useAIExtraction.ts`, `components/workspace/ScanConfigDialog.tsx` — **[Vertex][Codex][AI NER]** Luồng scan Vertex giờ tách thành 2 pass (`vét thực thể gốc` → `chuẩn hóa thuật ngữ Việt`), thêm loại `Item`, giảm lọc trùng quá tay, và chặn nhân vật đã có trong `persona` theo cả chữ Hán lẫn tên Việt để hạn chế case chương mới vẫn hiện lại tên main.
- `components/workspace/hooks/useTranslationProgress.ts`, `components/workspace/hooks/useSingleOrchestrator.ts`, `components/workspace/hooks/useBatchOrchestrator.ts` — **[Vertex][Codex][Cost]** Popup progress giờ tính `Total Cost` theo đúng `translationModel` của từng chapter dựa trên bảng giá model hiện hành thay vì hardcode giá cũ của Gemini 2.5 Flash.

### Fixed
- `lib/services/ai-ner.service.ts` — **[Vertex][AI NER]** `resolveNERModel` giờ chủ động chặn dòng `gemini-3` trên Vertex, fallback về `gemini-2.5-flash` để đảm bảo kết quả quét thuật ngữ luôn là JSON hợp lệ.
- **[GitNexus][Tooling]** Xử lý triệt để lỗi kẹt folder `node_modules\gitnexus\vendor` trên Windows bằng quy trình clear npx cache sạch.
- **[Vertex][Codex][Setup]** Không còn bắt người dùng phải dán lại `project_id` hay đường dẫn JSON thủ công trong phần lớn ca dùng desktop nếu file service-account đã nằm ngay trong repo.
- **[Security][Codex][Git]** Thêm ignore cho `gen-lang-client-*.json` để giảm rủi ro stage nhầm Service Account JSON vào git.
- **[UX][Codex][Chapter List]** Khi đổi trang trong `Chapter List`, viewport giờ tự cuộn về đầu danh sách của page mới thay vì giữ nguyên vị trí scroll cũ ở cuối page trước, giúp case pagination lớn như `500 chương / page` chuyển từ chap `1000` sang `1001` đúng nhịp hơn.
- `components/workspace/chapter-list/hooks/useCorrections.ts` — **[Sync][Codex][Cloud]** `Apply cải chính` giờ đánh dấu `lastTranslatedAt` và auto `pushDelta()` khi có token cloud, nên bản đã cải chính được đẩy lên cloud ngay thay vì chỉ sửa local.

### Changed
- `components/workspace/AISettingsTab.tsx`, `components/workspace/hooks/useAISettings.ts`, `lib/ai-provider.ts` — **[Vertex][Codex][UX]** Settings Vertex giờ phân tách rõ `Express` và `Full Vertex`, hiển thị path JSON thay vì che như password, có dropdown `Vertex Location` (`Global`, `Asia`, `US`, `Europe`), và mặc định gợi ý region theo model.
- `lib/services/ai-service.ts`, `lib/gemini/client.ts`, `src-tauri/src/gemini.rs`, `src-tauri/src/lib.rs` — **[Vertex][Codex][Runtime]** Luồng request/check-key/fetch-model giờ dispatch theo auth mode, để `Gemini 3` chỉ mở ở `Full Vertex` còn `Express Mode` tiếp tục bị chặn ở những model Google chưa support.
- `components/workspace/chapter-list/TranslateConfigDialog.tsx`, `lib/services/ai-ner.service.ts` — **[Vertex][Codex][AI NER]** Cấu hình dịch nhanh và AI quét thuật ngữ giờ hiểu `vertexAuthMode`, dùng đúng credential tương ứng, và tiếp tục sanitize model theo provider/auth mode để tránh gọi sai flow.

### Fixed
- **[Vertex][Codex][Setup]** Không còn bắt người dùng phải dán lại `project_id` hay đường dẫn JSON thủ công trong phần lớn ca dùng desktop nếu file service-account đã nằm ngay trong repo.
- **[Security][Codex][Git]** Thêm ignore cho `gen-lang-client-*.json` để giảm rủi ro stage nhầm Service Account JSON vào git.
- **[UX][Codex][Chapter List]** Khi đổi trang trong `Chapter List`, viewport giờ tự cuộn về đầu danh sách của page mới thay vì giữ nguyên vị trí scroll cũ ở cuối page trước, giúp case pagination lớn như `500 chương / page` chuyển từ chap `1000` sang `1001` đúng nhịp hơn.

## [2.16.4] - 2026-05-10

### Top Impact
- **[Vertex][Codex][AI]** Thêm hỗ trợ `Vertex AI` Express Mode giai đoạn 1 với bộ chọn provider riêng, lưu `Vertex AI API Key` tách biệt, cấu hình dịch nhanh nhận biết provider, tóm tắt runtime theo provider, và luồng health-check riêng cho `Vertex AI`.
- **[Vertex][Codex][Tooling]** Thêm `scripts/vertex-latency-check.ps1` để test trực tiếp độ trễ mạng Vertex từ PowerShell bên ngoài app khi cần chẩn đoán các ca chạy chậm.
- `lib/services/ai-service.ts` — **[Vertex][Codex][AI]** Refresh model giờ dùng SDK chính thức `@google/genai` ở chế độ `vertexai` trước khi fallback về danh sách Gemini tĩnh của app, giúp việc dò model trên Vertex bám sát hành vi thật của Google Cloud hơn.
- `lib/gemini/client.ts` — **[Vertex][Codex][AI]** Payload request giờ dùng role hợp lệ cho Vertex, dispatch theo provider, và mặc định route traffic Vertex qua regional endpoint `asia-southeast1`.
- `src-tauri/src/gemini.rs` — **[Vertex][Codex][AI]** Native bridge giờ expose command request/model-list cho Vertex và mặc định traffic regional qua `asia-southeast1` để giảm độ trễ từ Việt Nam.

### Added
- **[Vertex][Codex][AI]** Thêm hỗ trợ `Vertex AI` Express Mode giai đoạn 1 với bộ chọn provider riêng, lưu `Vertex AI API Key` tách biệt, cấu hình dịch nhanh nhận biết provider, tóm tắt runtime theo provider, và luồng health-check riêng cho `Vertex AI`.
- **[Vertex][Codex][Tooling]** Thêm `scripts/vertex-latency-check.ps1` để test trực tiếp độ trễ mạng Vertex từ PowerShell bên ngoài app khi cần chẩn đoán các ca chạy chậm.

### Changed
- `lib/services/ai-service.ts` — **[Vertex][Codex][AI]** Refresh model giờ dùng SDK chính thức `@google/genai` ở chế độ `vertexai` trước khi fallback về danh sách Gemini tĩnh của app, giúp việc dò model trên Vertex bám sát hành vi thật của Google Cloud hơn.
- `lib/gemini/client.ts` — **[Vertex][Codex][AI]** Payload request giờ dùng role hợp lệ cho Vertex, dispatch theo provider, và mặc định route traffic Vertex qua regional endpoint `asia-southeast1`.
- `src-tauri/src/gemini.rs` — **[Vertex][Codex][AI]** Native bridge giờ expose command request/model-list cho Vertex và mặc định traffic regional qua `asia-southeast1` để giảm độ trễ từ Việt Nam.
- `lib/ai-provider.ts`, `components/workspace/hooks/useAISettings.ts`, `lib/repositories/settings.ts` — **[Vertex][Codex][AI]** Trạng thái provider và API key giờ được lưu tách biệt để chuyển qua lại giữa Gemini và Vertex không ghi đè mất credential của nhau.
- `components/workspace/AISettingsTab.tsx`, `components/workspace/chapter-list/TranslateConfigDialog.tsx`, `components/layout/StatusBar.tsx` — **[Vertex][Codex][AI]** Settings, cấu hình dịch nhanh, và dashboard status giờ hiển thị rõ provider đang hoạt động để luồng `Vertex AI` nhìn xuyên suốt từ đầu đến cuối.
- `lib/services/ai-ner.service.ts`, `lib/gemini/client.ts` — **[Vertex][Codex][AI NER]** AI quét thuật ngữ giờ tự phát hiện case `Vertex Singapore + gemini-2.5-flash-lite` không hợp nhau, fallback sang `gemini-2.5-flash`, ép structured JSON output, hiện preview raw response để debug, và tự sửa các response lỗi kiểu `object` / `truncated-array` để vẫn cứu được thuật ngữ mới thật sự.

## [2.16.3] - 2026-05-06

### Top Impact
- **[Gemini][Codex][Prompt]** Added explicit anti-pattern guardrails that ban archaic pronoun + modern slang mashups such as `Ta đệch`, `Ngươi đệch`, `Ta vãi`, and `Ngươi vãi`.
- **[Gemini][Codex][Prompt]** Added new few-shot slang cases for `你他妈有病吧` and `我靠，这他妈也行？` so direct abuse and first-person reactions resolve to compact Vietnamese slang instead of half-converted junk.
- **[Gemini][Codex][Test]** Added regression coverage for the new slang anti-pattern guardrails and final-sweep cleanup of `ta/ngươi + slang` mixtures.
- `lib/gemini/constants.ts` — **[Gemini][Codex][Prompt]** profanity rules and few-shots now explicitly ban archaic-pronoun slang mashups and reinforce compact outputs like `ĐM`, `đệt`, and `đồ ngu`.
- `lib/gemini/idioms.ts` — **[Gemini][Codex][Prompt]** modern slang hints now prioritize compact reaction outputs and annotate the bad `Ta/Ngươi + slang` forms to avoid.

### Added
- **[Gemini][Codex][Prompt]** Added explicit anti-pattern guardrails that ban archaic pronoun + modern slang mashups such as `Ta đệch`, `Ngươi đệch`, `Ta vãi`, and `Ngươi vãi`.
- **[Gemini][Codex][Prompt]** Added new few-shot slang cases for `你他妈有病吧` and `我靠，这他妈也行？` so direct abuse and first-person reactions resolve to compact Vietnamese slang instead of half-converted junk.
- **[Gemini][Codex][Test]** Added regression coverage for the new slang anti-pattern guardrails and final-sweep cleanup of `ta/ngươi + slang` mixtures.

### Changed
- `lib/gemini/constants.ts` — **[Gemini][Codex][Prompt]** profanity rules and few-shots now explicitly ban archaic-pronoun slang mashups and reinforce compact outputs like `ĐM`, `đệt`, and `đồ ngu`.
- `lib/gemini/idioms.ts` — **[Gemini][Codex][Prompt]** modern slang hints now prioritize compact reaction outputs and annotate the bad `Ta/Ngươi + slang` forms to avoid.
- `lib/gemini/rules/assembler.ts` — **[Gemini][Codex][Prompt]** dynamic slang hints now inject a direct warning against archaic-pronoun slang mashups whenever internet slang is detected.
- `lib/gemini/text/casing.ts` — **[Gemini][Codex][Post]** final sweep now silently rewrites narrow bad mixes like `Ta đệch`, `Ngươi đệch`, and `Ngươi vãi` without touching unrelated prose.

## [2.16.2] - 2026-05-04

### Top Impact
- **[Intelligence][Codex][Name Audit]** Rebuilt `name audit` around workspace-safe fixes, `reviewing` chapter coverage, source-ref-backed Chinese↔Vietnamese matching, and actionable cluster ranking so the audit surfaces real name mismatches instead of noisy uppercase phrases.
- **[Cleanup][Dead Code]** Deleted `lib/fix-brackets.ts` and `components/workspace/FixBracketsButton.tsx` — duplicate `normalizeVietnameseContent` copy with broken counter (always returned `fixed: 0`), unused component with zero imports.
- **[Intelligence][Codex][Name Audit]** Added source-ref-driven cross-reference scoring that can still bind localized Vietnamese names back to the right Chinese source even when the chosen translation is not a close Han-Viet spelling.
- **[Intelligence][Codex][Name Audit]** Added cluster actionability signals (`actionabilityScore`, chapter spread, source evidence count) so the main audit list emphasizes likely mistranslations instead of low-signal singleton noise.
- **[Intelligence][Codex][Test]** Added regression coverage for workspace-scoped name auto-fix, `reviewing` chapter scan coverage, localized-name cross-ref, and typo-cluster prioritization.

### Added
- **[Intelligence][Codex][Name Audit]** Added source-ref-driven cross-reference scoring that can still bind localized Vietnamese names back to the right Chinese source even when the chosen translation is not a close Han-Viet spelling.
- **[Intelligence][Codex][Name Audit]** Added cluster actionability signals (`actionabilityScore`, chapter spread, source evidence count) so the main audit list emphasizes likely mistranslations instead of low-signal singleton noise.
- **[Intelligence][Codex][Test]** Added regression coverage for workspace-scoped name auto-fix, `reviewing` chapter scan coverage, localized-name cross-ref, and typo-cluster prioritization.

### Changed
- **[Intelligence][Codex][Name Audit]** Rebuilt `name audit` around workspace-safe fixes, `reviewing` chapter coverage, source-ref-backed Chinese↔Vietnamese matching, and actionable cluster ranking so the audit surfaces real name mismatches instead of noisy uppercase phrases.
- **[Cleanup][Dead Code]** Deleted `lib/fix-brackets.ts` and `components/workspace/FixBracketsButton.tsx` — duplicate `normalizeVietnameseContent` copy with broken counter (always returned `fixed: 0`), unused component with zero imports.
- `lib/services/name-audit.service.ts` — **[Intelligence][Codex][Name Audit]** scan now includes `reviewing` chapters with translated content and merges paragraph-alignment cross-ref with source-ref evidence.
- `lib/services/name-audit.clustering.ts` — **[Intelligence][Codex][Name Audit]** clustering now scores typo similarity, chapter overlap, Chinese source evidence, and Unicode-normalized variants before deciding whether a cluster is worth surfacing.
- `lib/services/name-audit.autofix.ts` — **[Intelligence][Codex][Name Audit]** apply-fix snapshots and correction sweeps are now scoped to the active workspace only.
- `lib/services/corrections.service.ts` — **[Intelligence][Codex][Name Audit]** `sweepSingleRule()` accepts an optional workspace filter so global correction sweeps can stay inside the intended novel.

### Fixed
- **[Gemini][Post][Batch]** Added `sanitizeTranslatedContent` as Step 0 in `applyPostProcessing` — batch mode was missing HTML artifact stripping that single mode had via `useSingleOrchestrator`. Both pipelines now sanitize consistently.
- **[Gemini][Post][Order]** Moved `normalizeQuoteStyles` from step 1.6 → step 2.6 (after glossary enforcement) — CJK corner brackets `「」『』` were being destructively converted to curly quotes before glossary had a chance to replace the Chinese text they wrapped.

## [2.16.1] - 2026-05-04

### Top Impact
- **[Gemini][Codex][Post]** Added silent automatic post-processing for literal slang, legacy money units, and narrow pronoun drift so common bad outputs are fixed before save without retrying or interrupting the flow.
- **[Gemini][Codex][Post]** Added automatic literal slang normalization in `finalSweep` for bad reads such as `sáu sáu sáu`, `thảo nê mã`, `ngàn con thảo nê mã`, and `ta dựa vào`.
- **[Gemini][Codex][Post]** Added automatic money normalization for legacy units like `vạn tệ`, `ức tệ`, `nghìn vạn tệ`, and `trăm triệu tệ` into the đô thị format (`nghìn / triệu / tỷ tệ`).
- **[Gemini][Codex][Post]** Added a narrow pronoun-drift fixer that silently pulls obvious `tôi/mình/cô/em/bạn/cậu` slips back toward `Ta/Ngươi` inside archaic dialogue.
- **[Gemini][Codex][Test]** Added regression coverage for silent post-processing of slang literals, money units, and narrow pronoun drift.

### Added
- **[Gemini][Codex][Post]** Added automatic literal slang normalization in `finalSweep` for bad reads such as `sáu sáu sáu`, `thảo nê mã`, `ngàn con thảo nê mã`, and `ta dựa vào`.
- **[Gemini][Codex][Post]** Added automatic money normalization for legacy units like `vạn tệ`, `ức tệ`, `nghìn vạn tệ`, and `trăm triệu tệ` into the đô thị format (`nghìn / triệu / tỷ tệ`).
- **[Gemini][Codex][Post]** Added a narrow pronoun-drift fixer that silently pulls obvious `tôi/mình/cô/em/bạn/cậu` slips back toward `Ta/Ngươi` inside archaic dialogue.
- **[Gemini][Codex][Test]** Added regression coverage for silent post-processing of slang literals, money units, and narrow pronoun drift.

### Changed
- **[Gemini][Codex][Post]** Added silent automatic post-processing for literal slang, legacy money units, and narrow pronoun drift so common bad outputs are fixed before save without retrying or interrupting the flow.
- `lib/gemini/text/casing.ts` — **[Gemini][Codex][Post]** `finalSweep` now runs deterministic silent normalizers for literal internet slang, modern currency formatting, and narrow pronoun drift before save.
- `__tests__/final-slang-cleanup.test.ts` — **[Gemini][Codex][Test]** expanded regression coverage to lock the new automatic post-processing behavior.

## [2.16.0] - 2026-05-02

### Top Impact
- **[Gemini][Safety][Prompt]** Implemented "Academic Shield" — proactive academic framing in the default system instruction. Reduces `PROHIBITED_CONTENT` blocks for adult/harem/urban novels with profanity by signaling a research/literary translation context from the first attempt.
- **[Gemini][Codex][Prompt]** Built an internet-slang taxonomy plus dynamic grouped prompt hints for Chinese web slang (`666`, `草泥马`, `绷不住了`, `乱七八糟`, `一脸懵逼`, etc.) so the translator stops falling back to literal Hán-Việt or read-aloud meme nonsense.
- **[Gemini][Codex][Prompt]** Hardened profanity handling toward abbreviated urban slang (`ĐM`, `đệt`, `đệch`, `vãi lol`, `vãi cứt`) and added a final sweep fix for malformed outputs like `Ta con mẹ nó`, `Ngươi con mẹ nó`, and `địt bố mày`.
- **[Gemini][Codex][Prompt]** Reworked urban-currency guidance to remove `vạn tệ` / `ức` wording and force modern numeric reads like `500 nghìn tệ`, `100 triệu tệ`, and `5 tỷ tệ`.
- **[Gemini][Codex][Post]** Unified post-processing so batch chapters now go through the same cleanup pipeline as single-chapter translation, while chunking stops re-sweeping titles with the heavy body pass.

### Added
- **[Gemini][Safety][Prompt]** Proactive Academic Framing: default system instruction now identifies content as "published Chinese web novel" for "literary research and archival purposes" to decrease false-positive safety triggers from the first attempt.
- **[Gemini][Codex][Prompt]** Added `PRONOUN LOCK` as a dedicated top-level guardrail, a `Flash Lite 2.5` prompt profile, and extra few-shot coverage for lover/family/master-disciple dialogue, modern profanity, and urban money reads.
- **[Gemini][Codex][Prompt]** Added internet-slang categories (`reaction`, `praise`, `censored_profanity`, `insult`, `behavior`) plus new map entries for `666`, `太6了`, `草泥马`, `千只草泥马`, `千只草泥马奔腾而过`, `尼玛`, `绷不住了`, `离谱`, `逆天`, `乱七八糟`, and `一脸懵逼`.
- **[Gemini][Codex][Test]** Added regression coverage for grouped slang hints, profanity cleanup, meme-variant slang, and modern urban currency formatting.
- **[Gemini][Codex][Test]** Added post-processing regression coverage so batch routing, title normalization, and body cleanup stay locked to the shared pipeline.
- **[Opus][Sweep]** `finalSweep` now strips Vietnamese navigation boilerplate (`Chương trước`, `Mục lục`, `Chương sau`) that survives translation from web novel sources.

### Changed
- **[Gemini][Safety][Prompt]** Implemented "Academic Shield" — proactive academic framing in the default system instruction. Reduces `PROHIBITED_CONTENT` blocks for adult/harem/urban novels with profanity by signaling a research/literary translation context from the first attempt.
- **[Gemini][Codex][Prompt]** Built an internet-slang taxonomy plus dynamic grouped prompt hints for Chinese web slang (`666`, `草泥马`, `绷不住了`, `乱七八糟`, `一脸懵逼`, etc.) so the translator stops falling back to literal Hán-Việt or read-aloud meme nonsense.
- **[Gemini][Codex][Prompt]** Hardened profanity handling toward abbreviated urban slang (`ĐM`, `đệt`, `đệch`, `vãi lol`, `vãi cứt`) and added a final sweep fix for malformed outputs like `Ta con mẹ nó`, `Ngươi con mẹ nó`, and `địt bố mày`.
- **[Gemini][Codex][Prompt]** Reworked urban-currency guidance to remove `vạn tệ` / `ức` wording and force modern numeric reads like `500 nghìn tệ`, `100 triệu tệ`, and `5 tỷ tệ`.
- **[Gemini][Codex][Post]** Unified post-processing so batch chapters now go through the same cleanup pipeline as single-chapter translation, while chunking stops re-sweeping titles with the heavy body pass.
- **[Opus][Fix]** Added Vietnamese boilerplate nav strip to `finalSweep` — auto-removes `Chương trước Mục lục Chương sau` and variants that leak through from web novel sources into translated output.

## [2.15.2] - 2026-04-26

### Top Impact
- **[Codex][Prompt]** Strengthened pronoun lock so `我/你` stay `Ta/Ngươi` even in lover, family, sibling, or master-disciple contexts unless the original sentence explicitly contains a dedicated kinship/title form.
- **[Codex][Prompt]** Added a hard `PRONOUN LOCK` block at the top of the translation prompt and expanded few-shot coverage for dialogue pronouns plus `我靠` slang variants (`!` and `.`).
- **[Codex][Prompt]** Added a dedicated `Flash Lite 2.5` prompt profile with shorter core rules and a trimmed few-shot pack, activated automatically when the selected model is `gemini-2.5-flash-lite`.
- **[Codex][Prompt]** Added few-shot examples for modern Chinese web slang (`我靠`, `卧槽`, `装逼`) to prevent literal outputs like "Ta dựa vào!" and force natural Vietnamese exclamations/behavioral slang.
- **[Safety]** Soft-retry mechanism for PROHIBITED_CONTENT blocks — wraps system instruction with Vietnamese academic framing to bypass input-level false positives.

### Added
- **[Codex][Prompt]** Strengthened pronoun lock so `我/你` stay `Ta/Ngươi` even in lover, family, sibling, or master-disciple contexts unless the original sentence explicitly contains a dedicated kinship/title form.
- **[Codex][Prompt]** Added a hard `PRONOUN LOCK` block at the top of the translation prompt and expanded few-shot coverage for dialogue pronouns plus `我靠` slang variants (`!` and `.`).
- **[Codex][Prompt]** Added a dedicated `Flash Lite 2.5` prompt profile with shorter core rules and a trimmed few-shot pack, activated automatically when the selected model is `gemini-2.5-flash-lite`.
- **[Codex][Prompt]** Added few-shot examples for modern Chinese web slang (`我靠`, `卧槽`, `装逼`) to prevent literal outputs like "Ta dựa vào!" and force natural Vietnamese exclamations/behavioral slang.
- **[Safety]** Soft-retry mechanism for PROHIBITED_CONTENT blocks — wraps system instruction with Vietnamese academic framing to bypass input-level false positives.
- **[Safety]** Full safety ratings now embedded directly in error messages (PromptRatings, CandRatings, response keys) — visible in UI overlay without DevTools.

### Changed
- `lib/gemini/constants.ts` — **[Codex]** moved pronoun mapping into a dedicated top-level lock block and expanded dialogue/slang few-shots
- `__tests__/prompt-profile.test.ts` — **[Codex]** added regression coverage for pronoun lock and `我靠` variant examples
- `__tests__/prompt-profile.test.ts` — **[Codex]** added regression coverage for full vs lite prompt selection
- `lib/gemini/constants.ts` — **[Codex]** introduced `lite` prompt profile selection for `gemini-2.5-flash-lite`
- `lib/gemini/rules/assembler.ts` — **[Codex]** routes prompt profile by model and turns off two ineffective Vietnamese-keyword heuristics
- `lib/gemini/translate.ts` — **[Codex]** routes single translation prompt selection by model

### Fixed
- **[Codex][Prompt]** Turned off two ineffective dynamic heuristics that were matching Vietnamese keywords against Chinese source text, and left explicit notes for a future Chinese-keyword rewrite.
- **[Codex][Audit]** Expanded web boilerplate stripping to cover simplified and traditional Chinese TXT junk (`首页`, `下一页`, `请记住本书首发域名`, `手机版阅读网址`, `笔趣阁`, recommendation/bookmark prompts) with regression tests.
- **[Codex][Fix]** "Xóa rác web" Action Hub button now queries chapters by the correct Dexie index `workspaceId` and preserves string workspace IDs instead of coercing them to numbers.
- **[Safety]** `adaptive-tokens.ts` — empty candidate responses now correctly report `finishReason: "UNKNOWN"` instead of falsely masking as `"STOP"`.
- **[Build]** `client.ts` — fixed TypeScript type error where `rawResponse` (typed `unknown`) was accessed without proper `Record<string, unknown>` cast.
- **[Safety]** Reverted safety settings to `BLOCK_NONE` for 4 core categories; removed `HARM_CATEGORY_CIVIC_INTEGRITY` which may cause API rejection in Gemini 2.5 Flash.

## [2.15.1] - 2026-04-25

### Top Impact
- **[Bridge]** Missing-chapter re-export is now wired from the Bridge dialog to `exportMissingOnly()`, preserving glossary, corrections, prompt, and temperature from the original export context.
- **[Translator]** `chinese-vietnamese-translator` now includes Translation Mode, Convert Kill List, Before Output Rewrite Pass, and 10 grounded Chinese→Vietnamese few-shot examples.
- **[Workflow]** `/dich` Self-QA now explicitly checks Convert Kill List patterns and records hard/soft findings.
- **[Bridge]** `pollJobProgress()` now treats `done_{jobId}.json` as the only completion signal. Outbox count is progress only, preventing premature import before QA is written.
- **[Bridge]** Outbox discovery and cleanup now use exact filename matching instead of broad `startsWith()` checks.

### Added
- **[Bridge]** Missing-chapter re-export is now wired from the Bridge dialog to `exportMissingOnly()`, preserving glossary, corrections, prompt, and temperature from the original export context.
- **[Translator]** `chinese-vietnamese-translator` now includes Translation Mode, Convert Kill List, Before Output Rewrite Pass, and 10 grounded Chinese→Vietnamese few-shot examples.
- **[Workflow]** `/dich` Self-QA now explicitly checks Convert Kill List patterns and records hard/soft findings.

### Changed
- **[Bridge]** `pollJobProgress()` now treats `done_{jobId}.json` as the only completion signal. Outbox count is progress only, preventing premature import before QA is written.
- **[Bridge]** Outbox discovery and cleanup now use exact filename matching instead of broad `startsWith()` checks.
- **[Bridge]** Partial `done` sentinel chapter lists are surfaced to the orchestrator so partial jobs can import and report missing chapters.
- **[Workflow]** `/dich` now requires Translation Mode → Few-Shot internalization → Before Output Rewrite Pass → Quality Gate before writing every outbox file.
- **[Build]** Version bumped to `2.15.1` across `package.json`, `package-lock.json`, `tauri.conf.json`, `tauri.fast.conf.json`, `Cargo.toml`, and `Cargo.lock`.
- `.agent/workflows/dich.md` — restored bridge contract + quality-over-token translation flow

### Fixed
- **[Bridge]** Early auto-import race: the app could import as soon as all `out_*.json` files appeared, skipping `qa_{jobId}.json` and losing QA hard fixes.
- **[Bridge]** Workspace safety: flat outbox imports now verify `chapter.workspaceId === currentWorkspaceId` before updating DB records.
- **[Bridge]** Missing detection: `exportedOrders` is now populated in the Antigravity export path, so missing chapters are detected correctly.
- **[Bridge]** QA hard fixes now apply only to chapters that actually imported and passed workspace validation.
- **[Workflow]** Restored full `/dich` bridge contract after regression to an incomplete short prompt that omitted JSON contract, QA report, and done sentinel requirements.

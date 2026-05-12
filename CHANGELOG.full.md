# Raiden AI Translator — Changelog

> **Full archive**: [`docs/changelog/archive-2026-02.md`](docs/changelog/archive-2026-02.md)
> Only the 5 most recent versions are shown here.

---

## [2.17.0] - 2026-05-12

**Top Impact**: Vertex AI bước sang giai đoạn 2 với `Service Account (Full Vertex)` ngay trong app desktop. Đồng thời khắc phục lỗi crash AI NER trên Vertex bằng cách chặn `Gemini 3` (Preview) và fallback thông minh về `gemini-2.5-flash`. Hệ thống code intelligence GitNexus cũng được khôi phục hoàn toàn sau sự cố kẹt cache npm trên Windows.

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

## [2.16.4] - 2026-05-10

**Top Impact**: Vertex AI giai đoạn 1 giờ là một bản phát hành riêng — app có thể chuyển provider gọn gàng, refresh model qua SDK chính thức, hiển thị `Vertex AI` rõ ràng trong runtime UI, và mặc định route qua Singapore để tốc độ dịch quay về khoảng `15s/chapter` trong thực tế thay vì bị chậm bởi đường global trước đó.

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
- `lib/ai-provider.ts`, `lib/gemini/client.ts`, `src-tauri/src/gemini.rs` — **[Vertex][Codex][Routing]** `Gemini 3` trên Vertex giờ tự chuyển sang endpoint `global` thay vì cố đi qua `asia-southeast1`, tránh lỗi `Publisher Model ... not found` khi đổi model dịch sang `gemini-3-flash-preview`.

## [2.16.3] - 2026-05-06

**Top Impact**: Codex slang prompt hardening — blocked broken archaic-pronoun slang mixes like `Ta đệch` / `Ngươi đệch` at the prompt layer, backed by new few-shots and a narrow final-sweep safety net.

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

**Top Impact**: Post-processing pipeline audit Phase 1 — removed dead code, closed HTML sanitization gap in batch mode, fixed destructive CJK quote normalization order.

- **[Intelligence][Codex][Name Audit]** Rebuilt `name audit` around workspace-safe fixes, `reviewing` chapter coverage, source-ref-backed Chinese↔Vietnamese matching, and actionable cluster ranking so the audit surfaces real name mismatches instead of noisy uppercase phrases.

### Removed
- **[Cleanup][Dead Code]** Deleted `lib/fix-brackets.ts` and `components/workspace/FixBracketsButton.tsx` — duplicate `normalizeVietnameseContent` copy with broken counter (always returned `fixed: 0`), unused component with zero imports.

### Added
- **[Intelligence][Codex][Name Audit]** Added source-ref-driven cross-reference scoring that can still bind localized Vietnamese names back to the right Chinese source even when the chosen translation is not a close Han-Viet spelling.
- **[Intelligence][Codex][Name Audit]** Added cluster actionability signals (`actionabilityScore`, chapter spread, source evidence count) so the main audit list emphasizes likely mistranslations instead of low-signal singleton noise.
- **[Intelligence][Codex][Test]** Added regression coverage for workspace-scoped name auto-fix, `reviewing` chapter scan coverage, localized-name cross-ref, and typo-cluster prioritization.

### Changed
- `lib/services/name-audit.service.ts` — **[Intelligence][Codex][Name Audit]** scan now includes `reviewing` chapters with translated content and merges paragraph-alignment cross-ref with source-ref evidence.
- `lib/services/name-audit.clustering.ts` — **[Intelligence][Codex][Name Audit]** clustering now scores typo similarity, chapter overlap, Chinese source evidence, and Unicode-normalized variants before deciding whether a cluster is worth surfacing.
- `lib/services/name-audit.autofix.ts` — **[Intelligence][Codex][Name Audit]** apply-fix snapshots and correction sweeps are now scoped to the active workspace only.
- `lib/services/corrections.service.ts` — **[Intelligence][Codex][Name Audit]** `sweepSingleRule()` accepts an optional workspace filter so global correction sweeps can stay inside the intended novel.
- `components/workspace/intelligence/hooks/useNameAudit.ts` — **[Intelligence][Codex][Name Audit]** main UI now prioritizes actionable clusters instead of flooding the list with low-confidence singletons.
- `components/workspace/intelligence/NameClusterCard.tsx` — **[Intelligence][Codex][Name Audit]** cards now show context from multiple variants so users can judge clusters faster.

### Fixed
- **[Gemini][Post][Batch]** Added `sanitizeTranslatedContent` as Step 0 in `applyPostProcessing` — batch mode was missing HTML artifact stripping that single mode had via `useSingleOrchestrator`. Both pipelines now sanitize consistently.
- **[Gemini][Post][Order]** Moved `normalizeQuoteStyles` from step 1.6 → step 2.6 (after glossary enforcement) — CJK corner brackets `「」『』` were being destructively converted to curly quotes before glossary had a chance to replace the Chinese text they wrapped.

---

## [2.16.1] - 2026-05-04

**Top Impact**: Silent Codex post-processing for literal slang, legacy money units, and narrow pronoun drift before save, no retry required.

- **[Gemini][Codex][Post]** Added silent automatic post-processing for literal slang, legacy money units, and narrow pronoun drift so common bad outputs are fixed before save without retrying or interrupting the flow.

### Added
- **[Gemini][Codex][Post]** Added automatic literal slang normalization in `finalSweep` for bad reads such as `sáu sáu sáu`, `thảo nê mã`, `ngàn con thảo nê mã`, and `ta dựa vào`.
- **[Gemini][Codex][Post]** Added automatic money normalization for legacy units like `vạn tệ`, `ức tệ`, `nghìn vạn tệ`, and `trăm triệu tệ` into the đô thị format (`nghìn / triệu / tỷ tệ`).
- **[Gemini][Codex][Post]** Added a narrow pronoun-drift fixer that silently pulls obvious `tôi/mình/cô/em/bạn/cậu` slips back toward `Ta/Ngươi` inside archaic dialogue.
- **[Gemini][Codex][Test]** Added regression coverage for silent post-processing of slang literals, money units, and narrow pronoun drift.

### Changed
- `lib/gemini/text/casing.ts` — **[Gemini][Codex][Post]** `finalSweep` now runs deterministic silent normalizers for literal internet slang, modern currency formatting, and narrow pronoun drift before save.
- `__tests__/final-slang-cleanup.test.ts` — **[Gemini][Codex][Test]** expanded regression coverage to lock the new automatic post-processing behavior.

## [2.16.0] - 2026-05-02

**Top Impact**: Proactive "Academic Shield" framing for safety bypass • Codex prompt slang hardening • PROHIBITED_CONTENT diagnostic hardening • Urban currency numeric normalization • Codex unified post-processing across single/batch/chunking • FinalSweep boilerplate & typo hardening • Hán Việt cứng → Thuần Việt naturalizer (prompt + post-processing).

- **[Gemini][Safety][Prompt]** Implemented "Academic Shield" — proactive academic framing in the default system instruction. Reduces `PROHIBITED_CONTENT` blocks for adult/harem/urban novels with profanity by signaling a research/literary translation context from the first attempt.
- **[Gemini][Codex][Prompt]** Built an internet-slang taxonomy plus dynamic grouped prompt hints for Chinese web slang (`666`, `草泥马`, `绷不住了`, `乱七八糟`, `一脸懵逼`, etc.) so the translator stops falling back to literal Hán-Việt or read-aloud meme nonsense.
- **[Gemini][Codex][Prompt]** Hardened profanity handling toward abbreviated urban slang (`ĐM`, `đệt`, `đệch`, `vãi lol`, `vãi cứt`) and added a final sweep fix for malformed outputs like `Ta con mẹ nó`, `Ngươi con mẹ nó`, and `địt bố mày`.
- **[Gemini][Codex][Prompt]** Reworked urban-currency guidance to remove `vạn tệ` / `ức` wording and force modern numeric reads like `500 nghìn tệ`, `100 triệu tệ`, and `5 tỷ tệ`.
- **[Gemini][Codex][Post]** Unified post-processing so batch chapters now go through the same cleanup pipeline as single-chapter translation, while chunking stops re-sweeping titles with the heavy body pass.
- **[Opus][Fix]** Added Vietnamese boilerplate nav strip to `finalSweep` — auto-removes `Chương trước Mục lục Chương sau` and variants that leak through from web novel sources into translated output.
- **[Opus][Fix]** Added AI output typo correction `Đầu óã` → `Đầu óc` to `finalSweep` — catches known Gemini character corruption in Vietnamese diacritics.
- **[Opus][Prompt]** Added `NATURAL_VIET_RULE` to system instruction — tells AI to prefer natural Vietnamese over stiff Hán Việt compounds (kiên tin → tin chắc, siêu quần → xuất chúng, etc.) with exception for martial arts terms and 4-char idioms.
- **[Opus][Sweep]** Added `hanVietMap` (18 entries) to `finalSweep` — post-processing safety net that auto-replaces stiff Hán Việt compounds (bi thương → đau buồn, ngưng trọng → nghiêm nghị, hoan hỉ → vui mừng, etc.) with case-preservation.

### Added
- **[Gemini][Safety][Prompt]** Proactive Academic Framing: default system instruction now identifies content as "published Chinese web novel" for "literary research and archival purposes" to decrease false-positive safety triggers from the first attempt.
- **[Gemini][Codex][Prompt]** Added `PRONOUN LOCK` as a dedicated top-level guardrail, a `Flash Lite 2.5` prompt profile, and extra few-shot coverage for lover/family/master-disciple dialogue, modern profanity, and urban money reads.
- **[Gemini][Codex][Prompt]** Added internet-slang categories (`reaction`, `praise`, `censored_profanity`, `insult`, `behavior`) plus new map entries for `666`, `太6了`, `草泥马`, `千只草泥马`, `千只草泥马奔腾而过`, `尼玛`, `绷不住了`, `离谱`, `逆天`, `乱七八糟`, and `一脸懵逼`.
- **[Gemini][Codex][Test]** Added regression coverage for grouped slang hints, profanity cleanup, meme-variant slang, and modern urban currency formatting.
- **[Gemini][Codex][Test]** Added post-processing regression coverage so batch routing, title normalization, and body cleanup stay locked to the shared pipeline.
- **[Opus][Sweep]** `finalSweep` now strips Vietnamese navigation boilerplate (`Chương trước`, `Mục lục`, `Chương sau`) that survives translation from web novel sources.
- **[Opus][Sweep]** `finalSweep` now auto-corrects `óã` → `óc` diacritic corruption in AI output.
- **[Opus][Prompt]** `NATURAL_VIET_RULE` added to both `ALL_RULES` and `LITE_RULES` — instructs AI to avoid stiff Hán Việt when natural Vietnamese equivalents exist.
- **[Opus][Sweep]** `hanVietMap` with 18 Hán Việt → Thuần Việt replacements added to `finalSweep` as a post-processing safety net.

### Changed
- `lib/gemini/constants.ts` — **[Gemini][Safety]** Updated default `customInstruction` template with academic framing and hư cấu (fiction) context.
- `lib/gemini/translation/post-processor.ts` — **[Gemini][Codex][Post]** extracted shared post-processing options so both single and batch flows finalize title/body through one path.
- `lib/gemini/batch-api.ts` — **[Gemini][Codex][Post]** batch parsing now immediately runs shared post-processing for each returned chapter before handing results back to the UI.
- `lib/gemini/chunking.ts` — **[Gemini][Codex][Post]** removed redundant heavy `finalSweep` passes on non-chunked responses and stopped applying body-grade cleanup to titles after chunk merge.
- `components/workspace/hooks/useBatchOrchestrator.ts` — **[Gemini][Codex][Post]** batch UI save path now trusts already-processed chapter output instead of re-normalizing title/corrections in a second pass.
- `lib/gemini/text/casing.ts` — **[Opus][Sweep]** Added Vietnamese boilerplate nav strip, AI typo correction, and `hanVietMap` (18 entries) to `finalSweep`.
- `lib/gemini/constants.ts` — **[Opus][Prompt]** Added `NATURAL_VIET_RULE` and included in both `ALL_RULES` and `LITE_RULES`.
- `__tests__/post-processor.test.ts` — **[Gemini][Codex][Test]** added regression coverage for shared title/body post-processing behavior.
- `__tests__/batch-postprocess.test.ts` — **[Gemini][Codex][Test]** added regression coverage that batch output is routed through the shared post-processing pipeline.

---

## [2.15.2] - 2026-04-26

**Top Impact**: Codex prompt slang hardening • PROHIBITED_CONTENT diagnostic hardening • Web novel boilerplate auto-strip • Bulk clean Action Hub button • Safety soft-retry with academic framing

### Added
- **[Codex][Prompt]** Strengthened pronoun lock so `我/你` stay `Ta/Ngươi` even in lover, family, sibling, or master-disciple contexts unless the original sentence explicitly contains a dedicated kinship/title form.
- **[Codex][Prompt]** Added a hard `PRONOUN LOCK` block at the top of the translation prompt and expanded few-shot coverage for dialogue pronouns plus `我靠` slang variants (`!` and `.`).
- **[Codex][Prompt]** Added a dedicated `Flash Lite 2.5` prompt profile with shorter core rules and a trimmed few-shot pack, activated automatically when the selected model is `gemini-2.5-flash-lite`.
- **[Codex][Prompt]** Added few-shot examples for modern Chinese web slang (`我靠`, `卧槽`, `装逼`) to prevent literal outputs like "Ta dựa vào!" and force natural Vietnamese exclamations/behavioral slang.
- **[Safety]** Soft-retry mechanism for PROHIBITED_CONTENT blocks — wraps system instruction with Vietnamese academic framing to bypass input-level false positives.
- **[Safety]** Full safety ratings now embedded directly in error messages (PromptRatings, CandRatings, response keys) — visible in UI overlay without DevTools.
- **[Utils]** `strip-boilerplate.ts` — shared module with 15+ regex patterns to strip Chinese web novel navigation, UI controls, genre tags, disclaimers, page-break prompts, and site watermarks.
- **[Service]** `clean.service.ts` — bulk scan/clean boilerplate from all chapters in a workspace with progress tracking.
- **[UI]** ✂️ "Xóa rác web" button in Action Hub — one-click bulk clean boilerplate from `content_original` in database.

### Fixed
- **[Codex][Prompt]** Turned off two ineffective dynamic heuristics that were matching Vietnamese keywords against Chinese source text, and left explicit notes for a future Chinese-keyword rewrite.
- **[Codex][Audit]** Expanded web boilerplate stripping to cover simplified and traditional Chinese TXT junk (`首页`, `下一页`, `请记住本书首发域名`, `手机版阅读网址`, `笔趣阁`, recommendation/bookmark prompts) with regression tests.
- **[Codex][Fix]** "Xóa rác web" Action Hub button now queries chapters by the correct Dexie index `workspaceId` and preserves string workspace IDs instead of coercing them to numbers.
- **[Safety]** `adaptive-tokens.ts` — empty candidate responses now correctly report `finishReason: "UNKNOWN"` instead of falsely masking as `"STOP"`.
- **[Build]** `client.ts` — fixed TypeScript type error where `rawResponse` (typed `unknown`) was accessed without proper `Record<string, unknown>` cast.
- **[Safety]** Reverted safety settings to `BLOCK_NONE` for 4 core categories; removed `HARM_CATEGORY_CIVIC_INTEGRITY` which may cause API rejection in Gemini 2.5 Flash.

### Files Modified
- `lib/gemini/constants.ts` — **[Codex]** moved pronoun mapping into a dedicated top-level lock block and expanded dialogue/slang few-shots
- `__tests__/prompt-profile.test.ts` — **[Codex]** added regression coverage for pronoun lock and `我靠` variant examples
- `__tests__/prompt-profile.test.ts` — **[Codex]** added regression coverage for full vs lite prompt selection
- `lib/gemini/constants.ts` — **[Codex]** introduced `lite` prompt profile selection for `gemini-2.5-flash-lite`
- `lib/gemini/rules/assembler.ts` — **[Codex]** routes prompt profile by model and turns off two ineffective Vietnamese-keyword heuristics
- `lib/gemini/translate.ts` — **[Codex]** routes single translation prompt selection by model
- `lib/gemini/batch/prompt.ts` — **[Codex]** accepts model-aware prompt profile selection for batch translation
- `lib/gemini/batch-api.ts` — **[Codex]** passes selected model into batch prompt construction
- `components/workspace/hooks/useBatchOrchestrator.ts` — **[Codex]** builds batch prompts after resolving the selected model
- `lib/utils/strip-boilerplate.ts` — **[Codex]** expanded simplified/traditional Chinese boilerplate patterns and safer line-anchored matching
- `__tests__/strip-boilerplate.test.ts` — **[Codex]** added regression coverage for simplified junk, traditional junk, and prose false-positive protection
- `components/workspace/chapter-list/ChapterList.tsx` — **[Codex]** passes string `workspaceId` directly to boilerplate cleaner
- `lib/services/clean.service.ts` — **[Codex]** uses indexed `workspaceId` instead of non-existent `workspace_id`
- `lib/gemini/rules/assembler.ts` — **[Codex]** injects `MODERN_SLANG_MAP` hints only when matching slang appears in the source text
- `lib/gemini/idioms.ts` — **[Codex]** expanded modern slang map with `我靠`, `我去`, `他妈的`, `牛逼`
- `lib/gemini/constants.ts` — **[Codex]** added slang few-shot samples and explicit bans for literal outputs such as "Ta dựa vào!"
- `lib/utils/strip-boilerplate.ts` — NEW: shared boilerplate stripping module
- `lib/services/clean.service.ts` — NEW: bulk workspace clean service
- `lib/gemini/translate.ts` — boilerplate strip + safety soft-retry + diagnostic embedding
- `lib/gemini/client.ts` — type cast fix + raw response debug logging
- `lib/gemini/adaptive-tokens.ts` — finishReason UNKNOWN fix
- `components/workspace/shared/ChapterListHeader.tsx` — ✂️ clean button
- `components/workspace/chapter-list/ChapterList.tsx` — clean handler wiring

---

## [2.15.1] - 2026-04-25

**Top Impact**: Antigravity Bridge done-gated auto-import • Workspace-safe import • Missing chapter re-export • Quota-heavy translator prompt hardening

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

### Fixed
- **[Bridge]** Early auto-import race: the app could import as soon as all `out_*.json` files appeared, skipping `qa_{jobId}.json` and losing QA hard fixes.
- **[Bridge]** Workspace safety: flat outbox imports now verify `chapter.workspaceId === currentWorkspaceId` before updating DB records.
- **[Bridge]** Missing detection: `exportedOrders` is now populated in the Antigravity export path, so missing chapters are detected correctly.
- **[Bridge]** QA hard fixes now apply only to chapters that actually imported and passed workspace validation.
- **[Workflow]** Restored full `/dich` bridge contract after regression to an incomplete short prompt that omitted JSON contract, QA report, and done sentinel requirements.

### Files Modified
- `.agent/workflows/dich.md` — restored bridge contract + quality-over-token translation flow
- `.agent/skills/chinese-vietnamese-translator/SKILL.md` — translator source-of-truth rewrite + few-shots
- `lib/bridge/antigravity-bridge.ts` — done-gated polling, exact file matching, workspace validation, QA fix guard
- `components/workspace/hooks/useAntigravityOrchestrator.ts` — export context, exported orders, partial completion, re-export missing
- `components/workspace/hooks/TranslationProvider.v2.tsx` — route Bridge export through orchestrator state
- `components/workspace/chapter-list/components/ChapterListDialogs.tsx` — wire missing re-export handler

---

## [2.15.0] - 2026-04-21

**Top Impact**: Intelligent OAuth Auto-Retry • Title Casing Integrity (proper names protected) • User-Agent Browser Mimicry • Migration bug fix for Rate Limiter

### Added
- **[OAuth]** Browser Header Mimicry: Implemented `User-Agent` (Chrome/124) in both Rust and Frontend paths to reduce bot-detection surface.
- **[Observability]** Enhanced 429 Logging: Processing overlay now explicitly reports "🚨 429 Rate Limited!" when Google triggers throttling.

### Changed
- **[Gemini]** Proper Name Protection: Updated system prompt and loosed normalization regex (`TITLE_CASE_RE`) to ensure character names (e.g., "Dương Quân Bác") are NOT lowercased in chapter titles.
- **[OAuth]** Precise Wait Times: `RateLimiter` now returns exact remaining milliseconds in the current window instead of a hardcoded 60s delay.

### Fixed
- **[OAuth]** Migration Stale Counters: Fixed a bug in `resetExpiredCounters` where missing window start timestamps in legacy data caused permanent request blocking until a manual cache clear.
- **[Auth]** OAuth 429 Handling: Rust backend now correctly surfaces HTTP 429 status codes to the frontend orchestrator for retry processing.

### Files Modified
- `src-tauri/src/gemini.rs` — HTTP error surfacing + User-Agent
- `lib/gemini/client.ts` — Auto-retry loop + 429/401 handling + User-Agent
- `lib/gemini/rate-limiter.ts` — Precise wait logic + migration reset fix
- `lib/gemini/constants.ts` — Prompt rule update for titles
- `lib/utils/title-normalizer.ts` — Regex loosening ({2,} → {4,})

---

## [2.14.0] - 2026-04-16

**Top Impact**: Native Gemini OAuth Integration • CORS isolation (Rust Backend) • Ultra High-Throughput (~5.4 chapters/min) • Real-time display logs

### Added
- **[Gemini]** Native OAuth 2.0 flow via Tauri/Rust to bypass CORS "Failed to fetch" errors.
- **[Auth]** Combined `exchange_code_native` command for unified token + user info retrieval.
- **[UI]** Detailed OAuth indicators in Max Ping panel (Delay, Quota, Response Time).

### Changed
- **[Performance]** Optimized `rate-limiter.ts` for Ultra subscribers: 3s delay → 0.3s.
- **[Performance]** RPM increased to 30; Burst cooldown reduced to 5s.

---

## [2.12.0] - 2026-03-28

**Top Impact**: Pronoun Mapping Expansion v3.4 (我/你/他/她/它 full set) • Term Audit Optimization (Kills 90% noise) • Feature Shelved (Needs genre tuning)

### Added
- **[Translator]** `XƯNG HÔ` Rule Expansion: Full 10 pairs of Chinese pronouns (我/你/他/她/它/我们/你们/他们/她们/它们) mapped to Vietnamese equivalents with context-aware flexibility (e.g., 她=Nàng/Cô ấy).
- **[AI]** `SOFT_WRAPPER_VERB_BLOCKLIST` — Danh sách chặn 50+ động từ/tính từ phổ biến để lọc rác cho Term Audit.
- **[AI]** Term Audit Filter: Strip trailing punctuation (,, ;, ., !, ?) khỏi các term trích xuất.
- **[AI]** Term Audit Extractor: Loại bỏ quantifiers (loạt/mấy/vài) và demonstratives (này/kia) tự động.

### Changed
- **[Build]** `SYSTEM_VERSION` → `v3.4` (Core rules updated).
- **[AI]** Term Audit Engine: Yield-to-main thread pattern during scan to prevent UI freeze on large chapter blocks.
- **[Build]** `package.json`, `tauri.conf.json` — 2.11.0 → 2.12.0.

### Fixed
- **[AI]** Term Audit extraction noise: Fixed "soft wrapper" over-detection by enforcing 1st content token check against blocklist.

### Design Decisions
- **Shelved Term Audit**: Tính năng hiện đang để **OFF** mặc định (`featureFlags.termAudit = false`) do extractor vẫn còn sinh noise với truyện hiện đại. Cần tuning theo genre trong tương lai.

---

## [2.11.0] - 2026-03-24

**Top Impact**: Term Audit — scanner phát hiện thuật ngữ Việt không nhất quán • Anchor-first extraction (giả/sư/người/kẻ) • Bucket+greedy clustering với guard chống chain-merge • Auto-fix qua Luyện Văn • 16 unit tests pass

### Added
- **[AI]** `term-audit.types.ts` — Types: `TermCluster`, `TermOccurrence`, `ClusterMode` (`auto`, `review`, `protected-related`), `TermAuditReport`, `TermFixResult`
- **[AI]** `term-audit.extraction.ts` — Anchor-first extractor: hard anchors (giả, sư, tông, môn, phái…) + soft wrappers (người, kẻ, tên) với validity guard
- **[AI]** `term-audit.normalization.ts` — NFC, ascii-fold, generic head stripping → stable `rootHint`
- **[AI]** `term-audit.clustering.ts` — Bucket-based greedy merge: score (edit-distance + shared-prefix + set-overlap) ≥ 0.72 = merge; Review Zone 0.60–0.71; canonical guard chống chain-merge
- **[AI]** `term-audit.autofix.ts` — Tạo CorrectionEntry → `sweepSingleRule()`; 3 guards: confirmed, variants ≥ 2, scanRunId match
- **[AI]** `term-audit.service.ts` — Orchestrator: extract → cluster → enrich (Glossary/Correction lookup)
- **[UI]** `hooks/useTermAudit.ts` — Hook: idle→scanning→ready→applying state machine, confirmCanonical với scanRunId guard
- **[UI]** `TermClusterCard.tsx` — Variant radio, frequency bars, confidence reasons collapsible, mode badges
- **[UI]** `TermAuditModule.tsx` — Scan controls, filter tabs (tất cả/không nhất quán/xem lại/đã chọn), apply flow, feature gate
- **[UI]** `IntelligenceHub.tsx` + Term Audit tab (chỉ hiện khi `featureFlags.termAudit = true`)
- **[Test]** `__tests__/term-audit.test.ts` — 16 unit tests (all pass)

### Changed
- **[Build]** `featureFlags.ts` — +`termAudit: false` (off-switch)
- **[UI]** `IntelligenceHub.tsx` — +ScanSearch icon, +TermAuditModule import, +termAudit ModuleType

### Design Decisions
- Anchor-first extraction tránh n-gram rác • No auto-merge ở Review Zone • scanRunId guard reset confirm khi rescan • Protected terms → chỉ show, không merge • Reuse sweepSingleRule từ corrections.service.ts

### Files Added
- `lib/services/term-audit.{types,extraction,normalization,clustering,autofix,service}.ts`
- `hooks/useTermAudit.ts`
- `components/workspace/intelligence/TermClusterCard.tsx`
- `components/workspace/intelligence/TermAuditModule.tsx`
- `__tests__/term-audit.test.ts`

### Files Modified
- `lib/featureFlags.ts`, `components/workspace/intelligence/IntelligenceHub.tsx`
- `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` — 2.10.1 → 2.11.0

---

## [2.10.1] - 2026-03-23

**Top Impact**: Fix 5 lỗi audit prompt rules (Codex) • Post-processing capitalize [] deterministic • Sửa 万→vạn tệ (10x error)

### Fixed
- **[Translator]** Batch prompt gọi `buildSystemInstruction()` không truyền `isBatch=true` → "CẤM JSON" conflict với JSON output yêu cầu. Flash output không ổn định.
- **[Translator]** `CURRENCY_RULE`: 万→nghìn tệ SAI 10x. Sửa thành 万→vạn tệ (mười nghìn) + đầy đủ 千万, 亿.
- **[Translator]** `WESTERN_NAME_RULE` fallback "ghi chú" mâu thuẫn CẤM Hán tự + CẤM giải thích. Sửa: "giữ phiên âm Latin hóa, KHÔNG ghi chú".
- **[Translator]** `[HARD LIMIT]` ẩn chủ ngữ quá cứng → mờ nhân vật scene đông người. Nới thành "NÊN hạn chế, ĐƯỢC PHÉP nếu cần rõ nghĩa".
- **[Translator]** `IDIOM_RULE` dead code — export nhưng không dùng `ALL_RULES`. Comment DEPRECATED.
- **[Translator]** Đại từ đầu câu viết thường (hắn/nàng/ngươi). Tách rule: "GIỮA CÂU viết thường / ĐẦU CÂU BẮT BUỘC hoa".
- **[Translator]** Text `[]` hệ thống viết thường đầu dòng (VD: `[tỷ lệ...]`). Fix post-processing deterministic trong `finalSweep()`.

### Changed
- **[Translator]** Thêm rule `[VIẾT HOA]`: Sentence case cho text `[]` với ví dụ SAI/ĐÚNG.
- **[Translator]** `FLOW_RULE`: "Tuyệt đối không..." → "Ưu tiên tránh..., ĐƯỢC PHÉP nếu cần rõ nghĩa".

### Files Modified
- `lib/gemini/batch/prompt.ts` — `isBatch=true`
- `lib/gemini/constants.ts` — 5 rule fixes + [VIẾT HOA]
- `lib/gemini/text/casing.ts` — capitalize `[]` post-process (step 3.5)

---

## [2.10.0] - 2026-03-22

**Top Impact**: Name Consistency Audit (4-phase feature) • Intelligence Hub "Name Audit" tab • Auto-fix → Luyện Văn integration • Chapter Convert modal

### Added
- **[Intelligence]** Name Consistency Audit — Full post-translation scanner detecting inconsistent character name translations (zero API cost, pure string processing + HanViet lookup).
- **[Intelligence]** `name-audit.extraction.ts` — Phase 1: Vietnamese + Chinese name extraction with paragraph alignment and cross-referencing via VietPhrase + HanViet repos.
- **[Intelligence]** `name-audit.clustering.ts` — Phase 2: Fuzzy name clustering using Chinese cross-refs first, then source ref matching, then Levenshtein distance.
- **[Intelligence]** `name-audit.autofix.ts` — Phase 4: Auto-fix engine creates Correction rules (Luyện Văn) + sweeps all translated chapters + saves undo snapshot.
- **[UI]** `NameAuditModule.tsx` — Main Intelligence Hub module with chapter range selector, scan progress bar, filter tabs (All/Inconsistent/Confirmed), similarity threshold slider.
- **[UI]** `NameClusterCard.tsx` — Cluster card with proportional frequency bars, radio canonical selection, source ref look-back (VietPhrase + Chinese + Vietnamese), "Convert" chapter button.
- **[UI]** `ChapterConvertModal.tsx` — Full chapter converter modal (VietPhrase/HanViet/Original Chinese tabs) for manual name identification when cross-ref fails.
- **[UI]** `useNameAudit.ts` hook — Scan lifecycle, clustering, confirm/dismiss state, chapter range filter, auto-fix integration.
- **[Intelligence]** Chapter range filter on scan — scan chapters 50→100 or all.

### Changed
- **[Intelligence]** Refactored monolithic `name-audit.service.ts` into 4 modules: extraction, clustering, autofix, orchestrator.
- **[UI]** Intelligence Hub — added "Name Audit" tab with `Users` icon.
### Fixed
- **[Intelligence]** Dictionary cold-start — `SyllableRepository` and `VietPhraseRepository` not loaded before Name Audit scan/convert. Cold start returned raw Chinese text instead of HanViet/VietPhrase.
- **[Intelligence]** SourceRef ambiguity — paragraphs with multiple Chinese names caused false cluster merges. Now skipped when >1 name found.
- **[Intelligence]** Stale Correction rules — re-auditing with a different canonical silently skipped the new rule. Now updates existing rule when `to` differs.
- **[Intelligence]** Undo scope mismatch — snapshot was workspace-scoped but sweep was global. Snapshot now captures all translated chapters.
- **[Corrections]** `sweepSingleRule()` now also corrects `title_translated`, matching the main Luyện Văn flow and preventing "body fixed, title stale".
- **[UI]** Fix result label: "chương" → "lượt cập nhật" to avoid inflated count when 1 chapter is updated by multiple rules.

### Files Modified
- `lib/services/name-audit.types.ts` — Shared types (SourceParagraphRef, NameCluster, NameVariant, NameAuditReport, NameFixSelection, NameFixResult)
- `lib/services/name-audit.extraction.ts` — NEW (Phase 1)
- `lib/services/name-audit.clustering.ts` — NEW (Phase 2) + ambiguity guard
- `lib/services/name-audit.autofix.ts` — NEW (Phase 4) + override logic + global snapshot
- `lib/services/name-audit.service.ts` — Orchestrator + convertChapterForReview + dictionary load guard
- `lib/services/corrections.service.ts` — `sweepSingleRule` title fix
- `components/workspace/intelligence/NameAuditModule.tsx` — NEW + label fix
- `components/workspace/intelligence/NameClusterCard.tsx` — NEW
- `components/workspace/intelligence/ChapterConvertModal.tsx` — NEW
- `components/workspace/intelligence/hooks/useNameAudit.ts` — NEW
- `components/workspace/intelligence/IntelligenceHub.tsx` — Added tab
- `__tests__/name-audit.test.ts` — 37 unit tests

---

## [2.9.5] - 2026-03-20

**Top Impact**: Cloud Correction Sync (Mobile→Cloud→Desktop auto-pull) • No more LAN-only corrections

### Added
- **[Sync]** `pollAndApplyCloudCorrections()` — Desktop auto-polls cloud every 30s for corrections pushed from Mobile. Applies text replacements to chapters + saves as global correction rules.
- **[Sync]** Auto-poll hook in `CloudSyncButton` — polls on mount + every 30s, shows toast `📱 Nhận N cải chính từ Mobile (cloud)`.

### Changed
- **[Sync]** Cloud correction flow now fully operational: Mobile `pushCorrectionsToCloud()` → R2 storage → Desktop `pollAndApplyCloudCorrections()` → toast. Previously, corrections could only sync via LAN (broken for HTTPS-hosted PWA due to mixed content block).

### Files Modified
- `lib/sync/cloud-sync.ts` — `pollAndApplyCloudCorrections()`, `GLOBAL_WORKSPACE_ID` import
- `components/workspace/shared/CloudSyncButton.tsx` — auto-poll useEffect

---

## [2.9.4] - 2026-03-08

**Top Impact**: Bridge Import UX fix • Toolbar icon cleanup • Tauri build 55s→38s • Pagination scroll-to-top

### Fixed
- **[Bridge]** Auto-import not triggering — `pollJobProgress` now considers job done when outbox file count matches expected, not just when sentinel file exists.
- **[UI]** Toolbar icon hover inconsistency — all icons now use `icon-only` Button variant (no hover background), matching the Sync button style.
- **[UI]** Pagination scroll — changing pages now smooth-scrolls to the top of the chapter list.

### Added
- **[Bridge]** `reopenForImport()` — reopen Bridge dialog after closing to import pending outbox files.
- **[Bridge]** `findLatestOutboxInfo()` — returns metadata about the latest outbox job for dialog re-opening.
- **[UI]** 📦 Import Bridge button in toolbar — one-click access to import pending Bridge translations.
- **[UI]** `icon-only` Button variant — no hover background, only color change on hover.
- **[Build]** `sccache` integration — shared compilation cache for Rust, survives `cargo clean`.
- **[Build]** Dev profile optimization — `[profile.dev.package."*"]` with `opt-level=1`, `debug=false`.
- **[Build]** `rust-analyzer.cargo.targetDir` separation — prevents lock conflicts with `tauri dev`/`bxf`.

### Changed
- **[Build]** Tauri release profile tuned for speed: `opt-level=1`, `codegen-units=32`, `strip=true`, `panic=abort`.
- **[Build]** Incremental build time: **55s → 38s** (30% faster).

### Files Modified
- `lib/bridge/antigravity-bridge.ts` — pollJobProgress fix + findLatestOutboxInfo
- `components/workspace/hooks/useAntigravityOrchestrator.ts` — reopenForImport
- `components/workspace/shared/ChapterListHeader.tsx` — Bridge Import button + icon-only variant
- `components/workspace/chapter-list/ChapterList.tsx` — pagination scroll-to-top
- `components/ui/button.tsx` — icon-only variant
- `src-tauri/Cargo.toml` — release + dev profile optimization
- `.vscode/settings.json` — rust-analyzer targetDir separation
- `~/.cargo/config.toml` — sccache global config

---

## [2.9.3] - 2026-03-07

**Top Impact**: Bridge → Cloud Sync auto-push • Cover image loss fix on delta push • /dich workflow hardening

### Fixed
- **[CloudSync]** Bridge import now auto-pushes to cloud — previously Bridge flow returned early in `TranslationProvider`, skipping the cloud sync step entirely.
- **[CloudSync]** Cover image lost during delta sync — `pushDelta` was sending sparse workspace metadata (`{id, title, sourceLang, targetLang}` only), causing the worker to overwrite full metadata (including `cover`, `author`, `description`, `genre`) on merge. Now sends full metadata matching `pushWorkspace`.

### Changed
- **[Bridge]** `/dich` workflow Step 4: Added `OVERRIDE` warning — config.prompt contains `CẤM JSON` (meant for App's internal AI flow), but Bridge Agent must always write JSON format. Explicit override prevents format confusion.
- **[Bridge]** 6 feature ideas analyzed and added to backlog: Missing Chapter Detection + Retry, Background Monitor, Preflight Check, One-click Export, History Log, Review Mode.

---

## [2.9.2] - 2026-03-07

**Top Impact**: Bridge Auto-Import v2 (poll + sentinel + safe cleanup) • Progress Polling UI • Self-QA Scan workflow step • /changelog workflow

### Added
- **[Bridge]** Auto-Import v2 — App polls outbox every 2s, detects `done_{jobId}.json` sentinel, auto-imports translated chapters.
- **[Bridge]** `checkDoneSentinel()` — detects agent completion signal file.
- **[Bridge]** `pollJobProgress()` — returns `{ completed, total, isDone }` for UI.
- **[Bridge]** `DoneSentinel`, `PollProgress` interfaces; `BridgePhase` type.
- **[Bridge]** `AutoImportTrigger` invisible component for auto-import glue.
- **[UI]** Real-time progress bar + phase-based state machine in `AgBridgeDialog` (waiting → translating → complete → importing → success).
- **[Workflow]** Self-QA Scan — New mandatory Step 5 in `/dich`: agent re-reads outbox files and fixes typos, spelling, Hán Việt sống, glossary inconsistencies before done sentinel.
- **[Workflow]** `/changelog` workflow — standalone 4-step flow (full → trim → release notes → archive), added to global_workflows for cross-project reuse.
- **[Workflow]** Done sentinel step (Step 7) — `done_{jobId}.json` written by agent after translation.

### Changed
- **[Bridge]** `importOutbox()` accepts `expectedCount` for safe cleanup validation.
- **[Bridge]** `cleanupJobFiles()` also removes `done_*.json` sentinel files.
- **[Bridge]** `findOutboxFilesForJob()` now exported for polling use.
- **[Hook]** `useAntigravityOrchestrator` expanded with `phase`, `progress` state, polling `useEffect`, `triggerAutoImport` callback.
- **[Workflow]** `/dich` steps renumbered (old 5→6, old 6→7, new 5 = Self-QA).
- `lib/bridge/antigravity-bridge.ts` — polling + sentinel + safe cleanup
- `components/workspace/hooks/useAntigravityOrchestrator.ts` — phase machine + auto-import
- `components/workspace/chapter-list/bridge/AgBridgeDialog.tsx` — progress UI rewrite
- `components/workspace/chapter-list/components/ChapterListDialogs.tsx` — AutoImportTrigger glue
- `.agent/workflows/dich.md` — Self-QA step + done sentinel step
- `.agent/workflows/changelog.md` — NEW (also copied to global_workflows)

### Fixed
- **[Translator]** Typo fixes in batch Ch48-52: "đường xá"→"đường sá", "không thảo"→"không khéo", "chủng dự cảm"→"loại dự cảm".
- **[Workflow]** Self-QA blacklist checklist referenced wrong terms (hallucinated "huynh/đệ/tiểu thư") — corrected to actual SKILL §3 blacklist.

---

## [2.9.1] - 2026-03-06

**Top Impact**: Ultra-lean Translation Rules v2/v3 • Anti-Literal & Logic Guardrails • Translation Quality Polish

### Added
- **[Translator]** Ultra-lean Rules v3 — Added 10+ specific guardrails to combat typical translation engine hallucinations:
  - Anti-Literal: "chia một chén canh" → natural Vietnamese "kiếm một phần/nhúng tay vào".
  - Han-Structure Ban: Replaced machine-like "danh từ + độ khó cao" with natural "việc này khó".
  - Logic Guardrail: Prevented spatially impossible phrases like "đậu ở bên trong và ngoài doanh trại".
  - POV Consistency: Banned "mình/của mình" in 3rd person narration/thoughts.
  - Collocation Fixer: Auto-corrected machine terms like "bàn chông" (bẫy chông), "trạng thái cơ thể" (thể chất/thể trạng).
- **[Translator]** Silent Word Purge — Automated removal of redundant/repetitive words ("ngoài ra ngoài", "thầm lẩm bẩm").

### Changed
- **[Workflow]** Refined `/dich` workflow to be even more aggressive in enforcing natural phrasing over literal conversion.
- **[Prompt]** Updated embedded translation rules with clear "SAI / ĐÚNG" examples for the AI.

### Fixed
- **[Translator]** "Ta ở đây" opening — Fixed common AI filler opening when no actual location is implied.
- **[Translator]** Incorrect "Nhất" usage — Limited "nhất" to actual comparative contexts only.
- **[Sync]** Cloud push 500 for new novels — R2 rejected `DecompressionStream` output (unknown length). Worker now buffers decompressed body as string before `R2.put()`. Also fixed client-side gzip: `Blob` → `ArrayBuffer` for reliable `Content-Length`.

### Files Modified
- `.agent/workflows/dich.md` — Rule set v3 expansion
- `bridge/out_*.json` — Applied new rules to Chapter 42-44 deliveries
- `lib/sync/cloud-sync.ts` — Gzip body: Blob → ArrayBuffer
- `raiden-sync/src/index.ts` — Buffer decompressed body before R2.put (deployed)

---

## [2.9.0] - 2026-03-06

**Top Impact**: New Workflow-Embedded Translation Engine • Continuous Task Context • Massive Rule Enforcement

### Added
- **[Translator]** Workflow-Embedded Rules — 10+ critical translation rules (pronouns, subjects, blacklist) now live directly in `.agent/workflows/dich.md` for zero-hallucination enforcement.
- **[Translator]** Continuous Task Mode — All chapters in a batch are treated as a single task, preventing style/terminology reset per chapter.
- **[Translator]** Quality Gate Checklist — Mandatory pre-save validation for pronouns, blacklist, and formatting.

### Fixed
- **[Translator]** Large Chapter Truncation — fixed "Expect double quote" JSON errors by optimizing the `write_to_file` pipeline for large chapter contents.
- **[Translator]** Rule Adherence — eliminated AI "over-thinking" by prioritizing embedded workflow rules over internal reasoning.

### Changed
- **[Workflow]** Refactored `/dich` command to be completely silent and batch-optimized.
- **[Prompt]** Simplified internal prompts to prevent AI from re-analyzing style per segment.

### Files Modified
- `.agent/workflows/dich.md` — Core translation logic overhaul
- `bridge/out_*.json` — Fixed truncation/formatting issues

---

## [2.7.13] - 2026-03-04


**Top Impact**: Fix NER save bug • Character delete button • Bulk retranslate • Build crash fix

### Fixed
- **[NER]** ReviewDialog `onSave` ignored edited data — renaming/deleting characters in review was discarded on save.
- **[Build]** `Cannot access 'J' before initialization` — top-level `import { invoke }` from `@tauri-apps/api/core` crashed Next.js SSR prerender. Reverted to lazy `await import()` inside `isTauri()` blocks.

### Added
- **[UI]** Delete button on Character Tab rows — trash icon appears on hover for quick character removal.
- **[UI]** "Dịch lại" (Retranslate) button in ChapterSelectionDock — bulk retranslate selected chapters with one click.
- **[Translator]** `post-cleanup.ts` module — deduplicateConsecutiveParagraphs, normalizeQuoteStyles, scrubVietnameseAIChatter.
- **[Test]** `vitest.config.ts` + `__tests__/title-normalizer.test.ts` unit tests.

### Changed
- **[Translator]** `finalSweep()` now integrates post-cleanup functions for cleaner output.
- **[Cleanup]** Removed stale lint-report files, TranslationProvider backup, cleaned .gitignore.

### Files Modified
- `components/workspace/characters/CharacterRow.tsx` — delete button
- `components/workspace/CharacterTab.tsx` — pass handleDelete
- `components/workspace/ChapterSelectionDock.tsx` — retranslate button
- `components/workspace/chapter-list/ChapterList.tsx` — bulk retranslate handler
- `components/workspace/chapter-list/components/ChapterListDialogs.tsx` — fix onSave
- `lib/gemini/contentProcessor.ts` — export post-cleanup
- `lib/gemini/text/casing.ts` — integrate post-cleanup in finalSweep
- `lib/gemini/text/post-cleanup.ts` — NEW module
- `lib/gemini/translation/post-processor.ts` — integrate post-cleanup

---

**Top Impact**: Luyện Văn auto-apply pipeline • Corrections service refactor (1 engine → 1 service → 3 thin hooks)

### Added
- **[Translator]** Auto-apply corrections on new translations — every chapter gets global corrections applied silently after translation completes.
- **[Translator]** `corrections.service.ts` — dedicated service layer with `applyCorrectionsText()`, `sweepSingleRule()`, `applyCorrectionsToChapter()`.

### Changed
- **[UI]** "Tuning / Cải chính" tab → "Luyện Văn / Global Corrections" with better dark mode contrast.
- **[UI]** Apply button → "🔥 Luyện Văn — Áp dụng X quy tắc" (clearer global scope).
- **[Translator]** Add correction rule → auto-sweep ALL chapters silently (no toast spam).
- **[Translator]** 3 correction hooks refactored to thin UI adapters — zero inline correction logic.

### Fixed
- **[NER]** ReviewDialog reset edits on parent re-render — `useRef` + `initialData` pattern to prevent data loss.
- **[NER]** AI NER service edge cases in character extraction.

### Changed
- **[Translator]** TranslationProvider V3 — extracted into orchestrator-only pattern:
  - `useBatchOrchestrator.ts` — batch translation logic
  - `useSingleOrchestrator.ts` — single chapter translation  
  - `glossary.service.ts` — shared glossary building
  - `chapter-title-normalizer.ts` — title normalization
  - `prepare-chapter-payload.ts` — content preparation
- **[Cleanup]** Purged 200+ unused skills from `.agent/skills/`.

### Files Modified
- `components/workspace/hooks/TranslationProvider.v2.tsx` — 526→~230 LOC
- `components/workspace/hooks/useBatchOrchestrator.ts` — NEW
- `components/workspace/hooks/useSingleOrchestrator.ts` — NEW
- `components/workspace/shared/ReviewDialog.tsx` — re-render fix
- `lib/services/glossary.service.ts` — NEW
- `lib/utils/chapter-title-normalizer.ts` — NEW
- `lib/utils/prepare-chapter-payload.ts` — NEW

---

## [2.7.9] - 2026-02-25

**Top Impact**: Western name auto-detection in translation • Global corrections pool (Luyện Văn)

### Added
- **[Translator]** `[TÊN TÂY]` rule — AI auto-detects Western names in Chinese (杰克→Jack, 迈克尔→Michael) and restores original English. Prevents "Kiệt Khắc" / "Mạch Khắc Nhĩ" errors.
- **[Translator]** Split `[PHÂN VAI]` guidance: Hán names → Hán Việt, Western names → English restore.

### Changed
- **[DB]** Corrections now use a single global pool (`__global__`) shared across all workspaces. Zero API cost, pure string replace.
- **[DB]** DB v106: Auto-migration moves all workspace-scoped corrections to global pool with deduplication.

### Migration
- Automatic on first app launch after update. Old per-workspace corrections are merged into one global pool.

---

## [2.7.8] - 2026-02-24

**Top Impact**: Crawler JSON import • Multi-workspace sync • Named tunnel (raidenhub.xyz)

### Added
- **[Translator]** JSON import from Crawler app (`{ metadata, chapters }` format).
- **[Translator]** `appendChaptersFromJSON()` — append new chapters without overwriting translations.
- **[Translator]** `UpdateFromJSONCard` component in Settings tab.
- **[Sync]** Multi-workspace sync protocol — sync ALL workspaces at once.
- **[Sync]** Named tunnel `raidenhub.xyz` (fixed domain, PWA installable).
- **[Mobile]** Update button with NEW badge in reader menu.

### Fixed
- **[Sync]** Corrections from mobile routed to wrong workspace.
- **[Mobile]** Overscroll pull-to-refresh in Reader.

### Perf
- **[Build]** Rust module extraction (lib.rs 375→58 LOC), dependency trim, build 167s→32s.

---

## [2.7.6] - 2026-02-11

**Top Impact**: PWA sync fixes • Mobile install prompt • CORS enhancement

### Fixed
- **[Sync]** Tunnel URL port appending bug (mobile couldn't connect).
- **[Mobile]** PWA manifest MIME type → Chrome install prompt now works.
- **[Mobile]** Missing PWA icons (192/512).
- **[Build]** Static export for `manifest.ts`.
- **[Sync]** Disabled auto-shutdown, enhanced CORS headers.

---

## [2.7.5] - 2026-02-11

**Top Impact**: Character hijacking fix (C³ Purge) • Main character semantic tagging

### Fixed
- **[Translator]** Eliminated cross-chunk character contamination — AI no longer substitutes POV with minor chars during concurrent translation.
- **[Translator]** Double-layer glossary isolation prevents "Ghost Characters" leaking across batch chapters.
- **[Translator]** Main character auto-tagged `(Main)` in prompt for priority.
- **[Translator]** Glossary moved to end of system instruction for max saliency.

---

## [2.7.4] - 2026-02-11

**Top Impact**: Race condition fix • Title normalization • Retranslate button fix

### Fixed
- **[Translator]** Race condition: `sharedGlossary` shared by reference → `structuredClone()` + `Object.freeze()`.
- **[Translator]** Title normalization: auto-fix ALL CAPS and Title Case.
- **[UI]** Retranslate button now reloads fresh chapters from DB.

### Changed
- **[Translator]** CORE_RULES: explicit prohibition of Title Case and ALL CAPS in titles.

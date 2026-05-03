## [2.16.0] - 2026-05-02

### Top Impact
- **[Gemini][Safety][Prompt]** Implemented "Academic Shield" — proactive academic framing in the default system instruction. Reduces `PROHIBITED_CONTENT` blocks for adult/harem/urban novels with profanity by signaling a research/literary translation context from the first attempt.
- **[Gemini][Codex][Prompt]** Built an internet-slang taxonomy plus dynamic grouped prompt hints for Chinese web slang (`666`, `草泥马`, `绷不住了`, `乱七八糟`, `一脸懵逼`, etc.) so the translator stops falling back to literal Hán-Việt or read-aloud meme nonsense.
- **[Gemini][Codex][Prompt]** Hardened profanity handling toward abbreviated urban slang (`ĐM`, `đệt`, `đệch`, `vãi lol`, `vãi cứt`) and added a final sweep fix for malformed outputs like `Ta con mẹ nó`, `Ngươi con mẹ nó`, and `địt bố mày`.
- **[Gemini][Codex][Prompt]** Reworked urban-currency guidance to remove `vạn tệ` / `ức` wording and force modern numeric reads like `500 nghìn tệ`, `100 triệu tệ`, and `5 tỷ tệ`.
- **[Gemini][Codex][Post]** Unified post-processing so batch chapters now go through the same cleanup pipeline as single-chapter translation, while chunking stops re-sweeping titles with the heavy body pass.
- **[Opus][Fix]** Added Vietnamese boilerplate nav strip to `finalSweep` — auto-removes `Chương trước Mục lục Chương sau` and variants that leak through from web novel sources into translated output.

### Added
- **[Gemini][Safety][Prompt]** Proactive Academic Framing: default system instruction now identifies content as "published Chinese web novel" for "literary research and archival purposes" to decrease false-positive safety triggers from the first attempt.
- **[Gemini][Codex][Prompt]** Added `PRONOUN LOCK` as a dedicated top-level guardrail, a `Flash Lite 2.5` prompt profile, and extra few-shot coverage for lover/family/master-disciple dialogue, modern profanity, and urban money reads.
- **[Gemini][Codex][Prompt]** Added internet-slang categories (`reaction`, `praise`, `censored_profanity`, `insult`, `behavior`) plus new map entries for `666`, `太6了`, `草泥马`, `千只草泥马`, `千只草泥马奔腾而过`, `尼玛`, `绷不住了`, `离谱`, `逆天`, `乱七八糟`, and `一脸懵逼`.
- **[Gemini][Codex][Test]** Added regression coverage for grouped slang hints, profanity cleanup, meme-variant slang, and modern urban currency formatting.
- **[Gemini][Codex][Test]** Added post-processing regression coverage so batch routing, title normalization, and body cleanup stay locked to the shared pipeline.
- **[Opus][Sweep]** `finalSweep` now strips Vietnamese navigation boilerplate (`Chương trước`, `Mục lục`, `Chương sau`) that survives translation from web novel sources.
- **[Opus][Sweep]** `finalSweep` now auto-corrects `óã` → `óc` diacritic corruption in AI output.

### Changed
- **[Gemini][Safety][Prompt]** Implemented "Academic Shield" — proactive academic framing in the default system instruction. Reduces `PROHIBITED_CONTENT` blocks for adult/harem/urban novels with profanity by signaling a research/literary translation context from the first attempt.
- **[Gemini][Codex][Prompt]** Built an internet-slang taxonomy plus dynamic grouped prompt hints for Chinese web slang (`666`, `草泥马`, `绷不住了`, `乱七八糟`, `一脸懵逼`, etc.) so the translator stops falling back to literal Hán-Việt or read-aloud meme nonsense.
- **[Gemini][Codex][Prompt]** Hardened profanity handling toward abbreviated urban slang (`ĐM`, `đệt`, `đệch`, `vãi lol`, `vãi cứt`) and added a final sweep fix for malformed outputs like `Ta con mẹ nó`, `Ngươi con mẹ nó`, and `địt bố mày`.
- **[Gemini][Codex][Prompt]** Reworked urban-currency guidance to remove `vạn tệ` / `ức` wording and force modern numeric reads like `500 nghìn tệ`, `100 triệu tệ`, and `5 tỷ tệ`.
- **[Gemini][Codex][Post]** Unified post-processing so batch chapters now go through the same cleanup pipeline as single-chapter translation, while chunking stops re-sweeping titles with the heavy body pass.
- **[Opus][Fix]** Added Vietnamese boilerplate nav strip to `finalSweep` — auto-removes `Chương trước Mục lục Chương sau` and variants that leak through from web novel sources into translated output.
- **[Opus][Fix]** Added AI output typo correction `Đầu óã` → `Đầu óc` to `finalSweep` — catches known Gemini character corruption in Vietnamese diacritics.

### Files Modified
- `lib/gemini/translation/post-processor.ts` — **[Gemini][Codex][Post]** extracted shared post-processing options so both single and batch flows finalize title/body through one path.
- `lib/gemini/batch-api.ts` — **[Gemini][Codex][Post]** batch parsing now immediately runs shared post-processing for each returned chapter before handing results back to the UI.
- `lib/gemini/chunking.ts` — **[Gemini][Codex][Post]** removed redundant heavy `finalSweep` passes on non-chunked responses and stopped applying body-grade cleanup to titles after chunk merge.
- `components/workspace/hooks/useBatchOrchestrator.ts` — **[Gemini][Codex][Post]** batch UI save path now trusts already-processed chapter output instead of re-normalizing title/corrections in a second pass.
- `__tests__/post-processor.test.ts` — **[Gemini][Codex][Test]** added regression coverage for shared title/body post-processing behavior.
- `__tests__/batch-postprocess.test.ts` — **[Gemini][Codex][Test]** added regression coverage that batch output is routed through the shared post-processing pipeline.

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

## [2.15.0] - 2026-04-21

### Top Impact
- **[OAuth]** Browser Header Mimicry: Implemented `User-Agent` (Chrome/124) in both Rust and Frontend paths to reduce bot-detection surface.
- **[Observability]** Enhanced 429 Logging: Processing overlay now explicitly reports "🚨 429 Rate Limited!" when Google triggers throttling.
- **[Gemini]** Proper Name Protection: Updated system prompt and loosed normalization regex (`TITLE_CASE_RE`) to ensure character names (e.g., "Dương Quân Bác") are NOT lowercased in chapter titles.
- **[OAuth]** Precise Wait Times: `RateLimiter` now returns exact remaining milliseconds in the current window instead of a hardcoded 60s delay.
- **[OAuth]** Migration Stale Counters: Fixed a bug in `resetExpiredCounters` where missing window start timestamps in legacy data caused permanent request blocking until a manual cache clear.

### Added
- **[OAuth]** Browser Header Mimicry: Implemented `User-Agent` (Chrome/124) in both Rust and Frontend paths to reduce bot-detection surface.
- **[Observability]** Enhanced 429 Logging: Processing overlay now explicitly reports "🚨 429 Rate Limited!" when Google triggers throttling.

### Changed
- **[Gemini]** Proper Name Protection: Updated system prompt and loosed normalization regex (`TITLE_CASE_RE`) to ensure character names (e.g., "Dương Quân Bác") are NOT lowercased in chapter titles.
- **[OAuth]** Precise Wait Times: `RateLimiter` now returns exact remaining milliseconds in the current window instead of a hardcoded 60s delay.
- `src-tauri/src/gemini.rs` — HTTP error surfacing + User-Agent
- `lib/gemini/client.ts` — Auto-retry loop + 429/401 handling + User-Agent
- `lib/gemini/rate-limiter.ts` — Precise wait logic + migration reset fix
- `lib/gemini/constants.ts` — Prompt rule update for titles

### Fixed
- **[OAuth]** Migration Stale Counters: Fixed a bug in `resetExpiredCounters` where missing window start timestamps in legacy data caused permanent request blocking until a manual cache clear.
- **[Auth]** OAuth 429 Handling: Rust backend now correctly surfaces HTTP 429 status codes to the frontend orchestrator for retry processing.

## [2.14.0] - 2026-04-16

### Top Impact
- **[Gemini]** Native OAuth 2.0 flow via Tauri/Rust to bypass CORS "Failed to fetch" errors.
- **[Auth]** Combined `exchange_code_native` command for unified token + user info retrieval.
- **[UI]** Detailed OAuth indicators in Max Ping panel (Delay, Quota, Response Time).
- **[Performance]** Optimized `rate-limiter.ts` for Ultra subscribers: 3s delay → 0.3s.
- **[Performance]** RPM increased to 30; Burst cooldown reduced to 5s.

### Added
- **[Gemini]** Native OAuth 2.0 flow via Tauri/Rust to bypass CORS "Failed to fetch" errors.
- **[Auth]** Combined `exchange_code_native` command for unified token + user info retrieval.
- **[UI]** Detailed OAuth indicators in Max Ping panel (Delay, Quota, Response Time).

### Changed
- **[Performance]** Optimized `rate-limiter.ts` for Ultra subscribers: 3s delay → 0.3s.
- **[Performance]** RPM increased to 30; Burst cooldown reduced to 5s.

## [2.12.0] - 2026-03-28

### Top Impact
- **[Translator]** `XƯNG HÔ` Rule Expansion: Full 10 pairs of Chinese pronouns (我/你/他/她/它/我们/你们/他们/她们/它们) mapped to Vietnamese equivalents with context-aware flexibility (e.g., 她=Nàng/Cô ấy).
- **[AI]** `SOFT_WRAPPER_VERB_BLOCKLIST` — Danh sách chặn 50+ động từ/tính từ phổ biến để lọc rác cho Term Audit.
- **[AI]** Term Audit Filter: Strip trailing punctuation (,, ;, ., !, ?) khỏi các term trích xuất.
- **[AI]** Term Audit Extractor: Loại bỏ quantifiers (loạt/mấy/vài) và demonstratives (này/kia) tự động.
- **[Build]** `SYSTEM_VERSION` → `v3.4` (Core rules updated).

### Added
- **[Translator]** `XƯNG HÔ` Rule Expansion: Full 10 pairs of Chinese pronouns (我/你/他/她/它/我们/你们/他们/她们/它们) mapped to Vietnamese equivalents with context-aware flexibility (e.g., 她=Nàng/Cô ấy).
- **[AI]** `SOFT_WRAPPER_VERB_BLOCKLIST` — Danh sách chặn 50+ động từ/tính từ phổ biến để lọc rác cho Term Audit.
- **[AI]** Term Audit Filter: Strip trailing punctuation (,, ;, ., !, ?) khỏi các term trích xuất.
- **[AI]** Term Audit Extractor: Loại bỏ quantifiers (loạt/mấy/vài) và demonstratives (này/kia) tự động.

### Changed
- **[Build]** `SYSTEM_VERSION` → `v3.4` (Core rules updated).
- **[AI]** Term Audit Engine: Yield-to-main thread pattern during scan to prevent UI freeze on large chapter blocks.
- **[Build]** `package.json`, `tauri.conf.json` — 2.11.0 → 2.12.0.
- **Shelved Term Audit**: Tính năng hiện đang để **OFF** mặc định (`featureFlags.termAudit = false`) do extractor vẫn còn sinh noise với truyện hiện đại. Cần tuning theo genre trong tương lai.

### Fixed
- **[AI]** Term Audit extraction noise: Fixed "soft wrapper" over-detection by enforcing 1st content token check against blocklist.

## [2.11.0] - 2026-03-24

### Top Impact
- **[AI]** `term-audit.types.ts` — Types: `TermCluster`, `TermOccurrence`, `ClusterMode` (`auto`, `review`, `protected-related`), `TermAuditReport`, `TermFixResult`
- **[AI]** `term-audit.extraction.ts` — Anchor-first extractor: hard anchors (giả, sư, tông, môn, phái…) + soft wrappers (người, kẻ, tên) với validity guard
- **[AI]** `term-audit.normalization.ts` — NFC, ascii-fold, generic head stripping → stable `rootHint`
- **[AI]** `term-audit.clustering.ts` — Bucket-based greedy merge: score (edit-distance + shared-prefix + set-overlap) ≥ 0.72 = merge; Review Zone 0.60–0.71; canonical guard chống chain-merge
- **[AI]** `term-audit.autofix.ts` — Tạo CorrectionEntry → `sweepSingleRule()`; 3 guards: confirmed, variants ≥ 2, scanRunId match

### Added
- **[AI]** `term-audit.types.ts` — Types: `TermCluster`, `TermOccurrence`, `ClusterMode` (`auto`, `review`, `protected-related`), `TermAuditReport`, `TermFixResult`
- **[AI]** `term-audit.extraction.ts` — Anchor-first extractor: hard anchors (giả, sư, tông, môn, phái…) + soft wrappers (người, kẻ, tên) với validity guard
- **[AI]** `term-audit.normalization.ts` — NFC, ascii-fold, generic head stripping → stable `rootHint`
- **[AI]** `term-audit.clustering.ts` — Bucket-based greedy merge: score (edit-distance + shared-prefix + set-overlap) ≥ 0.72 = merge; Review Zone 0.60–0.71; canonical guard chống chain-merge
- **[AI]** `term-audit.autofix.ts` — Tạo CorrectionEntry → `sweepSingleRule()`; 3 guards: confirmed, variants ≥ 2, scanRunId match
- **[AI]** `term-audit.service.ts` — Orchestrator: extract → cluster → enrich (Glossary/Correction lookup)

### Changed
- **[Build]** `featureFlags.ts` — +`termAudit: false` (off-switch)
- **[UI]** `IntelligenceHub.tsx` — +ScanSearch icon, +TermAuditModule import, +termAudit ModuleType
- Anchor-first extraction tránh n-gram rác • No auto-merge ở Review Zone • scanRunId guard reset confirm khi rescan • Protected terms → chỉ show, không merge • Reuse sweepSingleRule từ corrections.service.ts
- `lib/featureFlags.ts`, `components/workspace/intelligence/IntelligenceHub.tsx`
- `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` — 2.10.1 → 2.11.0

## [2.10.1] - 2026-03-23

### Top Impact
- **[Translator]** Batch prompt gọi `buildSystemInstruction()` không truyền `isBatch=true` → "CẤM JSON" conflict với JSON output yêu cầu. Flash output không ổn định.
- **[Translator]** `CURRENCY_RULE`: 万→nghìn tệ SAI 10x. Sửa thành 万→vạn tệ (mười nghìn) + đầy đủ 千万, 亿.
- **[Translator]** `WESTERN_NAME_RULE` fallback "ghi chú" mâu thuẫn CẤM Hán tự + CẤM giải thích. Sửa: "giữ phiên âm Latin hóa, KHÔNG ghi chú".
- **[Translator]** `[HARD LIMIT]` ẩn chủ ngữ quá cứng → mờ nhân vật scene đông người. Nới thành "NÊN hạn chế, ĐƯỢC PHÉP nếu cần rõ nghĩa".
- **[Translator]** `IDIOM_RULE` dead code — export nhưng không dùng `ALL_RULES`. Comment DEPRECATED.

### Changed
- **[Translator]** Thêm rule `[VIẾT HOA]`: Sentence case cho text `[]` với ví dụ SAI/ĐÚNG.
- **[Translator]** `FLOW_RULE`: "Tuyệt đối không..." → "Ưu tiên tránh..., ĐƯỢC PHÉP nếu cần rõ nghĩa".
- `lib/gemini/batch/prompt.ts` — `isBatch=true`
- `lib/gemini/constants.ts` — 5 rule fixes + [VIẾT HOA]
- `lib/gemini/text/casing.ts` — capitalize `[]` post-process (step 3.5)

### Fixed
- **[Translator]** Batch prompt gọi `buildSystemInstruction()` không truyền `isBatch=true` → "CẤM JSON" conflict với JSON output yêu cầu. Flash output không ổn định.
- **[Translator]** `CURRENCY_RULE`: 万→nghìn tệ SAI 10x. Sửa thành 万→vạn tệ (mười nghìn) + đầy đủ 千万, 亿.
- **[Translator]** `WESTERN_NAME_RULE` fallback "ghi chú" mâu thuẫn CẤM Hán tự + CẤM giải thích. Sửa: "giữ phiên âm Latin hóa, KHÔNG ghi chú".
- **[Translator]** `[HARD LIMIT]` ẩn chủ ngữ quá cứng → mờ nhân vật scene đông người. Nới thành "NÊN hạn chế, ĐƯỢC PHÉP nếu cần rõ nghĩa".
- **[Translator]** `IDIOM_RULE` dead code — export nhưng không dùng `ALL_RULES`. Comment DEPRECATED.
- **[Translator]** Đại từ đầu câu viết thường (hắn/nàng/ngươi). Tách rule: "GIỮA CÂU viết thường / ĐẦU CÂU BẮT BUỘC hoa".

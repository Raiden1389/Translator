# Archive — April 2026

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
- `src-tauri/src/gemini.rs`
- `lib/gemini/client.ts`
- `lib/gemini/rate-limiter.ts`
- `lib/gemini/constants.ts`
- `lib/utils/title-normalizer.ts`

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

## [2.13.0] - 2026-04-13

**Top Impact**: Native Gemini OAuth Integration • CORS isolation (Rust Backend) • Ultra High-Throughput (~5.4 chapters/min) • Real-time display logs

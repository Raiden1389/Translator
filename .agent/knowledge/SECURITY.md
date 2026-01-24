# Security Architecture: Zero-Trust Principles

This document codifies the security standards implemented to protect user data and API credentials in Raiden AI Translator.

## 1. Native Bridge Architecture
All AI requests MUST route through the Rust backend via the `native_gemini_request` command.
- **Goal:** Isolate API keys from the Chromium WebView heap to prevent exfiltration via XSS or developer console.
- **Rule:** Frontend code NEVER handles the raw `GEMINI_API_KEY`. It only sends payloads to the backend.

## 2. Filesystem Strategy
The application adheres to strict directory whitelisting.
- **Scopes:** Only `$APP_DATA`, `$DOWNLOADS`, `$DOCUMENTS`, and whitelisted cloud sync drives (e.g., `H:\` for Google Drive) are accessible.
- **Enforcement:** Defined in `src-tauri/capabilities/default.json`.

## 3. Native Key Rotation
Key rotation logic lives in `lib/gemini/client.ts` but the keys themselves are fetched securely via the native bridge.
- Failure of a primary key triggers an automatic fallback to the pool without user intervention.

## 4. CSP (Content Security Policy)
The app runs with a hardened CSP.
- `unsafe-eval` is disabled to prevent common RCE vectors from malicious imported scripts.

# 🛑 AI SAFETY CONTRACT — SOLO DEV

Minimal, hard rules for AI agents. Speed first. No collateral damage.

## 1️⃣ ALLOWED WORKSPACE (HARD LIMIT)
You may ONLY read/write inside:
`C:\Users\Admin\.gemini\antigravity\scratch`
Anything outside this path is FORBIDDEN. If an action exceeds scope → STOP.

## 2️⃣ DEFAULT MODE = READ-ONLY
Assume READ-ONLY at all times.
Write access is granted only when explicitly instructed.
If unsure → ASK.

## 3️⃣ WRITE CONFIRMATION (MANDATORY)
Before ANY write (edit / create / delete / rename), you MUST:
- Show full file path
- State exact action
- Give a short diff summary
- Wait for explicit approval. No approval = NO write.

## 4️⃣ NO "AI GOD MODE"
NOT allowed:
- Auto refactors
- Cleanup passes
- Architecture changes
- Bulk / recursive edits
Only touch what the user names.

## 5️⃣ WINDOWS ONLY
Assume Windows + PowerShell
DO NOT use: `grep`, `sed`, `awk`, `bash` tools.
Use `sls` (Select-String) for searching.

## 6️⃣ DANGEROUS COMMANDS = FORBIDDEN
- `rm` / `del`
- `Remove-Item -Recurse`
- `git reset --hard`
- `git clean -fd`
If cleanup is needed → ASK FIRST.

## 7️⃣ SAFETY OVERRIDE
If rules conflict or action feels destructive: STOP and ask.

---
**CRITICAL · ALWAYS ENFORCE · DO NOT OVERRIDE**

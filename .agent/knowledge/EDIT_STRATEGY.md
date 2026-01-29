**The agent is responsible for correctness and must not assume missing code is acceptable.**

# EDIT STRATEGY RULE (REPLACE vs OVERWRITE) v2.1

## 🎯 CORE CRITERIA
- Use **REPLACE** ONLY when ALL conditions are true:
  - File length < 200 lines.
  - Edit affects ≤ 10 consecutive lines.
  - No change to structure (JSX tree, hooks order, state shape, layout, animation, UX flow).
  - Target text is copied EXACTLY from the file.
  - The file has never failed a tool edit before.

- Use **OVERWRITE** in ALL other cases.

## 🛡️ GATEKEEPER RULES
1. **Context Recall Verification:**
   - Before overwriting a file > 300 lines, the Agent MUST use `view_file` on the entire current content again to ensure all existing logic, environment variables, and legacy imports are preserved.
2. **The 3-Point Syntax Check:**
   - After each overwrite, the Agent MUST self-check:
     - (1) Is the **export default/named** still correctly named and present?
     - (2) Are there any **missing brackets** `}` or `)` (Syntax Integrity)?
     - (3) Are **critical imports** still present (e.g., React, Lucide, specialized hooks)?

## 🧠 INTERNAL INTEGRITY CHECK (Logical Skill)
- When overwriting, the Agent must perform a mental comparison of the **original vs new** file structure.
- **Action:** List all top-level exports, constants, and functions. If any are missing in the new version, the Agent MUST report the discrepancy and fix it before claiming task completion.

## 🧱 HARD GUARDS
- If the exact target text is NOT found during a REPLACE attempt, **STOP IMMEDIATELY** and switch to OVERWRITE.
- If a tool edit has failed once on a file, **ALWAYS** use OVERWRITE for that file in the future.

## ⚠️ DEFAULT BRAKE
- When uncertain, ambiguous, or if the file contains complex UI/UX logic, **ALWAYS choose OVERWRITE**.

---
title: Guidelines
createdAt: '2026-02-03T11:52:18.912Z'
updatedAt: '2026-02-03T11:53:21.659Z'
description: AI Guidelines
---
# AI Guidelines

## Custom Rules
- **Decision Making:** High autonomy level - take initiative in technical decisions.
- **Model Awareness:** ALWAYS remember the project uses **Gemini 2.5 Flash**. Do not mention 1.5 unless requested.

## 🛑 UI/UX Safety Lock (MANDATORY)
**Rule:** NEVER delete or modify UI elements without explicit user permission.

**Forbidden Actions:**
1. ❌ **NO UNSOLICITED DELETIONS** - Cannot delete any UI element, button, or feature unless user explicitly requests
2. ❌ **NO LAYOUT CHANGES ON REFACTOR** - "Refactor" or "Clean code" means internal logic only, NOT layout changes
3. ❌ **NO "CLEANUP" BY REMOVAL** - "Clean" means better code, NOT fewer features

**Required Actions:**
1. ✅ **FEATURE AUDIT** - Before saving any UI file (Header, Sidebar, Modal), verify ALL existing features still present
2. ✅ **PRESERVE CUSTOM LOGIC** - Respect user's custom UI logic (Reader Navigation, Range Selector, etc.)
3. ✅ **STRICT SCOPE** - Only modify what user explicitly asked for

**Rationale:** User spent time designing UI. Don't accidentally delete their work.

## Bug Fix Protocol (MANDATORY)
**Rule:** When fixing ANY bug, MUST document it in `troubleshooting.md`.

**Required Information:**
1. **Date** - When bug was discovered
2. **Severity** - 🔴 Critical / 🟡 Medium / 🟢 Low
3. **Symptom** - What user sees/experiences
4. **Root Cause** - Why it happened (technical explanation)
5. **Solution** - Code changes made (with examples)
6. **Prevention** - How to avoid in future
7. **Files Changed** - List of affected files

**Workflow:**
1. Fix the bug
2. Update `troubleshooting.md` immediately
3. Commit both code fix + doc update together
4. Reference troubleshooting doc in commit message

**Rationale:** Build institutional memory. Next time similar bug occurs, check troubleshooting.md first before debugging from scratch.

## Git Workflow (CRITICAL)
**Rule:** NEVER auto-commit OR auto-stage. Only when user explicitly says "commit".

**Forbidden Actions:**
- ❌ Auto-committing after every change
- ❌ Auto-staging with `git add` after every file
- ❌ Committing without user approval
- ❌ Multiple commits in one session without permission

**Allowed Actions:**
- ✅ Show `git status` or `git diff` when asked
- ✅ ONLY when user says "commit", "lưu lại", "save", "push":
  1. Run `git add -A` (stage all)
  2. Run `git commit -m "..."`

**Workflow:**
1. Make code changes
2. **DO NOTHING with git**
3. **WAIT for user to say "commit"**
4. Only then: `git add -A && git commit -m "..."`

**Rationale:** User wants full control. Don't touch git until explicitly told.

## SDD Protocol (Spec-Driven Development)
**Rule:** NEVER code immediately. Always create spec first.

**Workflow:**
1. **Brainstorm** - Understand user requirements
2. **Create Spec** - Write `BRIEF.md` or `implementation_plan.md`
3. **Get Approval** - Wait for user to approve spec
4. **Then Code** - Only after approval

**Reverse Engineering Mindset:**
- Start from **Output** (what user sees)
- Then **Logic** (how to process)
- Finally **Input** (what data needed)

**Rationale:** Prevents wasted effort on wrong solution. Spec = contract.

## ⛔ Hard Test Gate (NON-NEGOTIABLE)
**Rule:** FORBIDDEN to say "Done", "Fixed", "Should work" without proof.

**Required After ANY Code Change:**
1. **Real Test** - Run actual command (`npm run build`, `npm run dev`, etc.)
   OR
2. **Simulated Test** - Step-by-step execution with concrete inputs/outputs

**Reasoning ≠ Testing:**
- "This should work because..." → ❌ NOT ACCEPTED
- "Tested with input X, got output Y" → ✅ ACCEPTED

**Test Report Format (MANDATORY):**
```
#### 🧪 TEST REPORT
- Test type: (build / runtime / integration / manual)
- Command executed: npm run build
- Expected result: Build passes
- Actual result: ✓ Compiled successfully
- Status: PASS
```

**If Cannot Test:**
```
TEST NOT EXECUTED
- Assumptions: [list]
- Risk surface: [what could break]
- Would break first: [prediction]
```

**Rationale:** No untested code. Period.

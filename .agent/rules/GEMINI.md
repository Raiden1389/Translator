---
trigger: always_on
---

# 🚀 GEMINI.md - The Antigravity Core Protocol

## 🛡️ NON-TECH SAFETY PROTOCOL (GEMINI FLASH)
> 🔴 **ABSOLUTE RULE:** Prevent hallucination/unauthorized deletion.

1. **Atomic Salami Slicing**: MAX **1 file** and **1 specific goal** per tool call. NO mixing Logic/UI. AI declares intent -> Execution -> Report. NO auto-task chaining.
2. **Impact Report**: Before any write, provide: 🎯 Mục tiêu | 🧩 Thay đổi | 🗑️ Xóa/Ghi đè (YES/NO) | ⚠️ Rủi ro | 🔙 Rollback (YES/NO).
3. **Sensitivity Levels**: 🔴 **Vùng Đỏ** (Logic/UI/DB): Fix ONLY, NO refactor/arch shifts without approval. 🟢 **Vùng Xanh** (CSS/Lint): Auto-optimize with summary.
4. **Knowns-First Integrity**: Source: `ARCH_DECISIONS.md`. Check conflicts -> Stop if mâu thuẫn. Document Why/How/Rejected.

---

## 🏛️ AGENT & SKILL PROTOCOL (START HERE)
> **MANDATORY:** P0 (GEMINI.md) > P1 (Agent) > P2 (Skill). Read before implementation.

### 1. Request Classifier (Step 1)
| Type | Keywords | Tiers | Result |
| --- | --- | --- | --- |
| **QUESTION** | "what is", "how" | 0 | Text |
| **SURVEY** | "analyze", "list" | 0+Exp | Intel |
| **SIMPLE** | "fix", "add" (1 file) | 0+1 | Edit |
| **COMPLEX** | "build", "refactor" | 1+Agent | Plan Required |

### 2. Intelligent Routing & Socratic Gate
Analyze domain -> Select specialist -> State: `🤖 Applying @[agent]...`.
**Socratic Gate:** Confirm understanding BEFORE action. 3 questions for builds.

---

## 🧹 TIER 0: UNIVERSAL RULES (Always Active)
- **Clean Code**: Concise, AAA Testing, 2025 Perf standards.
- **Language**: Translate internally to English. Output in USER's language.
- **Dependency Awareness**: Check `CODEBASE.md` & `ARCHITECTURE.md` before edits.
- **Documentation**: MANDATORY update to MCP Knowns, `CHANGELOG.md` & `progress.md`.

---

## 🛠️ TIER 1: EXECUTION RULES

### 1. Project Type Routing
| Type | Primary Agent | Skills |
| --- | --- | --- |
| **WEB** | `frontend-specialist` | frontend-design |
| **BACKEND** | `backend-specialist` | api-patterns, database-design |

### 2. Socratic Strategy
| Request | Action |
| --- | --- |
| **New Filter/Build** | Deep Discovery (3 questions) |
| **Bug Fix** | Context Check + Impact |
| **Direct "Proceed"** | Validation (2 edge-cases) |

---

## 🏁 FINAL CHECKLIST & REFERENCE
**Order:** 1. Security -> 2. Lint -> 3. Schema -> 4. Tests -> 5. UX -> 6. SEO.
Script list & Gemini Modes: `.agent/rules/REFERENCE.md`.

### 📁 Quick Links
- **Decision Log**: `ARCH_DECISIONS.md`
- **System Map**: `ARCHITECTURE.md` | Agents: `.agent/`

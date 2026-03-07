---
title: Session 2026-03-06 — SKILL Rebuild & Translation Quality Testing
createdAt: '2026-03-07T09:11:06.926Z'
updatedAt: '2026-03-07T09:11:06.926Z'
description: >-
  Rebuilt chinese-vietnamese-translator SKILL v2.0 and rewrote dich.md workflow.
  Live tested with Ch46-47, achieving A- grade.
tags:
  - translation
  - skill
  - quality-gate
  - workflow
---
# Session 2026-03-06 — SKILL Rebuild & Translation Quality Testing

## Objective
Rebuild the `chinese-vietnamese-translator` SKILL.md from scratch and rewrite `dich.md` workflow to properly integrate it. Test translation quality with live chapters.

## Completed Tasks
1. **Rebuilt SKILL.md v2.0** — All-in-one file (345 lines), consolidated rules from Raiden codebase (constants.ts, idioms.ts, intensity.ts, register.ts)
2. **Rewrote dich.md** — Pure orchestration layer (142→~90 lines), removed duplicate rules, added mandatory Step 0 forcing agent to read SKILL
3. **Live tested Ch46** — Grade B → A- (after glossary fix)
4. **Live tested Ch47** — Grade B+ → A- (after fixing 3 issues)
5. **Traced glossary pipeline** — Found root cause of bad glossary entry (黎明=Minh from Heuristic auto-detect)

## Key Decisions
- **SKILL.md = master** for all translation rules. dich.md = orchestration only
- **No resources/ folder** — all-in-one under 500 lines
- **Workflow Step 0 FORCES** agent to read SKILL before translating
- **Glossary quality**: AI Heuristic Scanner can produce bad entries (黎明→Minh instead of Lê Minh/Bình Minh). Not a code bug, but AI output quality in extractGlossary prompt

## Quality Gate Results
| Chapter | Initial Grade | After Fix | Issues Found |
|---------|--------------|-----------|--------------|
| Ch46 | B | A- (9.3) | Glossary violation (黎明), meaning deviation (间隙), typos |
| Ch47 | B+ | A- (9.0) | Blacklist leak (dường như), hallucinated vocab (không nảy, lỗi lỗi) |

## Common Flash Issues Identified
- Blacklist words still leak through (~1 per chapter)
- Occasional hallucinated Vietnamese words that don't exist
- Glossary bad entries from Heuristic auto-approve leak into translation

## Proposed Improvement
Mechanical QA scan (not AI) before writing outbox files:
1. Blacklist regex scan → auto-replace
2. Glossary consistency check
3. Hán tự scan [\\u4e00-\\u9fff]
4. Known typo pattern check

## Files Modified
- `.agent/skills/chinese-vietnamese-translator/SKILL.md` — Rebuilt v2.0
- `.agent/workflows/dich.md` — Rewritten to pure orchestration

## Next Steps
- Implement mechanical QA scan step in dich.md
- Consider improving extractGlossary prompt for better Hán Việt accuracy
- Build growing list of Flash hallucination patterns for scan

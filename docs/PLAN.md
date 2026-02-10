# PLAN: Addressing Translation Bug & AI Scout Finalization

## 📋 Overview
Finalize the removal of the AI Scout (Always-On Discovery) feature and address the newly reported "translation bug" to ensure maximum stability and performance.

## 👥 Agents Involved
1. **project-planner**: Initial breakdown and task coordination.
2. **explorer-agent**: Root cause analysis of the "translation bug" and identifying dead code.
3. **frontend-specialist**: Final UI cleanup and fixing broken overlays if any.
4. **test-engineer**: Verification of translation logic and fix for reported bug.

## 📍 Phase 1: Research & Discovery (explorer-agent)
- [ ] Investigate `lib/gemini/translation/parser.ts` for any logic broken by the AI Scout removal.
- [ ] Check `TranslationProvider.v2.tsx` to see if the "bug" is related to UI update cycle or failed chapter results.
- [ ] Analyze the "bug" reported by the user (likely related to missing content or title casing issues introduced during refactor).

## 🔨 Phase 2: Implementation (frontend-specialist, debugger)
- [ ] Fix the discovered translation bug.
- [ ] Remove `lib/gemini/discovery-utils.ts` if no longer used.
- [ ] Clean up `app/styles/utilities.css` for any leftover styles.
- [ ] Handle lint errors in `TranslationProvider.v2.tsx` and `TranslateConfigDialog.tsx`.

## ✅ Phase 3: Verification (test-engineer)
- [ ] Run `npm run lint` on modified files.
- [ ] Perform a test translation batch (2-3 chapters) in the development environment.
- [ ] Verify that manual Radar Scan still works in Intelligence Hub.
- [ ] Final Audit of `docs/RAIDEN_AUDIT_2026_02_09.md`.

## ⏭️ Next Steps after Approval
1. Execute explorer-agent tasks.
2. Parallel implementation by specialists.
3. Verification and handover.

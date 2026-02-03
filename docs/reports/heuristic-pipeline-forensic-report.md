# 🔬 TECHNICAL DIAGNOSTIC REPORT
## Entity Extraction Heuristic Pipeline - Forensic Analysis

**Date**: 2026-02-03  
**System Version**: Heuristic Engine 2.0 (The Context Purge)  
**Analysis Scope**: Character Names (秦明), Skills (雷霆一击), Locations (青云城)

---

## EXECUTIVE SUMMARY

The current pipeline implements an **ultra-strict "Opt-in" philosophy** where entities must pass through **6 sequential filtering layers**. Each layer has **DROP conditions** that can silently eliminate valid entities. This report identifies **exact failure points** for the three entity types.

**Primary Failure Cause**: **Pattern Matching Layer + Anchor-Only Character Detection**

---

## LAYER-BY-LAYER ANALYSIS

### ═══════════════════════════════════════════════════
### LAYER 1: PATTERN MATCHING (tagger.ts:179-193)
### ═══════════════════════════════════════════════════

**Purpose**: Initial entity detection via regex patterns.

#### 1.1 Skill Pattern
**Code**: Line 180
```typescript
const skillPattern = new RegExp(`[\\u4e00-\\u9fa5]{1,4}[${SKILL_SUFFIXES.join('')}]`, 'g');
```

**SKILL_SUFFIXES** (patterns.ts:7):
```
['功', '诀', '法', '步', '术', '拳', '掌', '剑', '阵', '经', '典', '指', '印']
```

**Test Case: 雷霆一击**

| Input | Pattern Match | Result | Reason |
|-------|--------------|--------|---------|
| 雷霆一击 | `[\\u4e00-\\u9fa5]{1,4}[功诀法...]` | ❌ **DROPPED** | Does NOT end with any suffix in SKILL_SUFFIXES |

**ROOT CAUSE**: The skill "雷霆一击" ends with "击" which is **NOT** in the SKILL_SUFFIXES array. The pattern **requires** a suffix match.

---

#### 1.2 Location Pattern
**Code**: Line 181
```typescript
const locationPattern = new RegExp(`[\\u4e00-\\u9fa5]{1,4}[${LOCATION_SUFFIXES.join('')}]`, 'g');
```

**LOCATION_SUFFIXES** (patterns.ts:8):
```
['城', '府', '山', '谷', '洞', '宫', '殿', '宗', '门', '阁', '院', '寺', '岛', '界', '域', '海', '墟', '江', '湖', '岭', '峰']
```

**Test Case: 青云城**

| Input | Pattern Match | Result | Reason |
|-------|--------------|--------|---------|
| 青云城 | `[\\u4e00-\\u9fa5]{1,4}[城府山...]` | ✅ **MATCHED** | Ends with '城' |

**Status**: PASSES Layer 1, proceeds to Layer 2.

---

#### 1.3 Character Pattern (Anchor-Based)
**Code**: Line 189-192
```typescript
const allAnchors = [...HARD_CHARACTER_ANCHORS, ...SOFT_CHARACTER_ANCHORS, ...SOCIAL_MODIFIERS];
const anchorPattern = new RegExp(`([\\u4e00-\\u9fa5]{2,4})(${allAnchors.join('|')})`, 'g');
```

**HARD_CHARACTER_ANCHORS** (patterns.ts:12):
```
['说道', '笑道', '喝道', '怒道', '问道', '答道', '冷声', '沉声', '低声', '传音', '吐口', '开口']
```

**SOFT_CHARACTER_ANCHORS** (patterns.ts:13):
```
['看向', '走来', '点头', '摇头', '叹息', '冷笑', '皱眉', '跨步', '跃起', '走入', '凝視']
```

**Test Case: 秦明**

| Input Context | Pattern Match | Result | Reason |
|--------------|--------------|--------|---------|
| 秦明 (standalone) | `([\\u4e00-\\u9fa5]{2,4})(说道\|笑道\|...)` | ❌ **DROPPED** | NO anchor word following the name |
| 秦明说道 | `([\\u4e00-\\u9fa5]{2,4})(说道\|笑道\|...)` | ✅ **MATCHED** | Captures "秦明" (group 1) + "说道" (group 2) |

**ROOT CAUSE**: Character detection is **100% anchor-dependent**. If "秦明" appears without a behavioral anchor (说道, 笑道, etc.), it is **NEVER DETECTED** at Layer 1.

---

### ═══════════════════════════════════════════════════
### LAYER 2: CLEANUP & NORMALIZATION (tagger.ts:72-87)
### ═══════════════════════════════════════════════════

**Input**: Raw matched strings from Layer 1.

#### 2.1 OCR Normalization (Line 64-70)
**OCR_CONFUSION_MAP** (patterns.ts:60-62):
```typescript
{ 'l': '一', '丨': '一', '工': '功', '未': '末', '土': '士', '日': '目' }
```

**Test Cases**:

| Input | After OCR Normalization | Drop? |
|-------|------------------------|-------|
| 青云城 | 青云城 (no change) | ❌ No |
| 秦明说道 | 秦明说道 (no change) | ❌ No |

**Status**: All test cases pass.

---

#### 2.2 TRAILING_VERBS Stripping (Line 74-78)
**TRAILING_VERBS** (patterns.ts:29-32):
```
['笑着', '笑道', '说罢', '暗中', '缓缓', '慢慢', '正在', '平静地', '已经在', '露出', '微微', '一般', '一样', '的话', '之类', '似的', '而言', '之中', '之外', '之内']
```

**Test Cases**:

| Input | Ends with TRAILING_VERB? | After Strip | Drop? |
|-------|-------------------------|-------------|-------|
| 青云城 | No | 青云城 | ❌ No |
| 秦明 (from "秦明说道") | No | 秦明 | ❌ No |

**Note**: The anchor "说道" is already removed by the regex capture group (match[1] only captures the name part).

---

#### 2.3 GrammarStripper (Line 80-84)
**File**: grammar-stripper.ts

**Decision Tree**:
1. **REJECT** if pure grammar word (Line 56-58)
2. **REJECT** if starts with grammar head (Line 61-65)
3. **STRIP_TAIL** if ends with grammar/verb tail (Line 67-87)
4. **REJECT** if length < 2 after strip (Line 90-94)

**Test Cases**:

| Input | Grammar Decision | Cleaned | Drop? | Reason |
|-------|-----------------|---------|-------|---------|
| 青云城 | KEEP | 青云城 | ❌ No | Not in GRAMMAR_WORDS, no grammar head/tail |
| 秦明 | KEEP | 秦明 | ❌ No | Not in GRAMMAR_WORDS, no grammar head/tail |

**Status**: All test cases pass Layer 2.

---

### ═══════════════════════════════════════════════════
### LAYER 3: EARLY HEURISTIC FILTERS (tagger.ts:106-130)
### ═══════════════════════════════════════════════════

**Input**: Cleaned strings from Layer 2.

#### 3.1 Noun Gate - looksLikeEntity() (Line 110-117)

**Code** (Line 50-53):
```typescript
function looksLikeEntity(core: string): boolean {
    if (!core) return false;
    return /[王帝皇尊宗师祖君侯主徒妖神圣长官人城府山脉谷洞殿宫门阁院岛界域功诀法术拳掌剑阵经]/.test(core);
}
```

**Application Logic** (Line 112-117):
```typescript
if (type !== 'character') {
    const isPotentialName = core.length >= 2 && core.length <= 4;
    if (!isPotentialName && !looksLikeEntity(core)) {
        return; // DROP
    }
}
```

**Test Cases**:

| Input | Type | Length Check | looksLikeEntity() | Result | Reason |
|-------|------|-------------|-------------------|--------|---------|
| 青云城 | location | 3 (2-4) ✅ | Contains '城' ✅ | ✅ PASS | isPotentialName=true OR contains keyword |
| 秦明 | character | N/A | N/A | ✅ PASS | Noun Gate **NOT applied** to characters (Line 112) |

**Status**: All test cases pass.

---

#### 3.2 FUNCTION_PREFIX Filter (Line 119-122)

**FUNCTION_PREFIX** (Line 37-41):
```
['这', '那', '你', '我', '他', '她', '它', '若', '如', '若非', '好像', '仿佛', '已经', '正在', '可以', '似乎', '所谓', '本', '该', '其']
```

**Logic**:
```typescript
if (type !== 'skill' && type !== 'character') {
    if (core && FUNCTION_PREFIX.some(p => core!.startsWith(p))) return; // DROP
}
```

**Test Cases**:

| Input | Type | Starts with FUNCTION_PREFIX? | Result | Reason |
|-------|------|----------------------------|--------|---------|
| 青云城 | location | No | ✅ PASS | Does not start with any prefix |
| 秦明 | character | N/A | ✅ PASS | **Exempted** from this filter |

**Status**: All test cases pass.

---

#### 3.3 VERB_PREFIX Filter (Line 124-125)

**VERB_PREFIX** (Line 43-45):
```
['走', '迈', '喊', '看', '觉得', '发现', '进入', '冲进', '杀', '斩', '取出', '望着', '看到', '见到']
```

**Logic**:
```typescript
if (core && VERB_PREFIX.some(v => core!.startsWith(v))) return; // DROP
```

**Test Cases**:

| Input | Starts with VERB_PREFIX? | Result | Reason |
|-------|-------------------------|--------|---------|
| 青云城 | No | ✅ PASS | Does not start with verb |
| 秦明 | No | ✅ PASS | Does not start with verb |

**Status**: All test cases pass.

---

#### 3.4 isBlacklisted() (Line 127)

**Code** (Line 55-59):
```typescript
function isBlacklisted(core: string): boolean {
    if (!core) return true;
    if (core.length < 2) return false;
    return HEURISTIC_BLACKLIST.includes(core);
}
```

**HEURISTIC_BLACKLIST** (patterns.ts:48-56): 56 items including function words, determiners, etc.

**Test Cases**:

| Input | In HEURISTIC_BLACKLIST? | Result |
|-------|------------------------|--------|
| 青云城 | No | ✅ PASS |
| 秦明 | No | ✅ PASS |

**Status**: All test cases pass.

---

#### 3.5 deepStripPrefix() (Line 129-130)

**Code** (Line 89-104):
```typescript
const deepStripPrefix = (e: string): string => {
    let cur = e;
    let limit = 3;
    while (limit-- > 0) {
        let stripped = cur;
        for (const v of VERB_PREFIX_STRIP) {
            if (cur.startsWith(v)) {
                stripped = cur.slice(v.length);
                break;
            }
        }
        if (stripped === cur) break;
        cur = stripped;
    }
    return cur;
};
```

**VERB_PREFIX_STRIP** (rank-resolver.ts:74-76):
```
['到', '用', '过', '去', '来', '骑', '乘', '走', '让', '给', '被', '为', '使', '令', '持', '握', '拿', '带', '背', '负', '驭', '御', '催', '驱', '引', '动', '夺', '抢']
```

**Test Cases**:

| Input | Starts with VERB_PREFIX_STRIP? | After Strip | Length Check | Result |
|-------|-------------------------------|-------------|--------------|--------|
| 青云城 | No | 青云城 | 3 >= 2 ✅ | ✅ PASS |
| 秦明 | No | 秦明 | 2 >= 2 ✅ | ✅ PASS |

**Status**: All test cases pass Layer 3.

---

### ═══════════════════════════════════════════════════
### LAYER 4: TYPE-SPECIFIC GATES (tagger.ts:144-151)
### ═══════════════════════════════════════════════════

#### 4.1 Rank Resolver (TITLE ONLY) - Line 144-151

**Logic**:
```typescript
if (type === 'title') {
    const rankShape = resolveRankV18(core);
    if (rankShape === 'RANK') return; // DROP
    
    const rankCtx = classifyRankContext(core);
    if (rankCtx !== 'TITLE') return; // DROP
}
```

**Test Cases**:

| Input | Type | Applied? | Result |
|-------|------|---------|--------|
| 青云城 | location | ❌ No | ✅ PASS (not a title) |
| 秦明 | character | ❌ No | ✅ PASS (not a title) |

**Status**: Not applicable to our test cases.

---

### ═══════════════════════════════════════════════════
### LAYER 5: RANK-RELATED LOGIC (rank-resolver.ts)
### ═══════════════════════════════════════════════════

**Trigger Condition**: Only when `type === 'title'` (Line 145 in tagger.ts).

#### 5.1 resolveRankV18() (rank-resolver.ts:47-68)

**Not triggered** for our test cases (location and character types).

#### 5.2 classifyRankContext() (context-classifier.ts:24-88)

**Not triggered** for our test cases.

**Status**: Layer 5 bypassed.

---

### ═══════════════════════════════════════════════════
### LAYER 6: FINAL RESOLUTION (tagger.ts:153-176 + scanner.ts:130-165)
### ═══════════════════════════════════════════════════

#### 6.1 Conflict Resolver (tagger.ts:157-162)

**Code** (conflict-resolver.ts:20-59):
```typescript
export function resolveEntity(input: {
    text: string;
    frequency: number;
    patternMatched: boolean;
    semanticFlags: any;
}): ResolverResult {
    
    if (!input.patternMatched) {
        return { decision: EntityFinalDecision.REJECT, score: 0, reasons: ['no_pattern'] };
    }
    
    const result = semanticScoreEntity({
        text: input.text,
        frequency: input.frequency,
        flags: input.semanticFlags
    });
    
    const score = result.score;
    
    // ULTRA STRICT GATE
    if (score < 60) {
        return { decision: EntityFinalDecision.REJECT, score, reasons: [...result.reasons, 'score_too_low'] };
    }
    
    if (score < 70 && input.frequency < 30) {
        return { decision: EntityFinalDecision.REJECT, score, reasons: [...result.reasons, 'weak_and_rare'] };
    }
    
    if (score >= 70 || input.frequency >= 100) {
        return { decision: EntityFinalDecision.KEEP, score, reasons: result.reasons };
    }
    
    return { decision: EntityFinalDecision.DOWNGRADE, score, reasons: result.reasons };
}
```

**Semantic Scoring** (semantic-score.ts:34-102):

**Base Score**: 30  
**Penalties**:
- `functionWord`: -80
- `startsWithJunk`: -90
- `composite`: -40
- `tooLong` (>6 chars): -30

**Bonuses**:
- `lengthGood` (2-4 chars): +10
- `rareChar` (contains entity keywords): +15
- `cleanCandidate`: +15
- `actionContext`: +10
- `frequent` (50+): +10
- `very_frequent` (100+): +20

**Test Case: 青云城**

| Component | Value | Score Impact |
|-----------|-------|--------------|
| BASE_SCORE | - | 30 |
| Length (3 chars) | 2-4 range | +10 (lengthGood) |
| Rare char | Contains '城' | +15 (rareChar) |
| Clean candidate | Not blacklisted | +15 (cleanCandidate) |
| **TOTAL** | - | **70** |

**Resolution**:
- Score: 70
- Condition: `score >= 70` (Line 53 in conflict-resolver.ts)
- **Decision**: ✅ **KEEP**

---

**Test Case: 秦明**

| Component | Value | Score Impact |
|-----------|-------|--------------|
| BASE_SCORE | - | 30 |
| Length (2 chars) | 2-4 range | +10 (lengthGood) |
| Rare char | No match in `/[尸王宗阁...]/ ` | 0 |
| Clean candidate | Not blacklisted | +15 (cleanCandidate) |
| Verb context | hasVerb: true (from anchor) | +10 (actionContext) |
| **TOTAL** | - | **65** |

**Resolution**:
- Score: 65
- Frequency: 99 (hardcoded in tagger.ts:159)
- Condition: `score < 70 && frequency < 30` → **FALSE** (freq=99)
- Fallback: Line 58 → **DOWNGRADE**
- **Decision**: ⚠️ **DOWNGRADE** (but still kept)

---

#### 6.2 Generic Entity Guard (scanner.ts:143-151)

**Code** (generic-entity-guard.ts:18-122):

**Test Case: 青云城**

| Check | Condition | Result |
|-------|-----------|--------|
| GENERIC_TITLES | type === 'title' | ❌ Not applicable (type=location) |
| SKILL_TEMPLATE | type === 'skill' | ❌ Not applicable |
| GENERIC_LOCATION | Matches `/(学府\|学院...)$/` AND len <= 3 | ❌ Does not match pattern |
| DESCRIPTIVE_LOCATION | Starts with '整片' or '这一' | ❌ No |
| **Final Decision** | - | ✅ **KEEP** |

---

**Test Case: 秦明**

| Check | Condition | Result |
|-------|-----------|--------|
| GENERIC_HUMAN | In ['中年男', '青年男', ...] | ❌ Not in list |
| CHARACTER_WITH_VERB_TAIL | Matches `/(笑着\|说道...)$/` | ❌ No (already stripped) |
| **Final Decision** | - | ✅ **KEEP** |

---

### ═══════════════════════════════════════════════════
### FINAL INSERTION (scanner.ts:166-183)
### ═══════════════════════════════════════════════════

**Code**:
```typescript
finalBatch.push({
    workspaceId,
    original: raw.original,
    translated: suggestHanViet(raw.original),
    type: raw.type as any,
    confidence: resolution.score,
    pinyin: '',
    isApproved: false,
    isGarbage: false,
    occurrences: raw.occurrences,
    createdAt: new Date(),
    updatedAt: new Date(),
});
```

**Test Cases**:

| Input | Inserted? | Confidence |
|-------|-----------|------------|
| 青云城 | ✅ Yes | 70 |
| 秦明 | ✅ Yes (if anchor present) | 65 |

---

## ═══════════════════════════════════════════════════
## DIAGNOSTIC SUMMARY TABLE
## ═══════════════════════════════════════════════════

| Entity | Dropped At Layer | Rule Name | Reason |
|--------|-----------------|-----------|---------|
| **雷霆一击** (Skill) | **Layer 1** | **skillPattern** | Does NOT end with any character in SKILL_SUFFIXES ['功', '诀', '法', '步', '术', '拳', '掌', '剑', '阵', '经', '典', '指', '印']. The skill ends with '击' which is missing from the suffix list. |
| **秦明** (Character - standalone) | **Layer 1** | **anchorPattern** | Character detection is 100% anchor-dependent. If "秦明" appears without a behavioral anchor (说道, 笑道, 看向, etc.), it is NEVER matched by the regex pattern. |
| **青云城** (Location) | ❌ Not dropped | - | Successfully passes all layers and gets inserted with confidence score 70. |

---

## ═══════════════════════════════════════════════════
## FINAL VERDICT
## ═══════════════════════════════════════════════════

### Primary Failure Cause:

**"INCOMPLETE PATTERN COVERAGE AT LAYER 1 (Pattern Matching)"**

#### Specific Issues:

1. **Skills (雷霆一击)**:
   - **Failure Point**: Line 180 in tagger.ts
   - **Root Cause**: SKILL_SUFFIXES array is incomplete. Common skill endings like '击', '斩', '破', '杀', '轰' are missing.
   - **Impact**: Any skill not ending with the 13 predefined suffixes is **silently dropped** before any other processing occurs.

2. **Characters (秦明)**:
   - **Failure Point**: Line 189-192 in tagger.ts
   - **Root Cause**: Character detection relies **exclusively** on behavioral anchors. No standalone name pattern exists.
   - **Impact**: Character names appearing in **descriptive contexts** (e.g., "秦明的实力", "秦明是谁") are **never detected**.

3. **Locations (青云城)**:
   - **Status**: ✅ Working correctly
   - **Reason**: '城' is in LOCATION_SUFFIXES, passes all filters.

---

### Secondary Contributing Factors:

1. **Ultra-Strict Scoring** (Layer 6):
   - Even if entities pass Layer 1, they must achieve score >= 60 to survive.
   - Characters without rare keywords (王, 宗, 师, etc.) score only ~65, risking DOWNGRADE.

2. **Anchor Dependency**:
   - The current system assumes characters **always** appear with action verbs.
   - This fails in:
     - Dialogue attributions: "秦明："..."
     - Possessive phrases: "秦明的剑"
     - Subject-only sentences: "秦明很强"

---

## POTENTIAL SOLUTIONS (For Reference Only)

### 1. Expand SKILL_SUFFIXES
Add missing common skill endings:
```typescript
export const SKILL_SUFFIXES = [
    '功', '诀', '法', '步', '术', '拳', '掌', '剑', '阵', '经', '典', '指', '印',
    '击', '斩', '破', '杀', '轰', '爆', '刺', '劈', '斩', '踢', '踏', '踩'  // NEW
];
```

### 2. Add Standalone Character Pattern
Create a secondary pattern for characters without anchors:
```typescript
// Detect 2-4 char Chinese names in specific contexts
const standaloneCharPattern = new RegExp(
    `(?:^|[，。！？：；]\\s*)([\\u4e00-\\u9fa5]{2,4})(?=[的是在有])`,
    'g'
);
```

### 3. Implement Frequency-Based Fallback
For entities that appear 10+ times but don't match patterns:
```typescript
// Collect high-frequency 2-4 char sequences
// Score them separately as potential names
```

---

## END OF REPORT

**Report Status**: READ-ONLY FORENSIC ANALYSIS COMPLETE  
**Generated**: 2026-02-03 09:23:21 +07:00  
**No code modifications proposed or executed.**

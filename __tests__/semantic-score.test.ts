import { describe, it, expect } from 'vitest';
import { semanticScoreEntity } from '@/lib/gemini/heuristic/semantic-score';

describe('semanticScoreEntity', () => {
  const cleanFlags = {
    isGenericHuman: false,
    isFunctionWord: false,
    hasVerbContext: false,
    isComposite: false,
    isBlacklisted: false,
  };

  it('gives base score + bonuses for clean 2-4 char entity', () => {
    const result = semanticScoreEntity({
      text: '李白',
      frequency: 50,
      flags: cleanFlags,
    });
    // BASE(30) + lengthGood(10) + clean(15) + frequent(10) = 65
    expect(result.score).toBe(65);
    expect(result.reasons).toContain('good_length');
    expect(result.reasons).toContain('clean');
    expect(result.reasons).toContain('frequent');
  });

  it('gives max score for frequent clean entity with rare chars', () => {
    const result = semanticScoreEntity({
      text: '天王殿',
      frequency: 150,
      flags: cleanFlags,
    });
    // BASE(30) + lengthGood(10) + rareChar(15) + clean(15) + veryFrequent(20) = 90
    expect(result.score).toBe(90);
    expect(result.reasons).toContain('rare_char');
    expect(result.reasons).toContain('very_frequent');
  });

  it('heavily penalizes function words / blacklisted', () => {
    const result = semanticScoreEntity({
      text: '已经',
      frequency: 200,
      flags: { ...cleanFlags, isFunctionWord: true },
    });
    // startsWithJunk(-90) + functionWord(-80) → nearly zero
    expect(result.score).toBe(0); // capped at 0
    expect(result.reasons).toContain('starts_with_junk');
    expect(result.reasons).toContain('blacklisted');
  });

  it('penalizes too-long entities', () => {
    const result = semanticScoreEntity({
      text: '这是一个非常长的名字',  // 9 chars
      frequency: 10,
      flags: cleanFlags,
    });
    expect(result.reasons).toContain('too_long');
    expect(result.score).toBeLessThan(50);
  });

  it('penalizes composite entities', () => {
    const result = semanticScoreEntity({
      text: '张三李四',
      frequency: 30,
      flags: { ...cleanFlags, isComposite: true },
    });
    expect(result.reasons).toContain('composite');
    // composite penalty = -40
    expect(result.score).toBeLessThan(40);
  });

  it('gives verb context bonus', () => {
    const result = semanticScoreEntity({
      text: '降龙掌',
      frequency: 20,
      flags: { ...cleanFlags, hasVerbContext: true },
    });
    expect(result.reasons).toContain('verb_context');
    // BASE(30) + lengthGood(10) + rareChar(0) + verbContext(10) + clean(15) = 65
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it('clamps score between 0 and 100', () => {
    // Max possible: everything positive
    const maxResult = semanticScoreEntity({
      text: '天宫',
      frequency: 200,
      flags: { ...cleanFlags, hasVerbContext: true },
    });
    expect(maxResult.score).toBeLessThanOrEqual(100);
    expect(maxResult.score).toBeGreaterThanOrEqual(0);

    // Min possible: everything negative
    const minResult = semanticScoreEntity({
      text: '已经没有人这是',
      frequency: 1,
      flags: { ...cleanFlags, isFunctionWord: true, isComposite: true },
    });
    expect(minResult.score).toBe(0);
  });

  it('distinguishes frequency tiers', () => {
    const low = semanticScoreEntity({ text: '某人', frequency: 5, flags: cleanFlags });
    const mid = semanticScoreEntity({ text: '某人', frequency: 60, flags: cleanFlags });
    const high = semanticScoreEntity({ text: '某人', frequency: 150, flags: cleanFlags });

    expect(high.score).toBeGreaterThan(mid.score);
    expect(mid.score).toBeGreaterThan(low.score);
  });
});

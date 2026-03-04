import { describe, it, expect } from 'vitest';
import { resolveEntity, EntityFinalDecision } from '@/lib/gemini/heuristic/conflict-resolver';

describe('resolveEntity', () => {
  const baseInput = {
    patternMatched: true,
    semanticFlags: {
      isGenericHuman: false,
      isFunctionWord: false,
      hasVerbContext: false,
      isComposite: false,
      isBlacklisted: false,
    },
  };

  it('rejects when patternMatched is false', () => {
    const result = resolveEntity({
      text: '李白',
      frequency: 100,
      patternMatched: false,
      semanticFlags: {},
    });
    expect(result.decision).toBe(EntityFinalDecision.REJECT);
    expect(result.score).toBe(0);
  });

  it('keeps high-frequency entities', () => {
    const result = resolveEntity({
      ...baseInput,
      text: '李白',
      frequency: 150,
    });
    expect(result.decision).toBe(EntityFinalDecision.KEEP);
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it('rejects very low frequency entities', () => {
    const result = resolveEntity({
      ...baseInput,
      text: '某',
      frequency: 2,
    });
    // Single char with low frequency should be rejected
    expect(result.decision).toBe(EntityFinalDecision.REJECT);
  });

  it('rejects generic human nouns', () => {
    const result = resolveEntity({
      ...baseInput,
      text: '老人',
      frequency: 50,
      semanticFlags: { ...baseInput.semanticFlags, isGenericHuman: true },
    });
    // Generic humans should score lower
    expect(result.score).toBeLessThan(70);
  });

  it('provides reasons for decisions', () => {
    const result = resolveEntity({
      ...baseInput,
      text: '无名',
      frequency: 5,
    });
    expect(Array.isArray(result.reasons)).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});

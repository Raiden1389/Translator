import { describe, it, expect } from 'vitest';
import { calculateSimilarity, toTitleCase } from '@/lib/gemini/heuristic/utils';

describe('calculateSimilarity (Jaro-Winkler)', () => {
  it('returns 1.0 for identical strings', () => {
    expect(calculateSimilarity('abc', 'abc')).toBe(1.0);
    expect(calculateSimilarity('李白', '李白')).toBe(1.0);
  });

  it('returns 0.0 for empty strings', () => {
    expect(calculateSimilarity('', 'abc')).toBe(0.0);
    expect(calculateSimilarity('abc', '')).toBe(0.0);
  });

  it('returns 0.0 for completely different strings', () => {
    expect(calculateSimilarity('abc', 'xyz')).toBe(0.0);
  });

  it('returns high score for similar strings', () => {
    const score = calculateSimilarity('MARTHA', 'MARHTA');
    expect(score).toBeGreaterThan(0.9);
  });

  it('returns moderate score for somewhat similar strings', () => {
    const score = calculateSimilarity('DIXON', 'DICKSONX');
    expect(score).toBeGreaterThan(0.7);
    expect(score).toBeLessThan(0.95);
  });

  it('handles single character strings', () => {
    expect(calculateSimilarity('a', 'a')).toBe(1.0);
    expect(calculateSimilarity('a', 'b')).toBe(0.0);
  });

  it('is symmetric', () => {
    const s1 = calculateSimilarity('abc', 'abd');
    const s2 = calculateSimilarity('abd', 'abc');
    expect(s1).toBeCloseTo(s2, 10);
  });
});

describe('toTitleCase', () => {
  it('converts lowercase to title case', () => {
    expect(toTitleCase('giáng long thập bát chưởng'))
      .toBe('Giáng Long Thập Bát Chưởng');
  });

  it('handles empty string', () => {
    expect(toTitleCase('')).toBe('');
  });

  it('handles single word', () => {
    expect(toTitleCase('hello')).toBe('Hello');
  });

  it('handles already capitalized input', () => {
    expect(toTitleCase('HELLO WORLD')).toBe('Hello World');
  });
});

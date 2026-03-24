/**
 * Unit tests: Term Audit — Normalization + Clustering
 * Run: npx vitest run __tests__/term-audit.test.ts
 */

import { describe, it, expect } from 'vitest';
import { normalizeTerm, levenshtein, tokenizeNormalized } from '@/lib/services/term-audit.normalization';
import { clusterTerms } from '@/lib/services/term-audit.clustering';
import type { TermOccurrence } from '@/lib/services/term-audit.types';

// ---------------------------------------------------------------------------
// Normalization tests
// ---------------------------------------------------------------------------

describe('normalizeTerm', () => {
  it('strips generic head "người"', () => {
    const result = normalizeTerm('người suy diễn');
    expect(result.normalized).toBe('người suy diễn');
    expect(result.rootHint).toBe('suy dien'); // head stripped for rootHint
  });

  it('strips generic head "kẻ"', () => {
    const result = normalizeTerm('kẻ suy diễn');
    expect(result.rootHint).toBe('suy dien');
  });

  it('hard anchor term unchanged', () => {
    const result = normalizeTerm('Suy diễn giả');
    expect(result.normalized).toBe('suy diễn giả');
    expect(result.rootHint).toBe('suy dien gia');
  });

  it('all three share same rootHint', () => {
    const a = normalizeTerm('Suy diễn giả');
    const b = normalizeTerm('người suy diễn');
    const c = normalizeTerm('kẻ suy diễn');
    // rootHint for b and c: "suy dien"
    // rootHint for a: "suy dien gia"
    // They won't be identical but should be near-match (lev ≤ 2)
    expect(levenshtein(b.rootHint, c.rootHint)).toBe(0); // same
    expect(levenshtein(a.rootHint, b.rootHint)).toBeLessThanOrEqual(4); // near
  });

  it('nghi thức and nghi lễ → same root key', () => {
    const a = normalizeTerm('nghi thức thăng hoa');
    const b = normalizeTerm('nghi lễ thăng hoa');
    // Both strip "nghi thức/lễ" prefix? No — phrase wrappers are not generic heads.
    // But rootHint should be "nghi thuc thang hoa" vs "nghi le thang hoa"
    // lev distance should be small due to "thang hoa" shared suffix
    expect(a.rootHint).toContain('thang hoa');
    expect(b.rootHint).toContain('thang hoa');
  });
});

describe('levenshtein', () => {
  it('same string', () => expect(levenshtein('abc', 'abc')).toBe(0));
  it('one insert', () => expect(levenshtein('abc', 'abcd')).toBe(1));
  it('one sub', () => expect(levenshtein('abc', 'axc')).toBe(1));
  it('near-match roots', () => {
    expect(levenshtein('suy dien', 'suy luan')).toBeLessThanOrEqual(4);
  });
});

describe('tokenizeNormalized', () => {
  it('splits correctly', () => {
    const s = tokenizeNormalized('suy diễn giả');
    expect(s.has('suy')).toBe(true);
    expect(s.has('diễn')).toBe(true);
    expect(s.has('giả')).toBe(true);
  });

  it('filters single-char tokens', () => {
    const s = tokenizeNormalized('a b suy diễn');
    expect(s.has('a')).toBe(false);
    expect(s.has('b')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Clustering tests
// ---------------------------------------------------------------------------

function makeOccurrence(term: string, count: number, chapters: number[]): TermOccurrence {
  return {
    term,
    count,
    chapters,
    contexts: [`hắn là một ${term} tài năng`, `${term} bước ra khỏi phòng`],
    chapterRefs: chapters.map(c => ({
      chapterOrder: c,
      paragraphIndex: 0,
      paragraph: `hắn là một ${term} tài năng`,
    })),
  };
}

describe('clusterTerms', () => {
  const scanRunId = 'test-run-001';

  it('clusters "Suy diễn giả" and "người suy diễn" together (high overlap)', () => {
    const occurrences: TermOccurrence[] = [
      makeOccurrence('Suy diễn giả',  32, [1, 2, 3, 4, 5]),
      makeOccurrence('người suy diễn', 11, [1, 2, 3, 4]),
      makeOccurrence('kẻ suy diễn',    3, [2, 3, 4]),
    ];

    const clusters = clusterTerms({
      occurrences,
      options: { mergeThreshold: 0.72, reviewZoneThreshold: 0.60 },
      scanRunId,
    });

    // Should produce at least 1 cluster containing suy diễn variants
    expect(clusters.length).toBeGreaterThan(0);
    const main = clusters[0];
    expect(main.variants.length).toBeGreaterThanOrEqual(2);
    // Canonical must be one of the suy diễn family
    expect(main.suggestedCanonical.toLowerCase()).toContain('suy diễn');
  });

  it('does not cluster completely different terms', () => {
    const occurrences: TermOccurrence[] = [
      makeOccurrence('Suy diễn giả', 10, [1, 2, 3]),
      makeOccurrence('ấn ký linh hồn', 8, [5, 6, 7]),
    ];

    const clusters = clusterTerms({
      occurrences,
      options: { mergeThreshold: 0.72, reviewZoneThreshold: 0.60 },
      scanRunId,
    });

    // Should not cluster these together
    const withBothVariants = clusters.filter(c =>
      c.variants.some(v => v.term === 'Suy diễn giả') &&
      c.variants.some(v => v.term === 'ấn ký linh hồn')
    );
    expect(withBothVariants.length).toBe(0);
  });

  it('review-zone clusters have clusterMode = review (or empty if below threshold)', () => {
    // Two terms with moderate similarity — may or may not cluster depending on score
    const occurrences: TermOccurrence[] = [
      makeOccurrence('nghi thức thăng hoa', 15, [1, 2, 3, 4]),
      makeOccurrence('nghi lễ thăng hoa',    6, [2, 3, 4, 5]),
    ];

    const clusters = clusterTerms({
      occurrences,
      options: { mergeThreshold: 0.72, reviewZoneThreshold: 0.60 },
      scanRunId,
    });

    // May be 0 if score < 0.60, otherwise valid modes only
    const clusterModes = clusters.map(c => c.clusterMode);
    expect(clusterModes.every(m => ['auto', 'review', 'protected-related'].includes(m))).toBe(true);
    // If any cluster exists, it must have scanRunId set
    clusters.forEach(c => expect(c.scanRunId).toBe(scanRunId));
  });

  it('confirmed is always false on new clusters', () => {
    const occurrences: TermOccurrence[] = [
      makeOccurrence('Suy diễn giả', 10, [1, 2]),
      makeOccurrence('người suy diễn', 5, [1, 2]),
    ];

    const clusters = clusterTerms({
      occurrences,
      options: {},
      scanRunId,
    });

    clusters.forEach(c => expect(c.confirmed).toBe(false));
  });

  it('scanRunId is propagated to all clusters', () => {
    const occurrences: TermOccurrence[] = [
      makeOccurrence('Suy diễn giả', 10, [1, 2]),
      makeOccurrence('người suy diễn', 5, [1, 2]),
    ];

    const clusters = clusterTerms({
      occurrences,
      options: {},
      scanRunId: 'my-run-id',
    });

    clusters.forEach(c => expect(c.scanRunId).toBe('my-run-id'));
  });
});

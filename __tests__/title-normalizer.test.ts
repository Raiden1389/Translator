import { describe, it, expect } from 'vitest';
import { normalizeTitleCase, hasTitleCaseIssue } from '@/lib/utils/title-normalizer';

describe('normalizeTitleCase', () => {
  it('returns input unchanged for normal sentence case', () => {
    expect(normalizeTitleCase('Chương 1: Một ngày bình thường'))
      .toBe('Chương 1: Một ngày bình thường');
  });

  it('fixes ALL CAPS after colon', () => {
    expect(normalizeTitleCase('Chương 15: PHẢN HƯỚNG TRẢ GIÁ'))
      .toBe('Chương 15: Phản hướng trả giá');
  });

  it('fixes Title Case with Vietnamese diacritics (í/ì/ĩ chars)', () => {
    expect(normalizeTitleCase('Chương 12: Chính Là Người Đã Đến '))
      .toBe('Chương 12: Chính là người đã đến ');
  });

  it('fixes Title Case with mixed ASCII and Vietnamese words', () => {
    expect(normalizeTitleCase('Chương 5: Chính Là Người Game Thẻ Bài '))
      .toBe('Chương 5: Chính là người game thẻ bài ');
  });

  it('preserves prefix before colon', () => {
    const result = normalizeTitleCase('Chương 99: CUỘC CHIẾN');
    expect(result.startsWith('Chương 99: ')).toBe(true);
  });

  it('handles empty/null input', () => {
    expect(normalizeTitleCase('')).toBe('');
    expect(normalizeTitleCase(null as unknown as string)).toBe(null);
  });

  it('lowercases ALL CAPS single-word body', () => {
    expect(normalizeTitleCase('Chương 1: OK')).toBe('Chương 1: Ok');
  });

  it('fixes Title Case with ă/ắ/ặ diacritics', () => {
    expect(normalizeTitleCase('Chương 3: Đặc Biệt Hơn Người '))
      .toBe('Chương 3: Đặc biệt hơn người ');
  });
});

describe('hasTitleCaseIssue', () => {
  it('detects ALL CAPS', () => {
    expect(hasTitleCaseIssue('Chương 15: PHẢN HƯỚNG TRẢ GIÁ')).toBe(true);
  });

  it('detects Title Case with Vietnamese diacritics', () => {
    expect(hasTitleCaseIssue('Chương 12: Chính Là Người Đã Đến ')).toBe(true);
  });

  it('detects Title Case with ă diacritics', () => {
    expect(hasTitleCaseIssue('Chương 3: Đặc Biệt Hơn Người ')).toBe(true);
  });

  it('returns false for normal sentence case', () => {
    expect(hasTitleCaseIssue('Chương 1: Một ngày bình thường')).toBe(false);
  });

  it('returns false for empty input', () => {
    expect(hasTitleCaseIssue('')).toBe(false);
  });
});

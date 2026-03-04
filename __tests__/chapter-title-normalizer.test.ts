import { describe, it, expect } from 'vitest';
import { normalizeChapterTitle } from '@/lib/utils/chapter-title-normalizer';

describe('normalizeChapterTitle', () => {
  it('cleans AI markers from title', () => {
    expect(normalizeChapterTitle('[TIÊU ĐỀ]: Phản công', '第1章 反击'))
      .toBe('Chương 1: Phản công');
    expect(normalizeChapterTitle('Title: Phản công', '第1章 反击'))
      .toBe('Chương 1: Phản công');
    expect(normalizeChapterTitle('Tiêu đề: Phản công', '第1章 反击'))
      .toBe('Chương 1: Phản công');
  });

  it('strips markdown markers', () => {
    expect(normalizeChapterTitle('## *Phản công*', '第1章 反击'))
      .toBe('Chương 1: Phản công');
  });

  it('extracts chapter number from 第X章 format', () => {
    expect(normalizeChapterTitle('Một ngày mới', '第42章 新的一天'))
      .toBe('Chương 42: Một ngày mới');
  });

  it('extracts chapter number from Chapter X format', () => {
    expect(normalizeChapterTitle('New Day', 'Chapter 5 New Day'))
      .toBe('Chương 5: New Day');
  });

  it('prevents double chapter prefix', () => {
    // AI sometimes adds its own "Chương X:" prefix
    expect(normalizeChapterTitle('Chương 1373: Phản công', '第3607章 反击'))
      .toBe('Chương 3607: Phản công');
  });

  it('handles empty AI title — falls back to original', () => {
    expect(normalizeChapterTitle('', '第1章 反击'))
      .toBe('Chương 1');
  });

  it('uses original title when no chapter pattern found', () => {
    expect(normalizeChapterTitle('', 'Prologue')).toBe('Prologue');
  });

  it('capitalizes first letter of title body', () => {
    expect(normalizeChapterTitle('phản công', '第1章 反击'))
      .toBe('Chương 1: Phản công');
  });

  it('handles Chương format in original', () => {
    expect(normalizeChapterTitle('Cuộc chiến', 'Chương 99 Cuộc chiến'))
      .toBe('Chương 99: Cuộc chiến');
  });
});

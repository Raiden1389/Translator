import { describe, it, expect } from 'vitest';
import {
  detectChineseLeftover,
  deduplicateConsecutiveParagraphs,
  normalizeQuoteStyles,
  scrubVietnameseAIChatter,
} from '@/lib/gemini/text/post-cleanup';

describe('detectChineseLeftover', () => {
  it('returns zero for clean Vietnamese text', () => {
    const result = detectChineseLeftover('Hắn đứng dậy, nhìn ra cửa sổ.');
    expect(result.hasChinese).toBe(false);
    expect(result.count).toBe(0);
    expect(result.ratio).toBe(0);
  });

  it('detects Chinese characters in mixed text', () => {
    const result = detectChineseLeftover('Hắn nói: 你好世界 rồi bước đi.');
    expect(result.hasChinese).toBe(true);
    expect(result.count).toBe(4); // 你好世界
    expect(result.ratio).toBeGreaterThan(0);
  });

  it('returns correct ratio', () => {
    const result = detectChineseLeftover('AAAA你好');
    // 6 non-space chars, 2 Chinese → ratio = 2/6 ≈ 0.33
    expect(result.ratio).toBeCloseTo(2 / 6, 1);
  });

  it('handles empty input', () => {
    const result = detectChineseLeftover('');
    expect(result.hasChinese).toBe(false);
    expect(result.count).toBe(0);
  });
});

describe('deduplicateConsecutiveParagraphs', () => {
  it('removes exact consecutive duplicate paragraphs', () => {
    const input = 'Đoạn một.\nĐoạn một.\nĐoạn hai.';
    expect(deduplicateConsecutiveParagraphs(input)).toBe('Đoạn một.\nĐoạn hai.');
  });

  it('removes triple duplicates', () => {
    const input = 'Lặp lại.\nLặp lại.\nLặp lại.\nKhác.';
    expect(deduplicateConsecutiveParagraphs(input)).toBe('Lặp lại.\nKhác.');
  });

  it('preserves non-consecutive duplicates', () => {
    const input = 'A.\nB.\nA.';
    expect(deduplicateConsecutiveParagraphs(input)).toBe('A.\nB.\nA.');
  });

  it('preserves empty lines between different paragraphs', () => {
    const input = 'Đoạn một.\n\nĐoạn hai.';
    expect(deduplicateConsecutiveParagraphs(input)).toBe('Đoạn một.\n\nĐoạn hai.');
  });

  it('handles empty input', () => {
    expect(deduplicateConsecutiveParagraphs('')).toBe('');
  });

  it('handles single paragraph', () => {
    expect(deduplicateConsecutiveParagraphs('Chỉ một đoạn.'))
      .toBe('Chỉ một đoạn.');
  });
});

describe('normalizeQuoteStyles', () => {
  it('converts Chinese corner quotes to curly quotes', () => {
    expect(normalizeQuoteStyles('「Xin chào」'))
      .toBe('\u201CXin chào\u201D');
  });

  it('converts double corner quotes', () => {
    expect(normalizeQuoteStyles('『Nội tâm』'))
      .toBe('\u201CNội tâm\u201D');
  });

  it('converts French guillemets', () => {
    expect(normalizeQuoteStyles('« Bonjour »'))
      .toBe('\u201CBonjour\u201D');
  });

  it('converts straight quotes to smart quotes', () => {
    expect(normalizeQuoteStyles('"Hello World"'))
      .toBe('\u201CHello World\u201D');
  });

  it('handles mixed styles in same text', () => {
    const input = '「Một」 và "Hai" và 『Ba』';
    const result = normalizeQuoteStyles(input);
    expect(result).not.toContain('「');
    expect(result).not.toContain('"');
    expect(result).not.toContain('『');
  });

  it('handles empty input', () => {
    expect(normalizeQuoteStyles('')).toBe('');
  });
});

describe('scrubVietnameseAIChatter', () => {
  it('removes Vietnamese preambles', () => {
    expect(scrubVietnameseAIChatter('Dưới đây là bản dịch:\nNội dung thực.'))
      .toBe('Nội dung thực.');
  });

  it('removes Vietnamese postscripts', () => {
    expect(scrubVietnameseAIChatter('Nội dung.\nLưu ý: đây là bản dịch tham khảo.'))
      .toBe('Nội dung.');
  });

  it('removes translator notes in parentheses', () => {
    expect(scrubVietnameseAIChatter('Nội dung (Người dịch: AI) đoạn.'))
      .toBe('Nội dung đoạn.');
  });

  it('removes notes in brackets', () => {
    expect(scrubVietnameseAIChatter('Nội dung [Ghi chú của dịch giả] đoạn.'))
      .toBe('Nội dung đoạn.');
  });

  it('preserves normal text', () => {
    expect(scrubVietnameseAIChatter('Hắn đứng dậy, nhìn ra cửa sổ.'))
      .toBe('Hắn đứng dậy, nhìn ra cửa sổ.');
  });

  it('handles empty input', () => {
    expect(scrubVietnameseAIChatter('')).toBe('');
  });
});

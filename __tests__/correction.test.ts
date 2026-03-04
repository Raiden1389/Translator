import { describe, it, expect } from 'vitest';
import { repairSentenceStructure, repairUnmatchedQuotes } from '@/lib/gemini/text/correction';

describe('repairSentenceStructure', () => {
  it('returns empty string for falsy input', () => {
    expect(repairSentenceStructure('')).toBe('');
  });

  // CURRENT BEHAVIOR: replaces comma before ANY safe word with period
  // This is overly aggressive — short clauses with comma are valid Vietnamese

  it('converts comma before pronoun in long clause (run-on sentence)', () => {
    // This is the valid use case: a very long clause followed by comma + pronoun
    const longClause = 'Thanh kiếm phát ra ánh sáng chói lòa xuyên qua bầu trời nơi chiến trường';
    const input = `${longClause}, Hắn đứng dậy.`;
    const result = repairSentenceStructure(input);
    // Should convert comma to period for long run-on sentences
    expect(result).toContain('. Hắn');
  });

  it('preserves short compound sentences when word is lowercase', () => {
    // Regex only matches uppercase safe words, so lowercase "hắn" is NOT affected
    const input = 'Anh ngồi xuống, hắn đứng dậy.';
    expect(repairSentenceStructure(input)).toBe('Anh ngồi xuống, hắn đứng dậy.');
  });

  it('preserves short compound sentences even with uppercase word', () => {
    // After fix: clause < 50 chars → comma preserved (valid Vietnamese grammar)
    const input = 'Anh ngồi xuống, Hắn đứng dậy.';
    const result = repairSentenceStructure(input);
    expect(result).toBe('Anh ngồi xuống, Hắn đứng dậy.');
  });

  it('converts comma before conjunction', () => {
    const input = 'Trận đánh kết thúc sau một hồi giao tranh ác liệt kéo dài suốt ba ngày, Nhưng không ai biết.';
    const result = repairSentenceStructure(input);
    expect(result).toContain('. Nhưng');
  });

  it('handles multiple replacements in text', () => {
    const input = 'Câu đầu tiên rất dài và phức tạp với nhiều mệnh đề kéo dài, Hắn nói, Nàng cười.';
    const result = repairSentenceStructure(input);
    // Should have at least one period replacement
    expect(result.match(/\./g)!.length).toBeGreaterThanOrEqual(2);
  });

  it('does not modify text without safe word after comma', () => {
    const input = 'Xin chào, thế giới.';
    expect(repairSentenceStructure(input)).toBe('Xin chào, thế giới.');
  });

  it('preserves text with no commas', () => {
    const input = 'Hắn đứng dậy. Nàng nhìn theo.';
    expect(repairSentenceStructure(input)).toBe(input);
  });
});

describe('repairUnmatchedQuotes', () => {
  it('returns empty string for falsy input', () => {
    expect(repairUnmatchedQuotes('')).toBe('');
  });

  it('fixes unmatched straight quotes', () => {
    const input = '"Xin chào';
    const result = repairUnmatchedQuotes(input);
    expect(result).toBe('"Xin chào"');
  });

  it('does not modify matched straight quotes', () => {
    const input = '"Xin chào"';
    expect(repairUnmatchedQuotes(input)).toBe(input);
  });

  it('fixes unmatched curly left quote', () => {
    const input = '\u201CXin chào';
    const result = repairUnmatchedQuotes(input);
    expect(result).toBe('\u201CXin chào\u201D');
  });

  it('does not modify matched curly quotes', () => {
    const input = '\u201CXin chào\u201D';
    expect(repairUnmatchedQuotes(input)).toBe(input);
  });

  it('handles multiple lines independently', () => {
    const input = '"Line one\n"Line two"';
    const result = repairUnmatchedQuotes(input);
    const lines = result.split('\n');
    expect(lines[0]).toBe('"Line one"');  // fixed
    expect(lines[1]).toBe('"Line two"');  // unchanged
  });
});

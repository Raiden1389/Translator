import { describe, it, expect } from 'vitest';
import { cleanHtmlContent, sanitizeTranslatedContent } from '@/lib/utils/text-sanitizer';

describe('cleanHtmlContent', () => {
  it('returns empty string for falsy input', () => {
    expect(cleanHtmlContent('')).toBe('');
    expect(cleanHtmlContent(null as unknown as string)).toBe('');
  });

  it('converts <br> to newlines', () => {
    expect(cleanHtmlContent('Hello<br>World')).toBe('Hello\nWorld');
    expect(cleanHtmlContent('Hello<br/>World')).toBe('Hello\nWorld');
    expect(cleanHtmlContent('Hello<br />World')).toBe('Hello\nWorld');
  });

  it('strips HTML tags', () => {
    expect(cleanHtmlContent('<p>Hello</p>')).toBe('Hello');
    expect(cleanHtmlContent('<div><span>Nested</span></div>')).toBe('Nested');
    expect(cleanHtmlContent('<b>Bold</b> and <i>italic</i>')).toBe('Bold and italic');
  });

  it('decodes HTML entities', () => {
    expect(cleanHtmlContent('&amp; &lt; &gt; &quot; &apos;')).toBe('& < > " \'');
    expect(cleanHtmlContent('Hello&nbsp;World')).toBe('Hello World');
  });

  it('normalizes Chinese whitespace', () => {
    expect(cleanHtmlContent('Hello\u3000World')).toBe('Hello World');
    expect(cleanHtmlContent('Hello\u2003World')).toBe('Hello World');
  });

  it('collapses excessive newlines to max 2', () => {
    expect(cleanHtmlContent('A\n\n\n\n\nB')).toBe('A\n\nB');
  });

  it('trims each line', () => {
    expect(cleanHtmlContent('  Hello  \n  World  ')).toBe('Hello\nWorld');
  });
});

describe('sanitizeTranslatedContent', () => {
  it('returns empty string for falsy input', () => {
    expect(sanitizeTranslatedContent('')).toBe('');
  });

  it('removes HTML tags from AI output', () => {
    expect(sanitizeTranslatedContent('<p>Translated</p>')).toBe('Translated');
  });

  it('removes HTML comments', () => {
    expect(sanitizeTranslatedContent('Hello <!-- comment --> World')).toBe('Hello  World');
  });

  it('removes escaped HTML entities', () => {
    expect(sanitizeTranslatedContent('Hello &lt;tag&gt; World')).toBe('Hello  World');
  });

  it('handles complex mixed content', () => {
    const input = '<div>Chương 1<br/><!-- AI note -->Nội dung &amp; chi tiết</div>';
    const result = sanitizeTranslatedContent(input);
    expect(result).toBe('Chương 1\nNội dung & chi tiết');
  });
});

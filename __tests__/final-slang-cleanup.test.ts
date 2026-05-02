import { describe, expect, it } from 'vitest';
import { finalSweep } from '@/lib/gemini/text/casing';

describe('finalSweep slang cleanup', () => {
  it('fixes malformed pronoun + profanity combinations', () => {
    const input = 'Ta con mẹ nó thật phục rồi. Ngươi con mẹ nó điên rồi à?';
    const output = finalSweep(input);

    expect(output).toContain('Đệt thật phục rồi.');
    expect(output).toContain('Đệt điên rồi à?');
    expect(output).not.toContain('Ta con mẹ nó');
    expect(output).not.toContain('Ngươi con mẹ nó');
  });

  it('fixes malformed direct insults and fabricated family profanity', () => {
    const input = 'Ngươi thằng điên này! Địt bố mày!';
    const output = finalSweep(input);

    expect(output).toContain('Đồ điên!');
    expect(output).toContain('ĐM!');
    expect(output).not.toContain('Ngươi thằng điên này');
    expect(output).not.toContain('Địt bố mày');
  });
});

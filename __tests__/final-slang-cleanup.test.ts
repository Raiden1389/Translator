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

  it('normalizes literal internet slang and legacy Chinese money units', () => {
    const input = 'Sáu sáu sáu! Ngàn con thảo nê mã chạy qua đầu. Chiếc xe này giá 50 vạn tệ, công ty được định giá 50 ức tệ.';
    const output = finalSweep(input);

    expect(output).toContain('Đỉnh vkl!');
    expect(output).toContain('Một đàn ĐM chạy qua đầu.');
    expect(output).toContain('500 nghìn tệ');
    expect(output).toContain('5 tỷ tệ');
    expect(output).not.toContain('Sáu sáu sáu');
    expect(output).not.toContain('thảo nê mã');
    expect(output).not.toContain('vạn tệ');
    expect(output).not.toContain('ức tệ');
  });

  it('auto-fixes narrow pronoun drift in archaic dialogue', () => {
    const input = 'Ta đã nói rồi, cô đừng ép tôi nữa. Ngươi tưởng tôi không biết à?';
    const output = finalSweep(input);

    expect(output).toContain('Ta đã nói rồi, ngươi đừng ép ta nữa.');
    expect(output).toContain('Ngươi tưởng ta không biết à?');
    expect(output).not.toContain('cô đừng ép tôi');
    expect(output).not.toContain('Ngươi tưởng tôi');
  });

  it('cleans up broken ta/nguoi slang mixes without touching other prose', () => {
    const input = 'Ta đệch, thế mà cũng được à? Ngươi đệch bị bệnh à? Ngươi vãi thật.';
    const output = finalSweep(input);

    expect(output).toContain('Đệt, thế mà cũng được à?');
    expect(output).toContain('ĐM, ngươi bị bệnh à?');
    expect(output).toContain('Vãi thật.');
    expect(output).not.toContain('Ta đệch');
    expect(output).not.toContain('Ngươi đệch');
    expect(output).not.toContain('Ngươi vãi');
  });
});

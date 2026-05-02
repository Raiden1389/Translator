import { describe, expect, it } from 'vitest';
import { buildSystemInstruction, getPromptProfileForModel, CURRENCY_RULE } from '@/lib/gemini/constants';
import { assembleSystemInstruction, buildDynamicSlangHints } from '@/lib/gemini/rules/assembler';

describe('prompt profiles', () => {
    it('selects lite profile for gemini-2.5-flash-lite', () => {
        expect(getPromptProfileForModel('gemini-2.5-flash-lite')).toBe('lite');
        expect(getPromptProfileForModel('gemini-2.5-flash')).toBe('full');
    });

    it('builds a shorter lite instruction while keeping key guardrails', () => {
        const glossary = 'Glossary: 陈家=Trần gia, 我靠=Vãi!';
        const full = buildSystemInstruction(undefined, glossary, false, 'full');
        const lite = buildSystemInstruction(undefined, glossary, false, 'lite');

        expect(lite.length).toBeLessThan(full.length);
        expect(full).toContain('[PRONOUN LOCK - BẮT BUỘC]');
        expect(full).toContain('CHỈ CẦN nguyên văn là 我/你 thì dịch thẳng là Ta/Ngươi.');
        expect(full).toContain('CẤM tự ý đổi 我/你 thành tôi, anh, em, bạn, mình, cậu');
        expect(full).toContain('CẤM tự ý đổi 她 thành cô/cô ấy');
        expect(full).toContain('Ta đã nói từ lâu rồi, đừng ép ta.');
        expect(full).toContain('Ta thích ngươi, nhưng ngươi đừng ép ta.');
        expect(full).toContain('Ta đã sớm nói với ngươi rồi, sao ngươi cứ không nghe?');
        expect(full).toContain('Ta cũng do dì giới thiệu đến. Ngươi ngồi đi, chúng ta từ từ nói chuyện.');
        expect(full).toContain('Tôi cũng do dì giới thiệu đến. Cô ngồi đi...');
        expect(full).toContain('Trương tiểu thư, ngài khỏe chứ, ta là do dì giới thiệu đến.');
        expect(full).toContain('Dì nói ngươi rất đứng đắn, hy vọng ngươi đừng lừa ta.');
        expect(full).toContain('Nói thật, ta vừa gặp ngươi đã rất thích ngươi.');
        expect(full).toContain('Ta vừa gặp cô đã rất thích cô.');
        expect(full).toContain('Hôm nay nàng ăn diện rất kỹ, ta nhìn nàng một cái, trong lòng cũng có chút bất ngờ.');
        expect(full).toContain('Cô ấy hôm nay ăn diện rất kỹ, tôi nhìn cô ấy...');
        expect(full).toContain('Đệt! Thế mà cũng được à? Vãi thật.');
        expect(full).toContain('CẤM dùng "vạn tệ", "ức", "ức tệ", "nghìn vạn tệ".');
        expect(full).toContain('1万 -> 10 nghìn tệ');
        expect(full).toContain('50万 -> 500 nghìn tệ');
        expect(full).toContain('50亿 -> 5 tỷ tệ');
        expect(lite).toContain('我=Ta, 你=Ngươi, 他=Hắn, 她=Nàng');
        expect(lite).toContain('X家=X gia, X门=X môn');
        expect(lite).toContain('[CHỬI THỀ / SLANG]');
        expect(lite).toContain('Đệch, ngươi điên rồi à?');
        expect(lite).toContain('Đồ ngu.');
        expect(lite).toContain('Chiếc xe này giá 500 nghìn tệ, công ty được định giá 5 tỷ tệ.');
        expect(lite).toContain('Ta cũng do dì giới thiệu đến. Ngươi ngồi đi, chúng ta từ từ nói chuyện.');
        expect(lite).toContain('Tôi cũng do dì giới thiệu đến. Cô ngồi đi...');
        expect(lite).toContain('Trương tiểu thư, ngài khỏe chứ, ta là do dì giới thiệu đến.');
        expect(lite).toContain('Nói thật, ta vừa gặp ngươi đã rất thích ngươi.');
        expect(lite).toContain(glossary);
    });

    it('assembles lite profile for flash lite with dynamic slang hints intact', () => {
        const instruction = assembleSystemInstruction(
            { isCombat: false, isPersonalityHeavy: false, detectedRegister: 'Neutral', confidence: 0 },
            'Glossary: 我靠=Vãi!',
            undefined,
            '我靠！这也太离谱了吧？',
            'gemini-2.5-flash-lite'
        );

        expect(instruction).toContain('LƯU Ý INTERNET SLANG / KHẨU NGỮ HIỆN ĐẠI');
        expect(instruction).toContain('我靠');
        expect(instruction).not.toContain('LƯU Ý THÀNH NGỮ CHO ĐOẠN NÀY');
    });

    it('builds dynamic slang hints for profanity compounds', () => {
        const hints = buildDynamicSlangHints('你他妈疯了吧？操你妈！你个傻逼。');

        expect(hints).toContain('你他妈');
        expect(hints).toContain('操你妈');
        expect(hints).toContain('傻逼');
        expect(hints).toContain('CẤM dịch từng chữ/Hán Việt');
        expect(hints).toContain('SLANG CHỬI LÁCH / MEME TỤC');
        expect(hints).toContain('SLANG CHỬI TRỰC DIỆN');
    });

    it('keeps abbreviated slang tone in prompt guardrails', () => {
        const full = buildSystemInstruction(undefined, undefined, false, 'full');

        expect(full).toContain('"ĐM", "đệt", "đệch", "vãi lol", "vái nhái", "vãi cứt"');
        expect(full).toContain('Đệt! Chuyện này cũng quá vô lý rồi đấy?');
        expect(full).toContain('Vãi lol, thế mà cũng thắng được à?');
    });

    it('forces modern urban currency style without van or uc', () => {
        const full = buildSystemInstruction(undefined, undefined, false, 'full');

        expect(full).toContain('500 nghìn tệ');
        expect(full).toContain('5 tỷ tệ');
        expect(CURRENCY_RULE).toContain('CẤM dùng "vạn tệ", "ức", "ức tệ", "nghìn vạn tệ".');
        expect(CURRENCY_RULE).not.toContain('vạn tệ (mười nghìn)');
        expect(CURRENCY_RULE).toContain('1000万 -> 10 triệu tệ');
    });

    it('groups internet slang by pragmatic category', () => {
        const hints = buildDynamicSlangHints('这操作666，草泥马，我真的绷不住了。');

        expect(hints).toContain('SLANG KHEN / HYPE');
        expect(hints).toContain('SLANG CHỬI LÁCH / MEME TỤC');
        expect(hints).toContain('SLANG CẢM THÁN / REACTION');
        expect(hints).toContain('666');
        expect(hints).toContain('草泥马');
        expect(hints).toContain('绷不住了');
        expect(hints).not.toContain('sáu sáu sáu');
        expect(hints).not.toContain('thảo nê mã');
    });

    it('covers meme variants and messy-state internet slang', () => {
        const hints = buildDynamicSlangHints('我人都傻了，千只草泥马奔腾而过，现场乱七八糟，一脸懵逼。');

        expect(hints).toContain('千只草泥马奔腾而过');
        expect(hints).toContain('乱七八糟');
        expect(hints).toContain('一脸懵逼');
        expect(hints).toContain('lung ta lung tung');
        expect(hints).not.toContain('ngàn con thảo nê mã');
    });
});

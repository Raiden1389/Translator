import { describe, expect, it } from 'vitest';
import { scanBoilerplate, stripBoilerplate } from '@/lib/utils/strip-boilerplate';

describe('stripBoilerplate', () => {
    it('removes common simplified Chinese web novel junk', () => {
        const raw = [
            '首页',
            '第123章 风起',
            '第123章 风起',
            '正文第一句。',
            '这章没有结束，请点击下一页继续阅读！',
            '请记住本书首发域名：www.example.com',
            '手机版阅读网址：https://m.example.com',
            '下一章',
        ].join('\n');

        const { cleaned, changed } = stripBoilerplate(raw);

        expect(changed).toBe(true);
        expect(cleaned).toContain('第123章 风起');
        expect(cleaned).toContain('正文第一句。');
        expect(cleaned).not.toContain('首页');
        expect(cleaned).not.toContain('这章没有结束');
        expect(cleaned).not.toContain('请记住本书首发域名');
        expect(cleaned).not.toContain('手机版阅读网址');
        expect(cleaned).not.toContain('下一章');
        expect(cleaned.match(/第123章 风起/g)).toHaveLength(1);
    });

    it('removes common traditional Chinese web novel junk', () => {
        const raw = [
            '首頁',
            '正文第一句。',
            '本章未完，點擊下一頁繼續閱讀。',
            '請記住本書首發域名：www.example.com',
            '手機版閱讀網址：https://m.example.com',
            '章節目錄',
        ].join('\n');

        const found = scanBoilerplate(raw);
        const { cleaned } = stripBoilerplate(raw);

        expect(found.length).toBeGreaterThan(0);
        expect(cleaned).toBe('正文第一句。');
    });

    it('keeps normal story text that merely mentions navigation words in prose', () => {
        const raw = '他看着石碑上的“下一章”三个字，忽然笑了起来。\n正文继续。';

        const { cleaned, changed } = stripBoilerplate(raw);

        expect(changed).toBe(false);
        expect(cleaned).toBe(raw);
    });
});

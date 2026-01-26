import { describe, it, expect } from 'vitest';
import { NameHunterJudge } from '../judge';
import { TermType } from '../types';

describe('NameHunterJudge', () => {
    const judge = new NameHunterJudge();

    it('should filter stopwords', () => {
        expect(judge.classify({ original: 'Nhưng', context: '', count: 1 })).toBe(TermType.Junk);
        expect(judge.classify({ original: 'Tuy nhiên', context: '', count: 1 })).toBe(TermType.Junk);
        expect(judge.classify({ original: 'Hắn', context: '', count: 1 })).toBe(TermType.Junk);
    });

    it('should classify locations based on suffix', () => {
        expect(judge.classify({ original: 'Thanh Vân Thành', context: '', count: 1 })).toBe(TermType.Location);
        expect(judge.classify({ original: 'Hắc Phong Sơn', context: '', count: 1 })).toBe(TermType.Location);
    });

    it('should classify organizations based on suffix', () => {
        expect(judge.classify({ original: 'Thiên Đạo Tông', context: '', count: 1 })).toBe(TermType.Organization);
        expect(judge.classify({ original: 'Dược Sư Viện', context: '', count: 1 })).toBe(TermType.Organization);
    });

    it('should classify skills based on keywords', () => {
        expect(judge.classify({ original: 'Thái Ất Kiếm', context: '', count: 1 })).toBe(TermType.Skill);
        expect(judge.classify({ original: 'Đại Bi Chưởng', context: '', count: 1 })).toBe(TermType.Skill);
    });

    it('should return Unknown for unclassified terms', () => {
        expect(judge.classify({ original: 'Lâm Phàm', context: '', count: 1 })).toBe(TermType.Unknown);
    });
});

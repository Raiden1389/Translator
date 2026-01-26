import { describe, it, expect } from 'vitest';
import { NameHunterRegexEngine } from '../regex-engine';

describe('NameHunterRegexEngine', () => {
    const engine = new NameHunterRegexEngine();

    it('should extract simple capitalized names', () => {
        const text = "Lâm Phàm đang đi dạo.";
        const result = engine.extractCandidates(text);
        expect(result.some(r => r.original === 'Lâm Phàm')).toBe(true);
    });

    it('should extract names with multiple words', () => {
        const text = "Thiên Đạo Tông là môn phái lớn.";
        const result = engine.extractCandidates(text);
        expect(result.some(r => r.original === 'Thiên Đạo Tông')).toBe(true);
    });

    it('should count frequency correctly', () => {
        const text = "Lâm Phàm cười. Lâm Phàm nói.";
        const result = engine.extractCandidates(text);
        const candidate = result.find(r => r.original === 'Lâm Phàm');
        expect(candidate?.count).toBe(2);
    });

    it('should handle Vietnamese characters correctly', () => {
        const text = "Nguyễn Văn A đi chợ.";
        const result = engine.extractCandidates(text);
        expect(result.some(r => r.original === 'Nguyễn Văn A')).toBe(true);
    });

    // TODO: Add more aggressive tests for sentence start filtering once implemented
});

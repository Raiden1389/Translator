/**
 * 🧪 Unit Tests: Name Audit — Phase 01 & 02
 * 
 * Tests Vietnamese name extraction, Chinese name extraction,
 * paragraph alignment, similarity scoring, and clustering.
 * All pure functions — no DB, no API, no browser required.
 */

import { describe, it, expect } from 'vitest';
import {
    extractVietnameseNamesFromText,
    extractChineseNamesFromText,
    alignParagraphs,
} from '../lib/services/name-audit.extraction';
import {
    normalizedSimilarity,
    clusterSimilarNames,
    generateAuditReport,
} from '../lib/services/name-audit.clustering';
import type { NameScanResult } from '../lib/services/name-audit.types';

// ────────────────────────────────────────────────────
// 1. VIETNAMESE NAME EXTRACTION
// ────────────────────────────────────────────────────

describe('extractVietnameseNamesFromText', () => {
    it('should extract 2-word Vietnamese names', () => {
        const text = 'Cư Nam bước vào phòng, nhìn Lý Minh.';
        const result = extractVietnameseNamesFromText(text, 1);

        expect(result.has('Cư Nam')).toBe(true);
        expect(result.has('Lý Minh')).toBe(true);
        expect(result.get('Cư Nam')!.count).toBe(1);
    });

    it('should extract 3-word Vietnamese names', () => {
        const text = 'Lý Minh Hải đang đứng bên cạnh Trương Thiên Ái.';
        const result = extractVietnameseNamesFromText(text, 1);

        expect(result.has('Lý Minh Hải')).toBe(true);
        expect(result.has('Trương Thiên Ái')).toBe(true);
    });

    it('should count multiple occurrences of the same name', () => {
        const text = 'Cư Nam nói: "Ta đi." Cư Nam quay đầu. Cư Nam cười.';
        const result = extractVietnameseNamesFromText(text, 1);

        expect(result.get('Cư Nam')!.count).toBe(3);
    });

    it('should filter out common phrases (not names)', () => {
        const text = 'Đại Ca nói với Sư Phụ rằng Tu Tiên rất khó.';
        const result = extractVietnameseNamesFromText(text, 1);

        expect(result.has('Đại Ca')).toBe(false);
        expect(result.has('Sư Phụ')).toBe(false);
        expect(result.has('Tu Tiên')).toBe(false);
    });

    it('should filter out geographic names', () => {
        const text = 'Hắn đến từ Trung Quốc, sống ở Việt Nam.';
        const result = extractVietnameseNamesFromText(text, 1);

        expect(result.has('Trung Quốc')).toBe(false);
        expect(result.has('Việt Nam')).toBe(false);
    });

    it('should filter out cultivation realm names', () => {
        const text = 'Hắn đạt đến cảnh giới Nguyên Anh, tiếp theo là Kim Đan.';
        const result = extractVietnameseNamesFromText(text, 1);

        expect(result.has('Nguyên Anh')).toBe(false);
        expect(result.has('Kim Đan')).toBe(false);
    });

    it('should track chapter numbers correctly', () => {
        const text1 = 'Cư Nam bước đi.';
        const text2 = 'Cư Nam quay lại.';
        const map1 = extractVietnameseNamesFromText(text1, 5);
        const map2 = extractVietnameseNamesFromText(text2, 10);

        expect(map1.get('Cư Nam')!.chapters.has(5)).toBe(true);
        expect(map2.get('Cư Nam')!.chapters.has(10)).toBe(true);
    });

    it('should store context samples (max 3)', () => {
        const text = [
            'Cư Nam bước vào.',
            'Cư Nam ngồi xuống.',
            'Cư Nam đứng dậy.',
            'Cư Nam cười lớn.',
        ].join('\n');

        const result = extractVietnameseNamesFromText(text, 1);
        expect(result.get('Cư Nam')!.contexts.length).toBeLessThanOrEqual(3);
    });

    it('should not extract single uppercase words', () => {
        const text = 'Hắn đi rồi. Tốt lắm.';
        const result = extractVietnameseNamesFromText(text, 1);
        expect(result.size).toBe(0);
    });

    it('should handle empty text', () => {
        const result = extractVietnameseNamesFromText('', 1);
        expect(result.size).toBe(0);
    });
    it('should extract names at the start of a new sentence within the same paragraph', () => {
        const text = 'Han quay lai. Cu Nam buoc vao phong.';
        const result = extractVietnameseNamesFromText(text, 1);

        expect(result.has('Cu Nam')).toBe(true);
        expect(result.get('Cu Nam')!.count).toBe(1);
    });

    // ── Paragraph index tracking ──

    it('should track paragraph indices for cross-ref', () => {
        const text = 'Hắn đi rồi.\nCư Nam bước vào.\nLý Minh cười.';
        const result = extractVietnameseNamesFromText(text, 1);

        expect(result.get('Cư Nam')!.paragraphIndices).toContain(1);
        expect(result.get('Lý Minh')!.paragraphIndices).toContain(2);
    });

    it('should track multiple paragraph indices for same name', () => {
        const text = 'Cư Nam đi.\nHắn cười.\nCư Nam quay lại.';
        const result = extractVietnameseNamesFromText(text, 1);

        expect(result.get('Cư Nam')!.paragraphIndices).toContain(0);
        expect(result.get('Cư Nam')!.paragraphIndices).toContain(2);
    });

    it('should limit paragraph indices to max 5', () => {
        const paragraphs = Array.from({ length: 10 }, (_, i) => `Cư Nam nói ${i}.`);
        const text = paragraphs.join('\n');
        const result = extractVietnameseNamesFromText(text, 1);

        expect(result.get('Cư Nam')!.paragraphIndices.length).toBeLessThanOrEqual(5);
    });
});

// ────────────────────────────────────────────────────
// 2. CHINESE NAME EXTRACTION
// ────────────────────────────────────────────────────

describe('extractChineseNamesFromText', () => {
    it('should extract 2-char Chinese names (surname + 1)', () => {
        const text = '朱南走进了房间。';
        const result = extractChineseNamesFromText(text, 1);
        expect(result.has('朱南')).toBe(true);
    });

    it('should extract 3-char Chinese names (surname + 2)', () => {
        const text = '李明海站在门口。';
        const result = extractChineseNamesFromText(text, 1);
        expect(result.has('李明海')).toBe(true);
    });

    it('should prefer 3-char names over 2-char at same position', () => {
        const text = '李明海很高。';
        const result = extractChineseNamesFromText(text, 1);
        expect(result.has('李明海')).toBe(true);
        expect(result.has('李明')).toBe(false);
    });

    it('should count multiple occurrences', () => {
        const text = '朱南说话了。朱南很开心。朱南走了。';
        const result = extractChineseNamesFromText(text, 1);
        expect(result.get('朱南')!.count).toBe(3);
    });

    it('should not extract names with invalid chars', () => {
        const text = '李的很好。';
        const result = extractChineseNamesFromText(text, 1);
        expect(result.has('李的')).toBe(false);
    });

    it('should extract multiple different names', () => {
        const text = '朱南和李明海一起走了。';
        const result = extractChineseNamesFromText(text, 1);
        expect(result.has('朱南')).toBe(true);
        expect(result.has('李明海')).toBe(true);
    });

    it('should handle empty text', () => {
        const result = extractChineseNamesFromText('', 1);
        expect(result.size).toBe(0);
    });

    it('should track chapter numbers', () => {
        const text = '朱南来了。';
        const result = extractChineseNamesFromText(text, 42);
        expect(result.get('朱南')!.chapters.has(42)).toBe(true);
    });
});

// ────────────────────────────────────────────────────
// 3. PARAGRAPH ALIGNMENT
// ────────────────────────────────────────────────────

describe('alignParagraphs', () => {
    it('should align paragraphs by index', () => {
        const original = '朱南走了。\n\n李明海来了。';
        const translated = 'Cư Nam đi rồi.\n\nLý Minh Hải đến.';
        const aligned = alignParagraphs(original, translated);

        expect(aligned.length).toBe(2);
        expect(aligned[0].original).toContain('朱南');
        expect(aligned[0].translated).toContain('Cư Nam');
        expect(aligned[1].original).toContain('李明海');
        expect(aligned[1].translated).toContain('Lý Minh Hải');
    });

    it('should handle mismatched paragraph counts', () => {
        const original = '段落一。\n段落二。\n段落三。';
        const translated = 'Đoạn một.\nĐoạn hai.';
        const aligned = alignParagraphs(original, translated);
        expect(aligned.length).toBe(2);
    });

    it('should skip empty paragraphs', () => {
        const original = '段落一。\n\n\n段落二。';
        const translated = 'Đoạn một.\n\n\nĐoạn hai.';
        const aligned = alignParagraphs(original, translated);

        expect(aligned.length).toBe(2);
        expect(aligned[0].original).toBe('段落一。');
        expect(aligned[1].original).toBe('段落二。');
    });

    it('should handle empty input', () => {
        expect(alignParagraphs('', '')).toEqual([]);
        expect(alignParagraphs('hello', '')).toEqual([]);
        expect(alignParagraphs('', 'hello')).toEqual([]);
    });
});

// ────────────────────────────────────────────────────
// 4. SIMILARITY & CLUSTERING (Phase 02)
// ────────────────────────────────────────────────────

describe('normalizedSimilarity', () => {
    it('should return 1 for identical strings', () => {
        expect(normalizedSimilarity('Cư Nam', 'Cư Nam')).toBe(1);
    });

    it('should return low for completely different strings', () => {
        expect(normalizedSimilarity('abc', 'xyz')).toBeLessThan(0.5);
    });

    it('should return high for close variants', () => {
        const sim = normalizedSimilarity('Cư Nam', 'Trư Nam');
        expect(sim).toBeGreaterThan(0.7);
    });

    it('should return low for different names', () => {
        const sim = normalizedSimilarity('Trương Nam', 'Lý Minh');
        expect(sim).toBeLessThan(0.5);
    });

    it('should handle empty strings', () => {
        expect(normalizedSimilarity('', '')).toBe(1);
        expect(normalizedSimilarity('abc', '')).toBe(0);
    });
});

describe('clusterSimilarNames', () => {
    function makeScanResult(overrides: Partial<NameScanResult> = {}): NameScanResult {
        return {
            vietnameseNames: [],
            chineseNames: [],
            crossRefMap: [],
            totalChaptersScanned: 10,
            scanDurationMs: 100,
            ...overrides,
        };
    }

    it('should cluster names from crossRefMap', () => {
        const result = makeScanResult({
            vietnameseNames: [
                { name: 'Cư Nam', count: 20, chapters: [1, 2, 3], contexts: [], sourceRefs: [] },
                { name: 'Trư Nam', count: 10, chapters: [4, 5], contexts: [], sourceRefs: [] },
            ],
            crossRefMap: [{
                chineseName: '朱南',
                hanViet: 'Chu Nam',
                vietnameseVariants: ['Cư Nam', 'Trư Nam'],
            }],
        });

        const clusters = clusterSimilarNames(result);

        expect(clusters.length).toBe(1);
        expect(clusters[0].chineseName).toBe('朱南');
        expect(clusters[0].variants.length).toBe(2);
        expect(clusters[0].suggestedCanonical).toBe('Cư Nam');
        expect(clusters[0].isInconsistent).toBe(true);
        expect(clusters[0].confidence).toBe(1.0);
    });

    it('should fuzzy-match unassigned names to existing clusters', () => {
        const result = makeScanResult({
            vietnameseNames: [
                { name: 'Cư Nam', count: 20, chapters: [1, 2], contexts: [], sourceRefs: [] },
                { name: 'Cừ Nam', count: 5, chapters: [3], contexts: [], sourceRefs: [] },
            ],
            crossRefMap: [{
                chineseName: '朱南',
                hanViet: 'Chu Nam',
                vietnameseVariants: ['Cư Nam'],
            }],
        });

        const clusters = clusterSimilarNames(result);
        expect(clusters.length).toBe(1);
        expect(clusters[0].variants.length).toBe(2);
    });

    it('should create standalone clusters for unmatched names', () => {
        const result = makeScanResult({
            vietnameseNames: [
                { name: 'Lý Minh Hải', count: 15, chapters: [1], contexts: [], sourceRefs: [] },
            ],
        });

        const clusters = clusterSimilarNames(result);
        expect(clusters.length).toBe(1);
        expect(clusters[0].variants.length).toBe(1);
        expect(clusters[0].isInconsistent).toBe(false);
        expect(clusters[0].confidence).toBe(0.5);
    });

    it('should NOT cluster very different names', () => {
        const result = makeScanResult({
            vietnameseNames: [
                { name: 'Trương Nam', count: 10, chapters: [1], contexts: [], sourceRefs: [] },
                { name: 'Lý Minh', count: 8, chapters: [2], contexts: [], sourceRefs: [] },
            ],
        });

        const clusters = clusterSimilarNames(result);
        expect(clusters.length).toBe(2);
    });

    it('should sort: inconsistent first, then by total occurrences', () => {
        const result = makeScanResult({
            vietnameseNames: [
                { name: 'Abc Def', count: 100, chapters: [1], contexts: [], sourceRefs: [] },
                { name: 'Cư Nam', count: 20, chapters: [1], contexts: [], sourceRefs: [] },
                { name: 'Trư Nam', count: 10, chapters: [2], contexts: [], sourceRefs: [] },
            ],
            crossRefMap: [{
                chineseName: '朱南',
                hanViet: 'Chu Nam',
                vietnameseVariants: ['Cư Nam', 'Trư Nam'],
            }],
        });

        const clusters = clusterSimilarNames(result);
        expect(clusters[0].isInconsistent).toBe(true);
        expect(clusters[0].chineseName).toBe('朱南');
        expect(clusters[1].isInconsistent).toBe(false);
    });
});

describe('generateAuditReport', () => {
    it('should produce correct counts', () => {
        const scanResult: NameScanResult = {
            vietnameseNames: [
                { name: 'Cư Nam', count: 20, chapters: [1], contexts: [], sourceRefs: [] },
                { name: 'Trư Nam', count: 10, chapters: [2], contexts: [], sourceRefs: [] },
                { name: 'Lý Minh', count: 15, chapters: [1], contexts: [], sourceRefs: [] },
            ],
            chineseNames: [],
            crossRefMap: [{
                chineseName: '朱南',
                hanViet: 'Chu Nam',
                vietnameseVariants: ['Cư Nam', 'Trư Nam'],
            }],
            totalChaptersScanned: 10,
            scanDurationMs: 100,
        };

        const report = generateAuditReport(scanResult);
        expect(report.inconsistentCount).toBe(1);
        expect(report.consistentCount).toBe(1);
        expect(report.totalNamesFound).toBe(3);
        expect(report.clusters.length).toBe(2);
    });
});

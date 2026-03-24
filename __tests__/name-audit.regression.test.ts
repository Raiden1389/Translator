import { describe, it, expect } from 'vitest';
import {
    extractVietnameseNamesFromText,
} from '../lib/services/name-audit.extraction';
import {
    clusterSimilarNames,
} from '../lib/services/name-audit.clustering';
import type { NameScanResult } from '../lib/services/name-audit.types';

describe('name audit regressions', () => {
    it('extracts names at the start of a new sentence within the same paragraph', () => {
        const text = 'Han quay lai. Cu Nam buoc vao phong.';
        const result = extractVietnameseNamesFromText(text, 1);

        expect(result.has('Cu Nam')).toBe(true);
        expect(result.get('Cu Nam')!.count).toBe(1);
    });

    it('does not attach a variant to an unrelated cluster when the source paragraph mentions multiple Chinese names', () => {
        const scanResult: NameScanResult = {
            vietnameseNames: [
                { name: 'Ly Minh', count: 12, chapters: [1], contexts: [], sourceRefs: [] },
                {
                    name: 'Cu Nam',
                    count: 8,
                    chapters: [1],
                    contexts: ['Cu Nam di cung Ly Minh.'],
                    sourceRefs: [{
                        chapterOrder: 1,
                        paragraphIndex: 0,
                        vietnameseParagraph: 'Cu Nam di cung Ly Minh.',
                        chineseParagraph: '朱南和李明一起走来。',
                    }],
                },
            ],
            chineseNames: [
                { name: '李明', hanViet: 'Ly Minh', count: 12, chapters: [1] },
                { name: '朱南', hanViet: 'Chu Nam', count: 8, chapters: [1] },
            ],
            crossRefMap: [{
                chineseName: '李明',
                hanViet: 'Ly Minh',
                vietnameseVariants: ['Ly Minh'],
            }],
            totalChaptersScanned: 1,
            scanDurationMs: 10,
        };

        const clusters = clusterSimilarNames(scanResult);
        const lyMinhCluster = clusters.find(c => c.chineseName === '李明');
        const cuNamCluster = clusters.find(c => c.variants.some(v => v.name === 'Cu Nam'));

        expect(clusters.length).toBe(2);
        expect(lyMinhCluster?.variants.map(v => v.name)).toEqual(['Ly Minh']);
        expect(cuNamCluster?.chineseName).toBeUndefined();
    });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NameCluster } from '../lib/services/name-audit.types';

const {
    mockSweepSingleRule,
    mockChapterFilter,
    mockCorrectionFirst,
    mockCorrectionAdd,
    mockHistoryAdd,
} = vi.hoisted(() => ({
    mockSweepSingleRule: vi.fn(),
    mockChapterFilter: vi.fn(),
    mockCorrectionFirst: vi.fn(),
    mockCorrectionAdd: vi.fn(),
    mockHistoryAdd: vi.fn(),
}));

vi.mock('@/lib/services/corrections.service', () => ({
    sweepSingleRule: mockSweepSingleRule,
}));

vi.mock('@/lib/db', () => ({
    GLOBAL_WORKSPACE_ID: 'global',
    db: {
        chapters: {
            filter: mockChapterFilter,
        },
        corrections: {
            where: vi.fn(() => ({
                equals: vi.fn(() => ({
                    filter: vi.fn(() => ({
                        first: mockCorrectionFirst,
                    })),
                })),
            })),
            add: mockCorrectionAdd,
            update: vi.fn(),
        },
        history: {
            add: mockHistoryAdd,
        },
    },
}));

import { applyNameFixes } from '../lib/services/name-audit.autofix';

describe('applyNameFixes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCorrectionFirst.mockResolvedValue(undefined);
        mockCorrectionAdd.mockResolvedValue(1);
        mockSweepSingleRule.mockResolvedValue(2);
        mockHistoryAdd.mockResolvedValue(1);
        mockChapterFilter.mockImplementation((predicate?: (chapter: any) => boolean) => ({
            toArray: vi.fn(async () => {
                const chapters = [
                    { id: 1, workspaceId: 'ws-1', title: 'Ch 1', title_translated: 'Ch 1', content_translated: 'Cư Nam xuất hiện.' },
                    { id: 2, workspaceId: 'ws-2', title: 'Ch 2', title_translated: 'Ch 2', content_translated: 'Lý Minh xuất hiện.' },
                ];
                return predicate ? chapters.filter(predicate) : chapters;
            }),
        }));
    });

    it('limits snapshot and sweep to the current workspace', async () => {
        const clusters: NameCluster[] = [{
            id: 'cluster-1',
            chineseName: '朱南',
            hanViet: 'Chu Nam',
            variants: [
                { name: 'Cư Nam', count: 3, chapters: [1], contexts: [], sourceRefs: [] },
                { name: 'Cừ Nam', count: 1, chapters: [2], contexts: [], sourceRefs: [] },
            ],
            suggestedCanonical: 'Cư Nam',
            totalOccurrences: 4,
            isInconsistent: true,
            confidence: 1,
            actionabilityScore: 0.9,
            isActionable: true,
            chapterSpread: 2,
            sourceEvidenceCount: 0,
        }];

        const result = await applyNameFixes(
            new Map([['cluster-1', 'Cư Nam']]),
            clusters,
            'ws-1',
        );

        expect(result.rulesCreated).toBe(1);
        expect(mockSweepSingleRule).toHaveBeenCalledWith(
            expect.objectContaining({ from: 'Cừ Nam', to: 'Cư Nam' }),
            undefined,
            'ws-1',
        );
        expect(mockHistoryAdd).toHaveBeenCalledWith(expect.objectContaining({
            workspaceId: 'ws-1',
            affectedCount: 1,
            snapshot: [
                expect.objectContaining({ chapterId: 1 }),
            ],
        }));
    });
});

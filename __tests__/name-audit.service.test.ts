import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    mockFilter,
    mockEquals,
    mockWhere,
    mockSyllableRepo,
    mockVietPhraseRepo,
    mockChapters,
} = vi.hoisted(() => ({
    mockFilter: vi.fn(),
    mockEquals: vi.fn(),
    mockWhere: vi.fn(),
    mockChapters: [] as any[],
    mockSyllableRepo: {
        load: vi.fn(async () => undefined),
        toHanViet: vi.fn((text: string) => {
            if (text === '朱南') return 'Chu Nam';
            return `HV:${text}`;
        }),
    },
    mockVietPhraseRepo: {
        load: vi.fn(async () => undefined),
        convert: vi.fn((text: string) => `VP:${text}`),
    },
}));

mockFilter.mockImplementation((predicate?: (chapter: any) => boolean) => ({
    toArray: vi.fn(async () => {
        const chapters = [...mockChapters];
        return predicate ? chapters.filter(predicate) : chapters;
    }),
}));
mockEquals.mockImplementation(() => ({ filter: mockFilter }));
mockWhere.mockImplementation(() => ({ equals: mockEquals }));

vi.mock('@/lib/db', () => ({
    db: {
        chapters: {
            where: mockWhere,
        },
    },
}));

vi.mock('@/lib/repositories/syllable-repo', () => ({
    SyllableRepository: {
        getInstance: () => mockSyllableRepo,
    },
}));

vi.mock('@/lib/repositories/viet-phrase-repo', () => ({
    VietPhraseRepository: {
        getInstance: () => mockVietPhraseRepo,
    },
}));

import { scanWorkspaceNames } from '../lib/services/name-audit.service';

describe('scanWorkspaceNames', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockChapters.splice(0, mockChapters.length, 
            {
                id: 1,
                workspaceId: 'ws-1',
                order: 1,
                status: 'translated',
                content_original: '朱南走进了房间。',
                content_translated: 'Cu Nam buoc vao phong.',
            },
        );
    });

    it('loads syllable and VietPhrase dictionaries before scanning', async () => {
        await scanWorkspaceNames('ws-1');

        expect(mockSyllableRepo.load).toHaveBeenCalledWith('/dicts/ChinesePhienAmWords.txt');
        expect(mockVietPhraseRepo.load).toHaveBeenCalledWith('/dicts/VietPhrase.txt');
    });

    it('includes reviewing chapters when translated content exists', async () => {
        mockChapters.splice(0, mockChapters.length,
            {
                id: 1,
                workspaceId: 'ws-1',
                order: 1,
                status: 'translated',
                content_original: '朱南走进了房间。',
                content_translated: 'Cu Nam buoc vao phong.',
            },
            {
                id: 2,
                workspaceId: 'ws-1',
                order: 2,
                status: 'reviewing',
                content_original: '朱南回头了。',
                content_translated: 'Cu Nam quay lai.',
            },
        );

        const result = await scanWorkspaceNames('ws-1');

        expect(result.totalChaptersScanned).toBe(2);
        expect(result.vietnameseNames.find(name => name.name === 'Cu Nam')?.count).toBe(2);
    });

    it('builds cross-ref from source refs even when the Vietnamese variant is localized', async () => {
        mockChapters.splice(0, mockChapters.length,
            {
                id: 1,
                workspaceId: 'ws-1',
                order: 1,
                status: 'translated',
                content_original: '朱南走进了房间。',
                content_translated: 'Cư Nam buoc vao phong.',
            },
            {
                id: 2,
                workspaceId: 'ws-1',
                order: 2,
                status: 'translated',
                content_original: '朱南回头了。',
                content_translated: 'Cư Nam quay lai.',
            },
        );

        const result = await scanWorkspaceNames('ws-1');

        expect(result.crossRefMap).toContainEqual({
            chineseName: '朱南',
            hanViet: 'Chu Nam',
            vietnameseVariants: ['Cư Nam'],
        });
    });
});

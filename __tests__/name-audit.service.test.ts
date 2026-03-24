import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    mockToArray,
    mockFilter,
    mockEquals,
    mockWhere,
    mockSyllableRepo,
    mockVietPhraseRepo,
} = vi.hoisted(() => ({
    mockToArray: vi.fn(),
    mockFilter: vi.fn(),
    mockEquals: vi.fn(),
    mockWhere: vi.fn(),
    mockSyllableRepo: {
        load: vi.fn(async () => undefined),
        toHanViet: vi.fn((text: string) => `HV:${text}`),
    },
    mockVietPhraseRepo: {
        load: vi.fn(async () => undefined),
        convert: vi.fn((text: string) => `VP:${text}`),
    },
}));

mockFilter.mockImplementation(() => ({ toArray: mockToArray }));
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
        mockToArray.mockResolvedValue([
            {
                id: 1,
                workspaceId: 'ws-1',
                order: 1,
                status: 'translated',
                content_original: '朱南走进了房间。',
                content_translated: 'Cu Nam buoc vao phong.',
            },
        ]);
    });

    it('loads syllable and VietPhrase dictionaries before scanning', async () => {
        await scanWorkspaceNames('ws-1');

        expect(mockSyllableRepo.load).toHaveBeenCalledWith('/dicts/ChinesePhienAmWords.txt');
        expect(mockVietPhraseRepo.load).toHaveBeenCalledWith('/dicts/VietPhrase.txt');
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NameHunterJudge } from '../judge';
import { TermType } from '../types';

// Use vi.hoisted to ensure mocks are created before vi.mock() is executed
const { mockVPInstances, mockSyllableInstances } = vi.hoisted(() => {
    return {
        mockVPInstances: {
            has: vi.fn(),
            load: vi.fn()
        },
        mockSyllableInstances: {
            isValidTerm: vi.fn(),
            load: vi.fn()
        }
    };
});

// Mock Singleton instances with resolved paths
vi.mock('../../../repositories/viet-phrase-repo', () => ({
    VietPhraseRepository: {
        getInstance: vi.fn(() => mockVPInstances)
    }
}));

vi.mock('../../../repositories/syllable-repo', () => ({
    SyllableRepository: {
        getInstance: vi.fn(() => mockSyllableInstances)
    }
}));

describe('NameHunterJudge with Resources', () => {
    let judge: NameHunterJudge;

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Default behaviors
        mockSyllableInstances.isValidTerm.mockReturnValue(true);
        mockVPInstances.has.mockReturnValue(false);

        judge = new NameHunterJudge();
    });

    it('should classify as Junk if Syllable is invalid (e.g. Facebook)', () => {
        mockSyllableInstances.isValidTerm.mockReturnValue(false);
        expect(judge.classify({ original: 'Facebook', context: '', count: 1 })).toBe(TermType.Junk);
    });

    it('should classify as Unknown (Known Phrase) if found in VietPhrase', () => {
        mockVPInstances.has.mockReturnValue(true);
        // "Thanh Thiên" exists in VP -> Known -> Unknown/Ignored
        expect(judge.classify({ original: 'Thanh Thiên', context: '', count: 1 })).toBe(TermType.Unknown);
    });

    it('should proceed to Heuristics if valid syllable and not in VP', () => {
        mockSyllableInstances.isValidTerm.mockReturnValue(true);
        mockVPInstances.has.mockReturnValue(false);

        // "Thiên Đạo Tông" -> Not in VP -> Check Heuristics -> Organization
        expect(judge.classify({ original: 'Thiên Đạo Tông', context: '', count: 1 })).toBe(TermType.Organization);
    });
});

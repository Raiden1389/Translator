import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCorrectionsToArray = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    corrections: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: mockCorrectionsToArray
        }))
      }))
    }
  }
}));

describe('applyPostProcessing', () => {
  beforeEach(() => {
    mockCorrectionsToArray.mockReset();
    mockCorrectionsToArray.mockResolvedValue([]);
  });

  it('normalizes batch-style titles with the original chapter title and cleans malformed slang', async () => {
    const { applyPostProcessing } = await import('@/lib/gemini/translation/post-processor');

    const result = await applyPostProcessing(
      {
        translatedTitle: '[TIÊU ĐỀ]: phản công',
        translatedText: 'Ta con mẹ nó thắng rồi.'
      },
      'ws-1',
      [],
      {
        originalTitle: '第12章 反击'
      }
    );

    expect(result.translatedTitle).toBe('Chương 12: Phản công');
    expect(result.translatedText).toContain('Đệt thắng rồi.');
    expect(result.translatedText).not.toContain('Ta con mẹ nó');
  });
});

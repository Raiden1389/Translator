import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCorrectionsToArray = vi.fn();
const mockBuildGlossary = vi.fn();
const mockApplyPostProcessing = vi.fn();

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

vi.mock('@/lib/gemini/translation/glossary-builder', () => ({
  buildGlossary: mockBuildGlossary
}));

vi.mock('@/lib/gemini/translation/post-processor', () => ({
  applyPostProcessing: mockApplyPostProcessing
}));

describe('postProcessBatchChapters', () => {
  beforeEach(() => {
    mockCorrectionsToArray.mockReset();
    mockBuildGlossary.mockReset();
    mockApplyPostProcessing.mockReset();

    mockCorrectionsToArray.mockResolvedValue([{ workspaceId: 'ws-1', type: 'replace', from: 'A', to: 'B' }]);
    mockBuildGlossary.mockResolvedValue({ relevantDict: [{ original: '陈', translated: 'Trần', type: 'character' }], glossaryContext: '' });
    mockApplyPostProcessing.mockImplementation(async (parsed, _workspaceId, _relevantDict, options) => ({
      translatedTitle: `PP:${options.originalTitle}`,
      translatedText: `PP:${parsed.translatedText}`
    }));
  });

  it('routes every batch chapter through the shared post-processing pipeline', async () => {
    const { postProcessBatchChapters } = await import('@/lib/gemini/batch-api');

    const chapters = [
      {
        id: 1,
        workspaceId: 'ws-1',
        title: '第1章 反击',
        content_original: '陈风出手了。',
        content_translated: 'Ta con mẹ nó thắng rồi.',
        title_translated: 'phản công',
        order: 1,
        status: 'draft' as const
      },
      {
        id: 2,
        workspaceId: 'ws-1',
        title: '第2章 追击',
        content_original: '李云追了上去。',
        content_translated: 'Ngươi thằng điên này!',
        title_translated: 'truy kích',
        order: 2,
        status: 'draft' as const
      }
    ];

    const processed = await postProcessBatchChapters(chapters, 'ws-1');

    expect(mockBuildGlossary).toHaveBeenNthCalledWith(1, 'ws-1', '陈风出手了。');
    expect(mockBuildGlossary).toHaveBeenNthCalledWith(2, 'ws-1', '李云追了上去。');
    expect(mockApplyPostProcessing).toHaveBeenCalledTimes(2);
    expect(mockApplyPostProcessing).toHaveBeenNthCalledWith(
      1,
      {
        translatedTitle: 'phản công',
        translatedText: 'Ta con mẹ nó thắng rồi.'
      },
      'ws-1',
      [{ original: '陈', translated: 'Trần', type: 'character' }],
      expect.objectContaining({
        originalTitle: '第1章 反击',
        corrections: [{ workspaceId: 'ws-1', type: 'replace', from: 'A', to: 'B' }]
      })
    );
    expect(processed[0].title_translated).toBe('PP:第1章 反击');
    expect(processed[1].content_translated).toBe('PP:Ngươi thằng điên này!');
  });
});

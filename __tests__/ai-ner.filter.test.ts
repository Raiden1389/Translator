import { describe, expect, it, vi } from 'vitest';
import { EntityType, type ExtractedEntity } from '../lib/services/ai-ner.types';

vi.mock('../lib/db', () => ({
  db: {
    dictionary: { where: () => ({ equals: () => ({ toArray: async () => [] }) }) },
    blacklist: { where: () => ({ equals: () => ({ toArray: async () => [] }) }) },
    heuristicTerms: { where: () => ({ equals: () => ({ toArray: async () => [] }) }) },
  },
}));

import { filterExistingEntities } from '../lib/services/ai-ner.filter';

describe('AI NER filter', () => {
  it('drops generic person nouns returned by AI', async () => {
    const entities: ExtractedEntity[] = [
      { chinese: '男子', original: 'Nam tử', type: EntityType.Person, context: 'Danh từ chung' },
      { chinese: '女子', original: 'Nữ tử', type: EntityType.Person, context: 'Danh từ chung' },
      { chinese: '老者', original: 'Lão giả', type: EntityType.Person, context: 'Danh từ chung' },
      { chinese: '林动', original: 'Lâm Động', type: EntityType.Person, context: 'Nhân vật thật' },
    ];

    const result = await filterExistingEntities(entities, 'ws-1');

    expect(result.entities.map(entity => entity.chinese)).toEqual(['林动']);
    expect(result.filteredCount).toBe(3);
  });
});

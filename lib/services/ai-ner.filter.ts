import { db } from '../db';
import { EntityType, ExtractedEntity } from './ai-ner.types';

const GENERIC_PERSON_TERMS = new Set([
    '男子', '男的', '男人', '男孩', '少年', '青年', '中年男子', '年轻男子',
    '女子', '女的', '女人', '女孩', '少女', '青年女子', '年轻女子',
    '老人', '老者', '老头', '老妇', '妇人', '夫人',
    '小孩', '孩子', '孩童', '婴儿',
    '路人', '众人', '此人', '那人', '一人', '二人',
    '黑衣人', '白衣人', '红衣女子', '黑衣女子', '白衣女子',
]);

const GENERIC_PERSON_TRANSLATIONS = new Set([
    'nam tử', 'đàn ông', 'nam nhân', 'người đàn ông', 'gã đàn ông', 'chàng trai',
    'nữ tử', 'đàn bà', 'nữ nhân', 'người phụ nữ', 'cô gái', 'thiếu nữ',
    'thiếu niên', 'thanh niên', 'trung niên', 'trung niên nam tử',
    'lão giả', 'ông lão', 'lão nhân', 'bà lão', 'phụ nhân',
    'đứa trẻ', 'trẻ con', 'hài tử', 'người qua đường', 'mọi người', 'chúng nhân',
    'người áo đen', 'người áo trắng', 'nữ tử áo đỏ', 'nữ tử áo đen', 'nữ tử áo trắng',
]);

function normalizeEntityKey(value: string | undefined | null): string {
    return (value || '').normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
}

function isGenericPersonEntity(entity: ExtractedEntity): boolean {
    if (entity.type !== EntityType.Person) return false;
    const chinese = normalizeEntityKey(entity.chinese);
    const translated = normalizeEntityKey(entity.original);
    return GENERIC_PERSON_TERMS.has(chinese) || GENERIC_PERSON_TRANSLATIONS.has(translated);
}

export function dedupeEntitiesByChinese(entities: ExtractedEntity[]): ExtractedEntity[] {
    const uniqueMap = new Map<string, ExtractedEntity>();
    entities.forEach((entity) => {
        if (!uniqueMap.has(entity.chinese)) {
            uniqueMap.set(entity.chinese, entity);
        }
    });
    return Array.from(uniqueMap.values());
}

export async function filterExistingEntities(
    entities: ExtractedEntity[],
    workspaceId: string,
): Promise<{ entities: ExtractedEntity[]; filteredCount: number }> {
    const [existingTerms, blacklistTerms, heuristicTerms] = await Promise.all([
        db.dictionary.where("workspaceId").equals(workspaceId).toArray(),
        db.blacklist.where("workspaceId").equals(workspaceId).toArray(),
        db.heuristicTerms.where("workspaceId").equals(workspaceId).toArray()
    ]);

    const existingChinese = new Set(existingTerms.map(t => t.original));
    const blacklistedChinese = new Set(blacklistTerms.map(b => b.word));
    const approvedHeuristic = new Set(
        heuristicTerms.filter(h => h.isApproved).map(h => h.original)
    );

    const filtered = entities.filter((entity) => {
        const isGenericPerson = isGenericPersonEntity(entity);
        const inDict = existingChinese.has(entity.chinese);
        const inBlacklist = blacklistedChinese.has(entity.chinese);
        const inHeuristic = approvedHeuristic.has(entity.chinese);
        if (isGenericPerson || inDict || inBlacklist || inHeuristic) {
            console.log(`[AI NER] FILTERED OUT: ${entity.chinese}→${entity.original} (generic:${isGenericPerson}, dict:${inDict}, bl:${inBlacklist}, heu:${inHeuristic})`);
        }
        return !isGenericPerson && !inDict && !inBlacklist && !inHeuristic;
    });

    return {
        entities: filtered,
        filteredCount: entities.length - filtered.length,
    };
}

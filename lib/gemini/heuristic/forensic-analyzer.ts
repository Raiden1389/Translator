/**
 * Forensic Analyzer for Heuristic Pipeline
 * Analyzes why entities are dropped and suggests fixes
 * Version: 1.0
 */

import type { HeuristicTerm } from '@/lib/db';

export interface DropReason {
    reason: string;
    count: number;
    percentage: number;
    examples: Array<{ original: string; translated: string }>;
    suggestedFix: string;
}

export interface TypeForensicReport {
    type: 'character' | 'skill' | 'location' | 'title' | 'unknown';
    totalDetected: number;
    totalApproved: number;
    totalDropped: number;
    dropRate: number;
    topReasons: DropReason[];
}

export interface ForensicReport {
    summary: {
        totalScanned: number;
        totalApproved: number;
        totalDropped: number;
        overallDropRate: number;
    };
    byType: TypeForensicReport[];
}

/**
 * Analyze heuristic results and generate forensic report
 */
export function analyzeHeuristicResults(
    allTerms: HeuristicTerm[],
    approvedTerms: HeuristicTerm[]
): ForensicReport {
    // Analyze PENDING terms (not approved yet) for /analyze-heuristic workflow
    // This avoids needing to run expensive "AI Refine" first
    const approvedSet = new Set(approvedTerms.map(t => t.original));
    const pendingTerms = allTerms.filter(t => !t.isGarbage && !approvedSet.has(t.original));

    const summary = {
        totalScanned: allTerms.length,
        totalApproved: approvedTerms.length,
        totalDropped: pendingTerms.length,
        overallDropRate: allTerms.length > 0 ? (pendingTerms.length / allTerms.length) * 100 : 0
    };

    const types: Array<'character' | 'skill' | 'location' | 'title' | 'unknown'> = [
        'character',
        'skill',
        'location',
        'title',
        'unknown'
    ];

    const byType = types.map(type => analyzeByType(type, allTerms, pendingTerms, approvedSet));

    return { summary, byType };
}

/**
 * Analyze pending entities for a specific type
 */
function analyzeByType(
    type: 'character' | 'skill' | 'location' | 'title' | 'unknown',
    allTerms: HeuristicTerm[],
    pendingTerms: HeuristicTerm[],
    approvedSet: Set<string>
): TypeForensicReport {
    const typeTerms = allTerms.filter(t => t.type === type && !t.isGarbage);
    const typePending = pendingTerms.filter(t => t.type === type);

    const totalDetected = typeTerms.length;
    const totalDropped = typePending.length;
    const totalApproved = typeTerms.filter(t => approvedSet.has(t.original)).length;
    const dropRate = totalDetected > 0 ? (totalDropped / totalDetected) * 100 : 0;

    // Analyze drop reasons
    const reasonMap = new Map<string, { count: number; examples: Array<{ original: string; translated: string }> }>();

    typePending.forEach(term => {
        const reason = inferDropReason(term, type);
        const existing = reasonMap.get(reason) || { count: 0, examples: [] };
        existing.count++;
        // Show ALL examples, not just first 5
        existing.examples.push({
            original: term.original,
            translated: term.translated || term.original
        });
        reasonMap.set(reason, existing);
    });

    // Convert to DropReason array and sort by count
    const topReasons: DropReason[] = Array.from(reasonMap.entries())
        .map(([reason, data]) => ({
            reason,
            count: data.count,
            percentage: totalDropped > 0 ? (data.count / totalDropped) * 100 : 0,
            examples: data.examples,
            suggestedFix: suggestFix(reason)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 reasons

    return {
        type,
        totalDetected,
        totalApproved,
        totalDropped,
        dropRate,
        topReasons
    };
}

/**
 * Infer why an entity was dropped
 */
function inferDropReason(term: HeuristicTerm, entityType: string): string {
    const { original, occurrences = 0, metadata = {} } = term;

    // Check common drop reasons
    if (occurrences < 2) return 'Tần suất thấp (< 2 lần)';
    if (original.length === 1) return 'Quá ngắn (1 ký tự)';
    if (original.length > 6) return 'Quá dài (> 6 ký tự)';

    // Type-specific reasons
    if (entityType === 'skill') {
        if (!hasSkillSuffix(original)) return 'Thiếu hậu tố chiêu thức';
    }

    if (entityType === 'character') {
        const hasVerb = metadata.hasVerb as boolean | undefined;
        const hasAnchor = metadata.hasAnchor as boolean | undefined;
        if (!hasVerb && !hasAnchor) return 'Thiếu anchor/động từ';
        if (isCommonWord(original)) return 'Từ phổ biến (có thể là noise)';
    }

    if (entityType === 'location') {
        if (!hasLocationSuffix(original)) return 'Thiếu hậu tố địa danh';
    }

    return 'Lý do khác (cần kiểm tra)';
}

/**
 * Suggest fix for a drop reason
 */
function suggestFix(reason: string): string {
    if (reason.includes('Tần suất thấp')) {
        return '💡 Giảm ngưỡng tần suất hoặc thêm vào từ điển thủ công';
    }

    if (reason.includes('Thiếu hậu tố chiêu thức')) {
        return '💡 Thêm hậu tố vào SKILL_SUFFIXES trong patterns.ts';
    }

    if (reason.includes('Thiếu anchor')) {
        return '💡 Thêm anchor vào CHARACTER_ANCHORS hoặc dùng SOFT_CHARACTER_PATTERN';
    }

    if (reason.includes('Thiếu hậu tố địa danh')) {
        return '💡 Thêm hậu tố vào LOCATION_SUFFIXES trong patterns.ts';
    }

    if (reason.includes('Từ phổ biến')) {
        return '💡 Thêm vào blacklist hoặc tăng ngưỡng scoring';
    }

    if (reason.includes('Quá ngắn')) {
        return '💡 Tăng minLength trong config hoặc thêm context check';
    }

    if (reason.includes('Quá dài')) {
        return '💡 Kiểm tra regex pattern, có thể bắt nhầm cụm từ';
    }

    return '💡 Cần phân tích thủ công';
}

/**
 * Check if term has skill suffix
 */
function hasSkillSuffix(term: string): boolean {
    const skillSuffixes = ['功', '诀', '法', '步', '术', '拳', '掌', '剑', '阵', '经', '典', '指', '印', '击', '斩', '破', '杀', '爆', '轰', '裂', '灭', '封', '镇', '禁'];
    return skillSuffixes.some(suffix => term.endsWith(suffix));
}

/**
 * Check if term has location suffix
 */
function hasLocationSuffix(term: string): boolean {
    const locationSuffixes = ['山', '河', '湖', '海', '城', '镇', '村', '府', '宫', '殿', '阁', '楼', '院', '谷', '峰', '岛', '洲', '国', '郡', '州', '县'];
    return locationSuffixes.some(suffix => term.endsWith(suffix));
}

/**
 * Check if term is a common word (likely noise)
 */
function isCommonWord(term: string): boolean {
    const commonWords = ['这个', '那个', '什么', '怎么', '为什么', '不是', '可以', '应该', '一定', '肯定', '当然', '如果', '虽然', '但是', '因为', '所以'];
    return commonWords.includes(term);
}

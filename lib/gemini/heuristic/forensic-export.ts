/**
 * Forensic JSON Export Formats
 * Generates 3 different JSON formats for different use cases
 */

import type { HeuristicTerm } from '@/lib/db';

export type ExportFormat = 'raw' | 'forensic' | 'summary';

interface DropReason {
    reason: string;
    count: number;
    percentage: number;
    examples: string[];
}

interface RawDropJSON {
    type: string;
    total_scanned: number;
    total_kept: number;
    total_dropped: number;
    drop_reasons: DropReason[];
}

interface ForensicAnalysisItem {
    drop_reason: string;
    classification: 'INTENTIONAL' | 'QUESTIONABLE' | 'DANGEROUS';
    technical_cause: string[];
    impact_if_fix: {
        precision: string;
        recall: string;
        performance: string;
        risk: string;
    };
    conceptual_fix: string[];
    recommendation: string;
}

interface ForensicAnalysisJSON {
    type: string;
    analysis: ForensicAnalysisItem[];
}

interface SummaryJSON {
    type: string;
    summary: {
        top_problem: string;
        top_problem_percentage: number;
        risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
        suggested_action: string;
    };
}

/**
 * Generate RAW DROP JSON format
 */
export function generateRawDropJSON(terms: HeuristicTerm[], type: string): RawDropJSON {
    const kept = terms.filter(t => t.isApproved);
    const dropped = terms.filter(t => !t.isApproved);

    // Analyze drop reasons
    const reasonMap = new Map<string, string[]>();

    dropped.forEach(term => {
        const reason = inferDropReason(term);
        const existing = reasonMap.get(reason) || [];
        if (existing.length < 5) {
            existing.push(term.original);
        }
        reasonMap.set(reason, existing);
    });

    const drop_reasons: DropReason[] = Array.from(reasonMap.entries()).map(([reason, examples]) => ({
        reason,
        count: dropped.filter(t => inferDropReason(t) === reason).length,
        percentage: dropped.length > 0 ? (dropped.filter(t => inferDropReason(t) === reason).length / dropped.length) * 100 : 0,
        examples
    })).sort((a, b) => b.count - a.count);

    return {
        type,
        total_scanned: terms.length,
        total_kept: kept.length,
        total_dropped: dropped.length,
        drop_reasons
    };
}

/**
 * Generate FORENSIC ANALYSIS JSON format
 */
export function generateForensicJSON(terms: HeuristicTerm[], type: string): ForensicAnalysisJSON {
    const dropped = terms.filter(t => !t.isApproved);

    // Group by drop reason
    const reasonMap = new Map<string, HeuristicTerm[]>();
    dropped.forEach(term => {
        const reason = inferDropReason(term);
        const existing = reasonMap.get(reason) || [];
        existing.push(term);
        reasonMap.set(reason, existing);
    });

    const analysis: ForensicAnalysisItem[] = Array.from(reasonMap.entries()).map(([reason, terms]) => {
        const classification = classifyDropReason(reason, type);
        const technicalCause = getTechnicalCause(reason, type);
        const impact = getImpactAssessment(reason, type);
        const conceptualFix = getConceptualFix(reason, type);
        const recommendation = getRecommendation(classification, impact);

        return {
            drop_reason: reason,
            classification,
            technical_cause: technicalCause,
            impact_if_fix: impact,
            conceptual_fix: conceptualFix,
            recommendation
        };
    }).sort((a, b) => {
        // Sort: QUESTIONABLE first, then DANGEROUS, then INTENTIONAL
        const order = { QUESTIONABLE: 0, DANGEROUS: 1, INTENTIONAL: 2 };
        return order[a.classification] - order[b.classification];
    });

    return { type, analysis };
}

/**
 * Generate SUMMARY JSON format
 */
export function generateSummaryJSON(terms: HeuristicTerm[], type: string): SummaryJSON {
    const dropped = terms.filter(t => !t.isApproved);

    // Find top problem
    const reasonMap = new Map<string, number>();
    dropped.forEach(term => {
        const reason = inferDropReason(term);
        reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1);
    });

    const topProblem = Array.from(reasonMap.entries())
        .sort((a, b) => b[1] - a[1])[0];

    const topProblemPercentage = dropped.length > 0 ? (topProblem[1] / dropped.length) * 100 : 0;
    const riskLevel = getRiskLevel(topProblem[0], topProblemPercentage);
    const suggestedAction = getSuggestedAction(topProblem[0], type);

    return {
        type,
        summary: {
            top_problem: topProblem[0],
            top_problem_percentage: topProblemPercentage,
            risk_level: riskLevel,
            suggested_action: suggestedAction
        }
    };
}

/**
 * Helper: Infer drop reason
 */
function inferDropReason(term: HeuristicTerm): string {
    const { original, occurrences = 0 } = term;

    if (occurrences < 2) return 'LOW_FREQUENCY';
    if (original.length === 1) return 'TOO_SHORT';
    if (original.length > 6) return 'TOO_LONG';

    // Type-specific
    if (term.type === 'skill' && !hasSkillSuffix(original)) return 'MISSING_SKILL_SUFFIX';
    if (term.type === 'character') return 'NO_ANCHOR';
    if (term.type === 'location' && !hasLocationSuffix(original)) return 'MISSING_LOCATION_SUFFIX';

    return 'OTHER';
}

/**
 * Helper: Classify drop reason
 */
function classifyDropReason(reason: string, type: string): 'INTENTIONAL' | 'QUESTIONABLE' | 'DANGEROUS' {
    if (reason === 'LOW_FREQUENCY') return 'INTENTIONAL';
    if (reason === 'TOO_SHORT') return 'INTENTIONAL';
    if (reason === 'TOO_LONG') return 'QUESTIONABLE';
    if (reason === 'NO_ANCHOR') return 'QUESTIONABLE';
    if (reason === 'MISSING_SKILL_SUFFIX') return 'QUESTIONABLE';
    if (reason === 'MISSING_LOCATION_SUFFIX') return 'QUESTIONABLE';
    return 'QUESTIONABLE';
}

/**
 * Helper: Get technical cause
 */
function getTechnicalCause(reason: string, type: string): string[] {
    const causes: Record<string, string[]> = {
        NO_ANCHOR: [
            'Pattern yêu cầu anchor hoặc verb',
            'Standalone name không match',
            'Thiếu context xung quanh'
        ],
        MISSING_SKILL_SUFFIX: [
            'Pattern chỉ match khi có suffix cụ thể',
            'Nhiều skill không theo format chuẩn'
        ],
        MISSING_LOCATION_SUFFIX: [
            'Pattern yêu cầu suffix địa danh',
            'Tên địa điểm không theo quy ước'
        ],
        TOO_LONG: [
            'Regex có giới hạn độ dài',
            'Có thể bắt nhầm cụm từ thay vì entity'
        ],
        LOW_FREQUENCY: [
            'Ngưỡng tần suất tối thiểu là 2',
            'Xuất hiện 1 lần có thể là typo'
        ]
    };
    return causes[reason] || ['Cần phân tích thủ công'];
}

/**
 * Helper: Get impact assessment
 */
function getImpactAssessment(reason: string, type: string) {
    const impacts: Record<string, any> = {
        NO_ANCHOR: {
            precision: '-10~15%',
            recall: '+30~40%',
            performance: 'No impact',
            risk: 'Medium'
        },
        MISSING_SKILL_SUFFIX: {
            precision: '-5~10%',
            recall: '+20~30%',
            performance: 'No impact',
            risk: 'Low'
        },
        MISSING_LOCATION_SUFFIX: {
            precision: '-5~10%',
            recall: '+15~25%',
            performance: 'No impact',
            risk: 'Low'
        },
        TOO_LONG: {
            precision: '+5~10%',
            recall: '-10~15%',
            performance: 'No impact',
            risk: 'Low'
        }
    };
    return impacts[reason] || {
        precision: 'Unknown',
        recall: 'Unknown',
        performance: 'Unknown',
        risk: 'Unknown'
    };
}

/**
 * Helper: Get conceptual fix
 */
function getConceptualFix(reason: string, type: string): string[] {
    const fixes: Record<string, string[]> = {
        NO_ANCHOR: [
            'Soft opt-in với context check',
            'Anchor relaxation có điều kiện',
            'Thêm whitelist cho tên phổ biến'
        ],
        MISSING_SKILL_SUFFIX: [
            'Suffix expansion',
            'Pattern refinement cho skill không chuẩn'
        ],
        MISSING_LOCATION_SUFFIX: [
            'Suffix expansion',
            'Thêm pattern cho địa danh đặc biệt'
        ],
        TOO_LONG: [
            'Tăng max length có điều kiện',
            'Thêm context check để tránh false positive'
        ]
    };
    return fixes[reason] || ['Cần phân tích thủ công'];
}

/**
 * Helper: Get recommendation
 */
function getRecommendation(classification: string, impact: any): string {
    if (classification === 'INTENTIONAL') return 'Không cần sửa - Đúng thiết kế';
    if (classification === 'DANGEROUS') return 'KHÔNG NÊN sửa - Rủi ro cao';
    if (impact.risk === 'High') return 'QUESTIONABLE - Cần test kỹ trước khi apply';
    if (impact.risk === 'Medium') return 'QUESTIONABLE - Test precision trước khi apply';
    return 'QUESTIONABLE - Có thể thử nghiệm';
}

/**
 * Helper: Get risk level
 */
function getRiskLevel(reason: string, percentage: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (percentage > 70) return 'HIGH';
    if (percentage > 40) return 'MEDIUM';
    return 'LOW';
}

/**
 * Helper: Get suggested action
 */
function getSuggestedAction(reason: string, type: string): string {
    const actions: Record<string, string> = {
        NO_ANCHOR: 'Anchor relaxation',
        MISSING_SKILL_SUFFIX: 'Suffix expansion',
        MISSING_LOCATION_SUFFIX: 'Suffix expansion',
        TOO_LONG: 'Max length adjustment',
        LOW_FREQUENCY: 'Không cần action'
    };
    return actions[reason] || 'Manual review';
}

/**
 * Helper: Check skill suffix
 */
function hasSkillSuffix(term: string): boolean {
    const suffixes = ['功', '诀', '法', '步', '术', '拳', '掌', '剑', '阵', '经', '典', '指', '印', '击', '斩', '破', '杀', '爆', '轰', '裂', '灭', '封', '镇', '禁'];
    return suffixes.some(s => term.endsWith(s));
}

/**
 * Helper: Check location suffix
 */
function hasLocationSuffix(term: string): boolean {
    const suffixes = ['山', '河', '湖', '海', '城', '镇', '村', '府', '宫', '殿', '阁', '楼', '院', '谷', '峰', '岛', '洲', '国', '郡', '州', '县'];
    return suffixes.some(s => term.endsWith(s));
}

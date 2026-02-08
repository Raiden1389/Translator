/**
 * useHeuristicStats
 * Calculate statistics for heuristic terms
 */

import { useMemo } from 'react';
import type { HeuristicTerm } from '@/lib/db';

export interface HeuristicStats {
    total: number;
    character: number;
    skill: number;
    location: number;
    unknown: number;
    approved: number;
}

export function useHeuristicStats(rawTerms: HeuristicTerm[]): HeuristicStats {
    return useMemo(() => {
        const counts: HeuristicStats = {
            total: 0,
            character: 0,
            skill: 0,
            location: 0,
            unknown: 0,
            approved: 0
        };

        for (let i = 0; i < rawTerms.length; i++) {
            const t = rawTerms[i];
            if (t.isGarbage) continue;

            counts.total++;
            if (t.isApproved) counts.approved++;

            const type = (t.type || 'unknown').toLowerCase();
            if (type === 'character') counts.character++;
            else if (type === 'skill') counts.skill++;
            else if (type === 'location') counts.location++;
            else counts.unknown++;
        }

        return counts;
    }, [rawTerms]);
}

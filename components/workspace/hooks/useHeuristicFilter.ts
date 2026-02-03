/**
 * useHeuristicFilter
 * Filter and sort heuristic terms based on search and type filter
 */

import { useMemo } from 'react';
import type { HeuristicTerm } from '@/lib/db';

export type HeuristicFilterType = 'all' | 'character' | 'skill' | 'location' | 'unknown';

export function useHeuristicFilter(
    rawTerms: HeuristicTerm[],
    search: string,
    filter: HeuristicFilterType
): HeuristicTerm[] {
    return useMemo(() => {
        const lowerSearch = search.toLowerCase();

        return rawTerms
            .filter(t => {
                if (t.isGarbage) return false;

                const matchesSearch = !search ||
                    t.original.toLowerCase().includes(lowerSearch) ||
                    (t.translated || '').toLowerCase().includes(lowerSearch);

                const type = (t.type || 'unknown').toLowerCase();
                const matchesType = filter === 'all' ||
                    (filter === 'unknown'
                        ? (type !== 'character' && type !== 'skill' && type !== 'location')
                        : type === filter);

                return matchesSearch && matchesType;
            })
            .sort((a, b) => (b.occurrences || 0) - (a.occurrences || 0));
    }, [rawTerms, search, filter]);
}

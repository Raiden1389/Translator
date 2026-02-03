import { useMemo } from 'react';
import type { HeuristicTerm } from '@/lib/db';

export type HeuristicTypeFilter = 'all' | 'character' | 'unknown';
export type HeuristicStatusFilter = 'all' | 'pending' | 'approved';

export function useHeuristicFilter(
    rawTerms: HeuristicTerm[],
    search: string,
    typeFilter: HeuristicTypeFilter,
    statusFilter: HeuristicStatusFilter
): HeuristicTerm[] {
    return useMemo(() => {
        const lowerSearch = search.toLowerCase();

        return rawTerms
            .filter(t => {
                if (t.isGarbage) return false;

                // 1. Search Filter
                const matchesSearch = !search ||
                    t.original.toLowerCase().includes(lowerSearch) ||
                    (t.translated || '').toLowerCase().includes(lowerSearch);
                if (!matchesSearch) return false;

                // 2. Status Filter
                const matchesStatus = statusFilter === 'all' ||
                    (statusFilter === 'pending' ? !t.isApproved : t.isApproved);
                if (!matchesStatus) return false;

                // 3. Type Filter
                const type = (t.type || 'unknown').toLowerCase();
                const matchesType = typeFilter === 'all' ||
                    (typeFilter === 'unknown'
                        ? (type !== 'character' && type !== 'skill' && type !== 'location')
                        : type === typeFilter);

                return matchesType;
            })
            .sort((a, b) => (b.occurrences || 0) - (a.occurrences || 0));
    }, [rawTerms, search, typeFilter, statusFilter]);
}

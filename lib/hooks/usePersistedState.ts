import { useState, useEffect, useMemo } from 'react';

/**
 * Hook to persist state to localStorage with debouncing
 * @param key - localStorage key
 * @param initialValue - default value if no saved state
 * @param debounceMs - debounce delay in ms (default 300)
 */
export function usePersistedState<T>(
    key: string,
    initialValue: T,
    debounceMs: number = 300
): [T, (value: T | ((prev: T) => T)) => void] {
    // Initialize state from localStorage or use initial value
    const [state, setState] = useState<T>(() => {
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.warn(`Failed to load persisted state for key "${key}":`, error);
        }
        return initialValue;
    });

    // Debounced save to localStorage
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            try {
                localStorage.setItem(key, JSON.stringify(state));
            } catch (error) {
                console.warn(`Failed to persist state for key "${key}":`, error);
            }
        }, debounceMs);

        return () => clearTimeout(timeoutId);
    }, [key, state, debounceMs]);

    return [state, setState];
}

/**
 * Hook to persist multiple related states as a single object
 * Useful for persisting header state (search, filter, page, etc.)
 */
export function usePersistedObject<T extends Record<string, any>>(
    key: string,
    initialValue: T,
    debounceMs: number = 300
): [T, (updates: Partial<T>) => void] {
    const [state, setState] = usePersistedState<T>(key, initialValue, debounceMs);

    const updateState = (updates: Partial<T>) => {
        setState(prev => ({ ...prev, ...updates }));
    };

    return [state, updateState];
}

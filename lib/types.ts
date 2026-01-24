// Shared TypeScript type definitions for the AI Translator app

import { Chapter, DictionaryEntry } from "./db";

/**
 * Character extracted from glossary
 */
export interface GlossaryCharacter {
    id?: number;
    original: string;
    translated: string;
    type: 'name';
    gender?: 'male' | 'female' | 'unknown';
    role?: 'main' | 'support' | 'villain' | 'mob';
    description?: string;
    isExisting?: boolean;
    status?: 'save' | 'blacklist' | 'ignore'; // For review dialog
}

/**
 * Term extracted from glossary
 */
export interface GlossaryTerm {
    id?: number;
    original: string;
    translated: string;
    type: 'term' | 'phrase' | 'general';
    description?: string;
    isExisting?: boolean;
    status?: 'save' | 'blacklist' | 'ignore'; // For review dialog
}

/**
 * Result from AI glossary extraction
 */
export interface GlossaryResult {
    characters: GlossaryCharacter[];
    terms: GlossaryTerm[];
}

/**
 * Translation configuration
 */
export interface TranslationConfig {
    model: string;
    temperature?: number;
    maxTokens?: number;
    customPrompt?: string;
}

/**
 * Translation settings from database
 */
export interface TranslationSettings {
    apiKey: string;
    model: string;
    temperature?: number;
    customPrompt?: string;
}

/**
 * Batch translation options
 */
export interface BatchTranslateOptions {
    chapters: Chapter[];
    config: TranslationConfig;
    settings: TranslationSettings;
    onProgress?: (current: number, total: number, status: string) => void;
    onReviewNeeded?: (chars: GlossaryCharacter[], terms: GlossaryTerm[]) => void;
}

/**
 * Inspection issue found in chapter
 */
export interface InspectionIssue {
    type: 'bracket' | 'quote' | 'punctuation' | 'spacing' | 'untranslated' | 'pronoun' | 'grammar' | 'spelling' | 'other';
    severity: 'error' | 'warning' | 'info';
    message: string;
    original?: string;
    suggestion?: string;
    reason?: string;
    position?: number;
}

/**
 * Review data for glossary extraction
 */
export interface ReviewData {
    chars: GlossaryCharacter[];
    terms: GlossaryTerm[];
}

/**
 * Extended Chapter type with additional properties
 */
export interface ExtendedChapter extends Chapter {
    // Add any additional properties that aren't in the base Chapter type
}

/**
 * Log callback function type
 */
export type LogCallback = (message: string) => void;

/**
 * Error with message property
 */
export interface ErrorWithMessage {
    message: string;
}

/**
 * Type guard to check if error has message
 */
export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
    return (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as Record<string, unknown>).message === 'string'
    );
}

/**
 * Get error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
    if (isErrorWithMessage(error)) return error.message;
    return String(error);
}

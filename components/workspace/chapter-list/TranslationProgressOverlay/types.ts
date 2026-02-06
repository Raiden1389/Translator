/**
 * Type definitions for TranslationProgressOverlay
 */

export interface LogEntry {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
  order: number;
  tokens?: { input: number; output: number; total: number };
  chunks?: number;
}

export interface SystemNotification {
  id: string;
  message: string;
  type: 'init' | 'turbo' | 'success' | 'error';
  timestamp: number;
}

export interface ChapterStats {
  chapterId: number;
  order: number;
  title: string;
  termsUsed: number;
  charactersUsed: number;
}

export interface TranslationProgress {
  current: number;
  total: number;
  currentTitle: string;
  logs?: LogEntry[];
  totalTokens?: number;
  totalCost?: number;
  chunksProcessed?: number;
  startTime?: number;
  notifications?: SystemNotification[];
  totalTermsUsed?: number;
  totalCharactersUsed?: number;
  currentTermsUsed?: number;
  currentCharactersUsed?: number;
  currentChunk?: number;
  totalChunks?: number;
  chapterStats?: ChapterStats[];
}

export interface TranslationProgressOverlayProps {
  isTranslating: boolean;
  progress: TranslationProgress;
}

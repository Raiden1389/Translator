// COPIED from ChapterList.tsx - MAIN CONTENT AREA
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { ChapterCardGrid } from "../ChapterCardGrid";
import { ChapterTable } from "../ChapterTable";
import type { Chapter } from "@/lib/db";
import { useAiQueueStats } from "../../hooks/useAiQueueStatus";

type AiQueueStats = ReturnType<typeof useAiQueueStats>;

interface ChapterListContentProps {
  viewMode: "grid" | "table";
  currentChapters: Chapter[];
  selectedChapters: number[];
  queueState: AiQueueStats;
  setSelectedChapters: (ids: number[]) => void;
  filtered: Chapter[];
  sortOrder: "asc" | "desc";
  onToggleSortOrder: () => void;
  handleSelect: (id: number) => void;
  handleRead: (id: number) => void;
  handleInspect: (id: number) => void;
  handleRetranslate: (id: number) => void;
  handleClearTranslation: (id: number) => void;
  handleApplyCorrections: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function ChapterListContent({
  viewMode,
  currentChapters,
  selectedChapters,
  queueState,
  setSelectedChapters,
  filtered,
  sortOrder,
  onToggleSortOrder,
  handleSelect,
  handleRead,
  handleInspect,
  handleRetranslate,
  handleClearTranslation,
  handleApplyCorrections,
  fileInputRef
}: ChapterListContentProps) {
  return (
    <ErrorBoundary>
      {viewMode === "grid" ? (
        <ChapterCardGrid
          chapters={currentChapters}
          selectedChapters={selectedChapters}
          queueState={queueState}
          onSelect={handleSelect}
          onRead={handleRead}
          onInspect={handleInspect}
          onRetranslate={handleRetranslate}
          onClearTranslation={handleClearTranslation}
          onImport={() => fileInputRef.current?.click()}
        />
      ) : (
        <ChapterTable
          chapters={currentChapters}
          selectedChapters={selectedChapters}
          queueState={queueState}
          setSelectedChapters={setSelectedChapters}
          sortOrder={sortOrder}
          onToggleSortOrder={onToggleSortOrder}
          onSelect={handleSelect}
          onSelectPage={() => {
            const pageIds = currentChapters.map(c => c.id!);
            const newSet = new Set([...selectedChapters, ...pageIds]);
            setSelectedChapters(Array.from(newSet));
          }}
          onSelectGlobal={() => setSelectedChapters(filtered.map(c => c.id!))}
          onDeselectAll={() => setSelectedChapters([])}
          onRead={handleRead}
          onInspect={handleInspect}
          onRetranslate={handleRetranslate}
          onClearTranslation={handleClearTranslation}
          onApplyCorrections={handleApplyCorrections}
        />
      )}
    </ErrorBoundary>
  );
}

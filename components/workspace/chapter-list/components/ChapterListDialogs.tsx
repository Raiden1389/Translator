// COPIED from ChapterList.tsx - ALL DIALOGS
import { TranslateConfigDialog } from "../TranslateConfigDialog";
import { InspectionDialog } from "../InspectionDialog";
import { ReaderModal } from "../ReaderModal";
import { HistoryDialog } from "../../shared/HistoryDialog";
import { ScanConfigDialog } from "../../ScanConfigDialog";
import { ReviewDialog } from "../../shared/ReviewDialog";
import type { Chapter } from "@/lib/db";
import type { GlossaryCharacter, GlossaryTerm, TranslationSettings } from "@/lib/types";
import type { EntityType } from "../../ScanConfigDialog";
import type { InspectionIssue } from "@/lib/types";

interface TranslateConfig {
  customPrompt: string;
  autoExtract: boolean;
  maxConcurrency: number;
  fixPunctuation?: boolean;
  enableChunking: boolean;
  maxConcurrentChunks: number;
  chunkSize?: number;
}

interface ChapterListDialogsProps {
  // TranslateConfig
  translateDialogOpen: boolean;
  setTranslateDialogOpen: (open: boolean) => void;
  selectedChapters: number[];
  onTranslate: (params: {
    workspaceId: string;
    chapters: Chapter[];
    selectedChapters: number[];
    currentSettings: TranslationSettings;
    translateConfig: TranslateConfig;
    onReviewNeeded: (chars: GlossaryCharacter[], terms: GlossaryTerm[]) => void;
  }) => void;
  workspaceId: string;
  filtered: Chapter[];
  onShowScanResults: (data: { chars: GlossaryCharacter[]; terms: GlossaryTerm[] }) => void;

  // Inspection
  isInspectOpen: boolean;
  setIsInspectOpen: (open: boolean) => void;
  inspectingChapter: { id: number; title: string; inspectionResults?: InspectionIssue[] } | null;

  // Reader
  readingChapterId: number | null;
  handleReaderClose: () => void;
  handlePrev: () => void;
  handleNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;

  // History
  historyOpen: boolean;
  setHistoryOpen: (open: boolean) => void;

  // Scan Config
  scanConfigOpen: boolean;
  setScanConfigOpen: (open: boolean) => void;
  handleStartScan: (types: EntityType[]) => void;

  // Review
  isReviewOpen: boolean;
  setIsReviewOpen: (open: boolean) => void;
  pendingCharacters: GlossaryCharacter[];
  pendingTerms: GlossaryTerm[];
  handleConfirmSaveAI: (saveChars: GlossaryCharacter[], saveTerms: GlossaryTerm[], blacklistChars?: GlossaryCharacter[], blacklistTerms?: GlossaryTerm[]) => Promise<void>;
}

export function ChapterListDialogs({
  translateDialogOpen,
  setTranslateDialogOpen,
  selectedChapters,
  onTranslate,
  workspaceId,
  filtered,
  onShowScanResults,
  isInspectOpen,
  setIsInspectOpen,
  inspectingChapter,
  readingChapterId,
  handleReaderClose,
  handlePrev,
  handleNext,
  hasPrev,
  hasNext,
  historyOpen,
  setHistoryOpen,
  scanConfigOpen,
  setScanConfigOpen,
  handleStartScan,
  isReviewOpen,
  setIsReviewOpen,
  pendingCharacters,
  pendingTerms,
  handleConfirmSaveAI
}: ChapterListDialogsProps) {
  return (
    <>
      <TranslateConfigDialog
        open={translateDialogOpen}
        onOpenChange={setTranslateDialogOpen}
        selectedCount={selectedChapters.length}
        onStart={(config: {
          customPrompt: string;
          autoExtract: boolean;
          maxConcurrency: number;
          fixPunctuation?: boolean;
          enableChunking: boolean;
          maxConcurrentChunks: number;
          chunkSize?: number;
        }, settings: TranslationSettings) => {
          setTranslateDialogOpen(false);
          onTranslate({
            workspaceId,
            chapters: filtered,
            selectedChapters,
            currentSettings: settings,
            translateConfig: config,
            onReviewNeeded: (chars: GlossaryCharacter[], terms: GlossaryTerm[]) => onShowScanResults({ chars, terms })
          });
        }}
      />

      {isInspectOpen && inspectingChapter && (
        <InspectionDialog
          open={isInspectOpen}
          onOpenChange={setIsInspectOpen}
          chapterTitle={inspectingChapter.title}
          issues={inspectingChapter.inspectionResults || []}
          onNavigateToIssue={(original) => {
            console.log("Navigate to:", original);
          }}
        />
      )}

      {readingChapterId && (
        <ReaderModal
          chapterId={readingChapterId}
          isOpen={!!readingChapterId}
          onClose={handleReaderClose}
          hasPrev={hasPrev}
          hasNext={hasNext}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}

      <HistoryDialog
        workspaceId={workspaceId}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />

      <ScanConfigDialog
        open={scanConfigOpen}
        onOpenChange={setScanConfigOpen}
        onStart={handleStartScan}
      />

      <ReviewDialog
        open={isReviewOpen}
        onOpenChange={setIsReviewOpen}
        characters={pendingCharacters}
        terms={pendingTerms}
        onSave={handleConfirmSaveAI}
      />
    </>
  );
}

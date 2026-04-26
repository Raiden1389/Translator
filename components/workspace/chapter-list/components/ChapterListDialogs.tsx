import React from "react";
// COPIED from ChapterList.tsx - ALL DIALOGS
import { TranslateConfigDialog } from "../TranslateConfigDialog";
import { InspectionDialog } from "../InspectionDialog";
import { ReaderModal } from "../ReaderModal";
import { HistoryDialog } from "../../shared/HistoryDialog";
import { ScanConfigDialog } from "../../ScanConfigDialog";
import { ReviewDialog } from "../../shared/ReviewDialog";
import { AgBridgeDialog } from "../bridge/AgBridgeDialog";
import { featureFlags } from "@/lib/featureFlags";
import { useTranslation } from "../../hooks/TranslationProvider.v2";
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
  const { bridge } = useTranslation();

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

      {/* Antigravity Bridge Dialog */}
      {featureFlags.antigravityBridge && (
        <AgBridgeDialog
          open={bridge.dialogOpen}
          onOpenChange={bridge.closeDialog}
          exportedCount={bridge.exportedCount}
          jobId={bridge.lastJobId}
          exportPath={bridge.lastExportPath}
          isImporting={bridge.isImporting}
          onImport={() => bridge.importFromBridge(workspaceId)}
          phase={bridge.phase}
          progress={bridge.progress}
          missingInfo={bridge.missingInfo}
          importResult={bridge.importResult}
          onReExportMissing={(missingOrders) => bridge.reExportMissing(workspaceId, missingOrders)}
          workspaceId={workspaceId}
        />
      )}

      {/* Auto-import trigger: when poll detects completion, this effect fires the actual import */}
      <AutoImportTrigger
        phase={bridge.phase}
        workspaceId={workspaceId}
        triggerAutoImport={bridge.triggerAutoImport}
      />
    </>
  );
}

/** Invisible component that triggers auto-import when phase becomes "importing" */
function AutoImportTrigger({
  phase,
  workspaceId,
  triggerAutoImport,
}: {
  phase: string;
  workspaceId: string;
  triggerAutoImport: (wsId: string) => Promise<void>;
}) {
  const triggered = React.useRef(false);

  React.useEffect(() => {
    if (phase === "importing" && !triggered.current) {
      triggered.current = true;
      triggerAutoImport(workspaceId);
    }
    if (phase === "idle") {
      triggered.current = false;
    }
  }, [phase, workspaceId, triggerAutoImport]);

  return null;
}

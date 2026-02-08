"use client";

import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Swords } from "lucide-react";
import { db } from "@/lib/db";
import { toast } from "sonner";

import { usePromptState } from "./PromptLab/hooks/usePromptState";
import { usePromptActions } from "./PromptLab/hooks/usePromptActions";

import { PromptLabHeader } from "./PromptLab/components/PromptLabHeader";
import { TestSampleCard } from "./PromptLab/components/TestSampleCard";
import { GoalsCard } from "./PromptLab/components/GoalsCard";
import { PromptCard } from "./PromptLab/components/PromptCard";
import { WinnerCard } from "./PromptLab/components/WinnerCard";
import { SavePromptDialog } from "./PromptLab/components/SavePromptDialog";

const SAMPLE_TEXT = `许七安走在京城的街道上，周围是熙熙攘攘的人群。他必须要搞清楚，这个世界到底发生了什么。"天道崩塌，妖魔横行..." 脑海中回荡着这句话。作为一名穿越者，他本想安稳度日，但命运似乎并不打算放过他。前方的打更人衙门威严耸立，那是他唯一的去处。`;

export const PromptLab = ({ workspaceId }: { workspaceId: string }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFighting, setIsFighting] = useState(false);

  const state = usePromptState();
  const {
    testSample,
    setTestSample,
    promptGoals,
    setPromptGoals,
    promptA,
    setPromptA,
    promptB,
    setPromptB,
    resultA,
    setResultA,
    resultB,
    setResultB,
    scoreA,
    setScoreA,
    scoreB,
    setScoreB,
    winner,
    setWinner,
    reason,
    setReason,
    isSaveDialogOpen,
    setIsSaveDialogOpen,
    saveName,
    setSaveName,
    pendingSaveContent,
    setPendingSaveContent,
  } = state;

  const actions = usePromptActions({
    workspaceId,
    promptGoals,
    setPromptA,
    setPromptB,
    setPromptGoals,
    testSample,
    promptA,
    promptB,
    setResultA,
    setResultB,
    setScoreA,
    setScoreB,
    setWinner,
    setReason,
    saveName,
    pendingSaveContent,
    setIsSaveDialogOpen,
    setSaveName,
    setPendingSaveContent,
  });

  const firstChapter = useLiveQuery(
    () => db.chapters.where("workspaceId").equals(workspaceId).sortBy("order").then(c => c[0]),
    [workspaceId]
  );

  useEffect(() => {
    if (firstChapter?.content_original && !testSample) {
      setTestSample(firstChapter.content_original.substring(0, 800) + "...");
    } else if (!firstChapter && !testSample) {
      setTestSample(SAMPLE_TEXT);
    }
  }, [firstChapter, testSample]);

  const handleResetSample = () => {
    if (firstChapter?.content_original) {
      setTestSample(firstChapter.content_original.substring(0, 800) + "...");
      toast.success("Đã lấy nội dung gốc từ Chương 1!");
    } else {
      setTestSample(SAMPLE_TEXT);
      toast.info("Không tìm thấy chương nào, dùng văn bản mẫu.");
    }
  };

  const handleGeneratePrompts = async () => {
    setIsGenerating(true);
    await actions.handleGeneratePrompts();
    setIsGenerating(false);
  };

  const handleExtractSpirit = async () => {
    setIsGenerating(true);
    await actions.handleExtractSpirit();
    setIsGenerating(false);
  };

  const handleFight = async () => {
    setIsFighting(true);
    await actions.handleFight();
    setIsFighting(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PromptLabHeader isFighting={isFighting} onFight={handleFight} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TestSampleCard
          testSample={testSample}
          onTestSampleChange={setTestSample}
          onReset={handleResetSample}
        />

        <GoalsCard
          promptGoals={promptGoals}
          onPromptGoalsChange={setPromptGoals}
          isGenerating={isGenerating}
          onExtractSpirit={handleExtractSpirit}
          onGeneratePrompts={handleGeneratePrompts}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden lg:block">
          <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center shadow-2xl">
            <Swords className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        <PromptCard
          variant="A"
          prompt={promptA}
          onPromptChange={setPromptA}
          result={resultA}
          score={scoreA}
          isFighting={isFighting}
          onSave={() => actions.openSaveDialog("Prompt A - " + new Date().toLocaleTimeString('vi-VN'), promptA)}
        />

        <PromptCard
          variant="B"
          prompt={promptB}
          onPromptChange={setPromptB}
          result={resultB}
          score={scoreB}
          isFighting={isFighting}
          onSave={() => actions.openSaveDialog("Prompt B - " + new Date().toLocaleTimeString('vi-VN'), promptB)}
        />
      </div>

      {winner && <WinnerCard winner={winner} reason={reason} />}

      <SavePromptDialog
        open={isSaveDialogOpen}
        onOpenChange={setIsSaveDialogOpen}
        saveName={saveName}
        onSaveNameChange={setSaveName}
        onConfirm={actions.confirmSavePrompt}
      />
    </div>
  );
};

import { toast } from "sonner";
import { db } from "@/lib/db";
import { translateChapter, generatePromptVariants, evaluateTranslation, analyzeStyleDNA } from "@/lib/gemini";

interface UsePromptActionsProps {
  workspaceId: string;
  promptGoals: string;
  setPromptA: (value: string) => void;
  setPromptB: (value: string) => void;
  setPromptGoals: (value: string) => void;
  testSample: string;
  promptA: string;
  promptB: string;
  setResultA: (value: string) => void;
  setResultB: (value: string) => void;
  setScoreA: (value: number | null) => void;
  setScoreB: (value: number | null) => void;
  setWinner: (value: string | null) => void;
  setReason: (value: string) => void;
  saveName: string;
  pendingSaveContent: string;
  setIsSaveDialogOpen: (value: boolean) => void;
  setSaveName: (value: string) => void;
  setPendingSaveContent: (value: string) => void;
}

export function usePromptActions(props: UsePromptActionsProps) {
  const {
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
  } = props;

  const openSaveDialog = (defaultName: string, content: string) => {
    setSaveName(defaultName);
    setPendingSaveContent(content);
    setIsSaveDialogOpen(true);
  };

  const confirmSavePrompt = async () => {
    if (!saveName.trim()) {
      toast.error("Vui lòng nhập tên prompt!");
      return;
    }
    await db.prompts.add({
      title: saveName,
      content: pendingSaveContent,
      createdAt: new Date()
    });
    toast.success("Đã lưu prompt vào thư viện!");
    setIsSaveDialogOpen(false);
  };

  const handleGeneratePrompts = async () => {
    if (!promptGoals.trim()) {
      toast.error("Vui lòng nhập mục tiêu prompt!");
      return false;
    }
    toast.info("Đang suy nghĩ prompt...");
    try {
      const { promptA, promptB } = await generatePromptVariants(promptGoals);
      setPromptA(promptA);
      setPromptB(promptB);
      toast.success("Đã tạo xong 2 variants!");
      return true;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      toast.error("Lỗi: " + errorMessage);
      return false;
    }
  };

  const handleExtractSpirit = async () => {
    toast.info("Đang trích xuất linh hồn (Spirit Extraction)...");
    try {
      const chapters = await db.chapters.where("workspaceId").equals(workspaceId).sortBy("order");
      if (chapters.length === 0) {
        throw new Error("Không tìm thấy chương nào để phân tích!");
      }
      const samples = chapters.slice(0, 5).map(c => c.content_original);
      const dna = await analyzeStyleDNA(samples);
      const newGoals = `Phong cách: ${dna.tone}. Bối cảnh: ${dna.setting}. Xưng hô: ${dna.pronouns}. Mô tả: ${dna.description}`;
      setPromptGoals(newGoals);
      toast.success("Đã trích xuất DNA thành công!", {
        description: dna.tone + " - " + dna.setting
      });
      await handleGeneratePrompts();
      return true;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      toast.error("Lỗi: " + errorMessage);
      return false;
    }
  };

  const handleFight = async () => {
    if (!testSample.trim()) {
      toast.error("Vui lòng nhập văn bản mẫu!");
      return false;
    }

    setResultA("");
    setResultB("");
    setScoreA(null);
    setScoreB(null);
    setWinner(null);
    setReason("");

    try {
      toast.info("Đang bắt đầu so tài...");

      const runA = new Promise<string>((resolve, reject) => {
        translateChapter(workspaceId, testSample, () => { }, (res) => resolve(res.translatedText), promptA)
          .catch(reject);
      });

      const runB = new Promise<string>((resolve, reject) => {
        translateChapter(workspaceId, testSample, () => { }, (res) => resolve(res.translatedText), promptB)
          .catch(reject);
      });

      const [resA, resB] = await Promise.all([runA, runB]);
      setResultA(resA);
      setResultB(resB);

      toast.info("Trọng tài AI đang chấm điểm...");
      const evalResult = await evaluateTranslation(testSample, resA, resB);

      setScoreA(evalResult.scoreA);
      setScoreB(evalResult.scoreB);
      setWinner(evalResult.winner === "Draw" ? "Hòa" : (evalResult.winner === "A" ? "Prompt A" : "Prompt B"));
      setReason(evalResult.reason);

      return true;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      toast.error("Lỗi khi chạy Test: " + errorMessage);
      return false;
    }
  };

  return {
    openSaveDialog,
    confirmSavePrompt,
    handleGeneratePrompts,
    handleExtractSpirit,
    handleFight,
  };
}

import { useState } from "react";

export function usePromptState() {
  const [testSample, setTestSample] = useState("");
  const [promptGoals, setPromptGoals] = useState("Văn phong trôi chảy, tự nhiên. Giữ nguyên Hán Việt các từ tu tiên.");
  const [promptA, setPromptA] = useState("Mày là dịch giả chuyên nghiệp Trung - Việt. Dịch tự nhiên, giữ nguyên tên riêng.");
  const [promptB, setPromptB] = useState("Dịch văn phong kiếm hiệp, tiên hiệp cổ điển. Dùng nhiều từ Hán Việt sang trọng, trau chuốt.");

  const [resultA, setResultA] = useState("");
  const [resultB, setResultB] = useState("");
  const [scoreA, setScoreA] = useState<number | null>(null);
  const [scoreB, setScoreB] = useState<number | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [pendingSaveContent, setPendingSaveContent] = useState("");

  return {
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
  };
}

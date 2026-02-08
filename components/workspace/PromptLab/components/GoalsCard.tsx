import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Zap, Wand2, SparklesIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRaiden } from "@/components/theme/RaidenProvider";

interface GoalsCardProps {
  promptGoals: string;
  onPromptGoalsChange: (value: string) => void;
  isGenerating: boolean;
  onExtractSpirit: () => void;
  onGeneratePrompts: () => void;
}

export function GoalsCard({
  promptGoals,
  onPromptGoalsChange,
  isGenerating,
  onExtractSpirit,
  onGeneratePrompts
}: GoalsCardProps) {
  const { isRaidenMode } = useRaiden();

  return (
    <Card className={cn("border-border shadow-sm", isRaidenMode ? "bg-card border-transparent" : "bg-card")}>
      <CardHeader className={cn("pb-3 border-b border-l-4 border-l-primary", !isRaidenMode && "bg-muted/30")}>
        <CardTitle className="text-foreground text-sm font-bold flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          MỤC TIÊU CẦN ĐẠT
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <p className="text-[11px] text-muted-foreground italic">
          * Nhập phong cách bạn muốn (VD: Kiếm hiệp, Hiện đại...) AI sẽ tối ưu prompt.
        </p>
        <Textarea
          value={promptGoals}
          onChange={(e) => onPromptGoalsChange(e.target.value)}
          className="bg-slate-50/30 border-border text-foreground text-sm h-16 focus:bg-white transition-all resize-none font-sans"
          placeholder="Mô tả mục tiêu..."
        />
        <div className="flex gap-2">
          <Button
            disabled={isGenerating}
            onClick={onExtractSpirit}
            variant="outline"
            className="flex-1 bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 h-9 text-xs font-bold"
          >
            <Wand2 className={cn("w-3.5 h-3.5 mr-1.5", isGenerating && "animate-spin")} />
            Spirit DNA
          </Button>
          <Button
            disabled={isGenerating}
            onClick={onGeneratePrompts}
            className="flex-1 h-9 text-xs font-bold"
          >
            <SparklesIcon className={cn("w-3.5 h-3.5 mr-1.5", isGenerating && "animate-spin")} />
            Tạo Prompt
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

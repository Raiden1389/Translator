import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { cn } from "@/lib/utils";


interface PromptCardProps {
  variant: "A" | "B";
  prompt: string;
  onPromptChange: (value: string) => void;
  result: string;
  score: number | null;
  isFighting: boolean;
  onSave: () => void;
}

export function PromptCard({
  variant,
  prompt,
  onPromptChange,
  result,
  score,
  isFighting,
  onSave
}: PromptCardProps) {
  const isVariantA = variant === "A";
  const label = isVariantA ? "PROMPT A (Base)" : "PROMPT B (Variant)";
  const resultLabel = isVariantA ? "KẾT QUẢ DỊCH A" : "KẾT QUẢ DỊCH B";

  return (
    <Card className="shadow-sm overflow-hidden group border bg-card border-border">
      <div className={cn(
        "absolute top-0 w-1 h-full",
        isVariantA ? "left-0 bg-accent" : "right-0 bg-primary"
      )} />
      <CardHeader className={cn(
        "pb-2 border-b",
        isVariantA
          ? "border-accent/20 bg-accent/10"
          : "border-primary/20 bg-primary/5"
      )}>
        <CardTitle className={cn(
          "text-sm font-black flex items-center justify-between uppercase",
          isVariantA ? "text-accent" : "text-primary"
        )}>
          {label}
          {score && (
            <span className={cn(
              "text-2xl font-black italic",
              isVariantA ? "text-accent/50" : "text-primary/50"
            )}>
              {score}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <Textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          className="bg-muted/30 border-border text-foreground font-mono text-[13px] h-32 tracking-tight leading-normal focus:bg-background transition-all"
        />
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
            {resultLabel}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
            className={cn(
              "h-6 text-[10px] rounded-lg px-3 border",
              isVariantA
                ? "bg-accent/10 hover:bg-accent/20 text-accent border-accent/20"
                : "bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
            )}
          >
            <Save className="w-2.5 h-2.5 mr-1" /> Lưu Prompt
          </Button>
        </div>
        <div className="min-h-[220px] p-4 rounded-xl bg-muted/20 border border-border/50 text-foreground text-sm italic leading-relaxed shadow-xs">
          {result || (isFighting ? "Đang dịch..." : "Chưa có dữ liệu.")}
        </div>
      </CardContent>
    </Card>
  );
}

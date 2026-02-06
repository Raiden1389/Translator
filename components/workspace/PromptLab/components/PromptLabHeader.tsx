import React from "react";
import { Button } from "@/components/ui/button";
import { Swords, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromptLabHeaderProps {
  isFighting: boolean;
  onFight: () => void;
}

export function PromptLabHeader({ isFighting, onFight }: PromptLabHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
          <Swords className="w-6 h-6 text-primary" />
          Prompt Lab
        </h2>
        <p className="text-muted-foreground text-sm">Thử nghiệm và tối ưu hóa câu lệnh dịch (A/B Testing)</p>
      </div>
      <Button
        onClick={onFight}
        disabled={isFighting}
        className="bg-primary hover:bg-primary/90 text-white font-black px-10 py-7 rounded-2xl shadow-xl shadow-primary/20 gap-3 group overflow-hidden relative active:scale-95 transition-all"
      >
        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        <RefreshCw className={cn("w-5 h-5", isFighting && "animate-spin")} />
        {isFighting ? "ĐANG CHIẾN ĐẤU..." : "START A/B TEST"}
      </Button>
    </div>
  );
}

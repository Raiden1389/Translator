import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";


interface WinnerCardProps {
  winner: string;
  reason: string;
}

export function WinnerCard({ winner, reason }: WinnerCardProps) {
  return (
    <div className="animate-in zoom-in-95 duration-500">
      <Card className="shadow-lg relative overflow-hidden border bg-card border-primary/20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 p-2 bg-primary text-white font-black text-[10px] rounded-b-xl shadow-lg uppercase tracking-widest">
          WINNER
        </div>
        <CardContent className="pt-8 pb-6 flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0 shadow-inner">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-black text-foreground">{winner}</h3>
            <p className="text-muted-foreground text-sm">{reason}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

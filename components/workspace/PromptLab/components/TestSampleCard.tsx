import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRaiden } from "@/components/theme/RaidenProvider";

interface TestSampleCardProps {
  testSample: string;
  onTestSampleChange: (value: string) => void;
  onReset: () => void;
}

export function TestSampleCard({ testSample, onTestSampleChange, onReset }: TestSampleCardProps) {
  const { isRaidenMode } = useRaiden();

  return (
    <Card className={cn("border-border shadow-sm", isRaidenMode ? "bg-card border-transparent" : "bg-card")}>
      <CardHeader className={cn("pb-3 border-b border-l-4 border-l-indigo-500", !isRaidenMode && "bg-muted/30")}>
        <CardTitle className="text-foreground text-sm font-bold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            VĂN BẢN MẪU (TEST SAMPLE)
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="text-[10px] bg-white border-slate-200 text-slate-600 hover:text-primary h-6 px-2"
          >
            <RefreshCw className="w-2.5 h-2.5 mr-1" />
            Reset
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <Textarea
          value={testSample}
          onChange={(e) => onTestSampleChange(e.target.value)}
          className="bg-slate-50/30 border-border text-foreground text-sm h-36 focus:bg-white transition-all resize-none font-sans"
          placeholder="Nhập đoạn văn bản muốn test dịch..."
        />
      </CardContent>
    </Card>
  );
}

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, RefreshCw } from "lucide-react";


interface TestSampleCardProps {
  testSample: string;
  onTestSampleChange: (value: string) => void;
  onReset: () => void;
}

export function TestSampleCard({ testSample, onTestSampleChange, onReset }: TestSampleCardProps) {
  return (
    <Card className="border-border shadow-sm bg-card">
      <CardHeader className="pb-3 border-b border-l-4 border-l-accent bg-muted/30">
        <CardTitle className="text-foreground text-sm font-bold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent" />
            VĂN BẢN MẪU (TEST SAMPLE)
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="text-[10px] bg-card border-border text-muted-foreground hover:text-primary h-6 px-2"
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
          className="bg-muted border-border text-foreground text-sm h-36 focus:bg-background transition-all resize-none font-sans"
          placeholder="Nhập đoạn văn bản muốn test dịch..."
        />
      </CardContent>
    </Card>
  );
}

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AuditResult } from '@/lib/gemini/translation/audit';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

interface AuditResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: AuditResult[];
  chapterNames: string[];
}

export function AuditResultDialog({
  open,
  onOpenChange,
  results,
  chapterNames,
}: AuditResultDialogProps) {
  const overallStatus = results.every(r => r.status === 'PASS')
    ? 'PASS'
    : results.some(r => r.status === 'FAIL')
      ? 'FAIL'
      : 'WARNING';

  const StatusIcon = {
    PASS: CheckCircle2,
    WARNING: AlertTriangle,
    FAIL: AlertCircle,
  }[overallStatus];

  const statusColor = {
    PASS: 'text-emerald-500',
    WARNING: 'text-amber-500',
    FAIL: 'text-rose-500',
  }[overallStatus];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${statusColor}`} />
            Translation Quality Audit
          </DialogTitle>
          <DialogDescription>
            Audited {results.length} chapter{results.length > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {results.map((result, idx) => (
            <div
              key={idx}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{chapterNames[idx]}</h3>
                <Badge
                  variant={
                    result.status === 'PASS'
                      ? 'default'
                      : result.status === 'WARNING'
                        ? 'secondary'
                        : 'destructive'
                  }
                >
                  {result.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <div className="text-muted-foreground">POV Drop Blocks</div>
                  <div className="font-mono">{result.povDropCount}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">Repeated Names</div>
                  <div className="font-mono">{result.repeatNameParagraphs}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">&quot;Mình&quot; Count</div>
                  <div className="font-mono">{result.selfCount}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">No-Subject Ratio</div>
                  <div className="font-mono">{result.noSubjectRatio}%</div>
                </div>
              </div>

              {result.warnings.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-amber-600 dark:text-amber-500">
                    Warnings:
                  </div>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    {result.warnings.map((warning, wIdx) => (
                      <li key={wIdx} className="flex items-start gap-2">
                        <span className="text-amber-500">•</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

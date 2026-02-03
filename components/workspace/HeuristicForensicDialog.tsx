/**
 * Heuristic Forensic Dialog
 * Displays forensic analysis with tab-based layout and export functionality
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Microscope, User, Sword, MapPin, Info, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'sonner';
import type { ForensicReport, TypeForensicReport } from '@/lib/gemini/heuristic/forensic-analyzer';

interface HeuristicForensicDialogProps {
    forensicReport: ForensicReport | null;
}

export function HeuristicForensicDialog({ forensicReport }: HeuristicForensicDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('character');

    const handleExport = async (typeReport: TypeForensicReport) => {
        try {
            const filename = `heuristic-debug-${typeReport.type}.json`;

            const exportData = {
                type: typeReport.type,
                summary: {
                    totalDetected: typeReport.totalDetected,
                    totalApproved: typeReport.totalApproved,
                    totalDropped: typeReport.totalDropped,
                    dropRate: typeReport.dropRate
                },
                dropReasons: typeReport.topReasons.map(r => ({
                    reason: r.reason,
                    count: r.count,
                    percentage: r.percentage,
                    examples: r.examples,
                    suggestedFix: r.suggestedFix
                }))
            };

            // Write to Desktop using Tauri BaseDirectory
            const { BaseDirectory } = await import('@tauri-apps/plugin-fs');
            await writeTextFile(filename, JSON.stringify(exportData, null, 2), {
                baseDir: BaseDirectory.Desktop
            });

            toast.success(`Exported to Desktop`, {
                description: `${filename} • Ready for /analyze-heuristic`
            });
        } catch (err) {
            toast.error('Export failed', { description: String(err) });
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'character': return <User className="h-4 w-4" />;
            case 'skill': return <Sword className="h-4 w-4" />;
            case 'location': return <MapPin className="h-4 w-4" />;
            default: return <Info className="h-4 w-4" />;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100 shadow-sm"
                        >
                            <Microscope className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Phân tích Forensic</p>
                </TooltipContent>
            </Tooltip>
            <DialogContent className="sm:max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Microscope className="h-5 w-5 text-purple-500" />
                        Forensic Analyzer - Phân tích lỗi Heuristic
                    </DialogTitle>
                </DialogHeader>
                {forensicReport && (
                    <>
                        {/* Summary */}
                        <div className="grid grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 shrink-0">
                            <div className="text-center">
                                <div className="text-2xl font-black text-slate-700">{forensicReport.summary.totalScanned}</div>
                                <div className="text-xs text-slate-500 font-bold uppercase">Tổng quét</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-black text-emerald-600">{forensicReport.summary.totalApproved}</div>
                                <div className="text-xs text-slate-500 font-bold uppercase">Đã duyệt</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-black text-red-600">{forensicReport.summary.totalDropped}</div>
                                <div className="text-xs text-slate-500 font-bold uppercase">Bị loại</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-black text-orange-600">{forensicReport.summary.overallDropRate.toFixed(1)}%</div>
                                <div className="text-xs text-slate-500 font-bold uppercase">Tỷ lệ drop</div>
                            </div>
                        </div>

                        {/* Tabs by Type */}
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                            <TabsList className="grid w-full grid-cols-4 shrink-0">
                                {forensicReport.byType.filter(t => t.totalDetected > 0).map((typeReport) => (
                                    <TabsTrigger key={typeReport.type} value={typeReport.type} className="flex items-center gap-2">
                                        {getTypeIcon(typeReport.type)}
                                        <span className="capitalize">{typeReport.type}</span>
                                        <span className="text-xs text-slate-500">({typeReport.totalDropped})</span>
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {forensicReport.byType.filter(t => t.totalDetected > 0).map((typeReport) => (
                                <TabsContent key={typeReport.type} value={typeReport.type} className="flex-1 overflow-auto mt-4">
                                    <TypeReportView typeReport={typeReport} onExport={() => handleExport(typeReport)} />
                                </TabsContent>
                            ))}
                        </Tabs>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

// Type Report View Component
function TypeReportView({ typeReport, onExport }: { typeReport: TypeForensicReport; onExport: () => void }) {
    const [expandedReasons, setExpandedReasons] = useState<Set<number>>(new Set());

    const toggleReason = (index: number) => {
        setExpandedReasons(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    return (
        <div className="space-y-4">
            {/* Type Summary */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-4">
                    <div>
                        <span className="text-sm text-slate-500">Detected:</span>
                        <span className="ml-2 font-bold text-slate-700">{typeReport.totalDetected}</span>
                    </div>
                    <div>
                        <span className="text-sm text-slate-500">Approved:</span>
                        <span className="ml-2 font-bold text-emerald-600">{typeReport.totalApproved}</span>
                    </div>
                    <div>
                        <span className="text-sm text-slate-500">Dropped:</span>
                        <span className="ml-2 font-bold text-red-600">{typeReport.totalDropped}</span>
                    </div>
                    <div>
                        <span className="text-sm text-slate-500">Drop Rate:</span>
                        <span className="ml-2 font-bold text-orange-600">{typeReport.dropRate.toFixed(1)}%</span>
                    </div>
                </div>
                <Button onClick={onExport} size="sm" variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export JSON
                </Button>
            </div>

            {/* Drop Reasons */}
            {typeReport.topReasons.length === 0 ? (
                <div className="text-center text-slate-400 italic py-8">Không có lỗi nào! 🎉</div>
            ) : (
                <div className="space-y-2">
                    {typeReport.topReasons.map((reason, idx) => (
                        <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden">
                            {/* Reason Header */}
                            <button
                                onClick={() => toggleReason(idx)}
                                className="w-full bg-white hover:bg-slate-50 px-4 py-3 flex items-center justify-between transition-colors"
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    {expandedReasons.has(idx) ?
                                        <ChevronUp className="h-4 w-4 text-slate-600 shrink-0" /> :
                                        <ChevronDown className="h-4 w-4 text-slate-600 shrink-0" />
                                    }
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-slate-800 text-sm">{reason.reason}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            {reason.count} lần ({reason.percentage.toFixed(1)}%) • {reason.examples.length} examples
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs text-indigo-600 font-medium bg-indigo-50 px-3 py-1 rounded-full">
                                    💡 {reason.suggestedFix}
                                </div>
                            </button>

                            {/* Examples - Expandable */}
                            {expandedReasons.has(idx) && (
                                <div className="bg-slate-50 p-4 border-t border-slate-200">
                                    <div className="flex flex-wrap gap-2 max-h-64 overflow-auto">
                                        {reason.examples.map((ex, i) => {
                                            const showPhonetic = ex.translated && ex.translated !== ex.original;
                                            return (
                                                <div key={i} className="px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs rounded-lg flex flex-col gap-1 shadow-sm">
                                                    <span className="font-bold font-mono text-slate-900">{ex.original}</span>
                                                    {showPhonetic && (
                                                        <span className="text-xs text-purple-700 font-semibold">({ex.translated})</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

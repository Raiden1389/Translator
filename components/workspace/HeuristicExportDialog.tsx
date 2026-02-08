/**
 * Heuristic Export Dialog
 * Allows user to export heuristic data in 3 formats: RAW, FORENSIC, SUMMARY
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DownloadCloud, User, Sword, MapPin, Activity, Info, Ghost } from 'lucide-react';
import { toast } from 'sonner';
import { writeTextFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { generateRawDropJSON, generateForensicJSON, generateSummaryJSON, type ExportFormat } from '@/lib/gemini/heuristic/forensic-export';
import type { HeuristicTerm } from '@/lib/db';

interface HeuristicExportDialogProps {
    rawTerms: HeuristicTerm[];
}

export function HeuristicExportDialog({ rawTerms }: HeuristicExportDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [exportType, setExportType] = useState<'character' | 'skill' | 'location' | 'title' | 'unknown'>('character');
    const [exportFormat, setExportFormat] = useState<ExportFormat>('forensic');

    const handleExport = async (action: 'download' | 'copy') => {
        if (rawTerms.length === 0) {
            toast.error("Không có dữ liệu để xuất!");
            return;
        }

        // Filter by type
        const filteredByType = rawTerms.filter(t => t.type === exportType);

        if (filteredByType.length === 0) {
            toast.error(`Không có dữ liệu ${exportType} để xuất!`);
            return;
        }

        try {
            // Generate JSON based on format
            let jsonData: unknown;
            if (exportFormat === 'raw') {
                jsonData = generateRawDropJSON(filteredByType, exportType);
            } else if (exportFormat === 'forensic') {
                jsonData = generateForensicJSON(filteredByType, exportType);
            } else {
                jsonData = generateSummaryJSON(filteredByType, exportType);
            }

            const content = JSON.stringify(jsonData, null, 2);

            if (action === 'copy') {
                // Copy to clipboard
                await navigator.clipboard.writeText(content);
                toast.success(`✅ Đã copy ${exportFormat.toUpperCase()} JSON vào clipboard!`);
            } else {
                // Download file
                const filename = `heuristic-${exportFormat}-${exportType}.json`;
                await writeTextFile(filename, content, { baseDir: BaseDirectory.Desktop });
                toast.success(`✅ Đã xuất ${filteredByType.length} ${exportType} terms ra Desktop/${filename}`);
            }

            setIsOpen(false);
        } catch (err) {
            console.error('Export error:', err);
            toast.error("❌ Lỗi xuất file: " + String(err));
        }
    };

    const typeOptions = [
        { value: 'character' as const, icon: User, label: 'Character', color: 'blue' },
        { value: 'skill' as const, icon: Sword, label: 'Skill', color: 'purple' },
        { value: 'location' as const, icon: MapPin, label: 'Location', color: 'green' },
        { value: 'title' as const, icon: Activity, label: 'Title', color: 'amber' },
        { value: 'unknown' as const, icon: Info, label: 'Unknown', color: 'slate' },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100 shadow-sm"
                        >
                            <DownloadCloud className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Xuất Debug JSON</p>
                </TooltipContent>
            </Tooltip>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Xuất Debug JSON</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    {/* Type Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700">📂 Chọn loại entity:</label>
                        <div className="grid grid-cols-2 gap-2">
                            {typeOptions.map(({ value, icon: Icon, label }) => (
                                <Button
                                    key={value}
                                    variant={exportType === value ? 'default' : 'outline'}
                                    className="justify-start gap-2"
                                    onClick={() => setExportType(value)}
                                >
                                    <Icon className="h-4 w-4" />
                                    {label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Format Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700">📋 Chọn format:</label>
                        <div className="space-y-2">
                            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                                <input
                                    type="radio"
                                    name="format"
                                    value="raw"
                                    checked={exportFormat === 'raw'}
                                    onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <div className="font-bold text-slate-800">RAW DROP</div>
                                    <div className="text-xs text-slate-500">Dev hardcore - Drop reasons + examples</div>
                                </div>
                            </label>
                            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 border-indigo-300 bg-indigo-50/50">
                                <input
                                    type="radio"
                                    name="format"
                                    value="forensic"
                                    checked={exportFormat === 'forensic'}
                                    onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <div className="font-bold text-slate-800 flex items-center gap-2">
                                        FORENSIC ANALYSIS
                                        <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded">⭐ Recommended</span>
                                    </div>
                                    <div className="text-xs text-slate-500">AI Review - Classification + Impact + Fix</div>
                                </div>
                            </label>
                            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                                <input
                                    type="radio"
                                    name="format"
                                    value="summary"
                                    checked={exportFormat === 'summary'}
                                    onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <div className="font-bold text-slate-800">SUMMARY</div>
                                    <div className="text-xs text-slate-500">Dashboard - Top problem + Risk level</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Button
                            onClick={() => handleExport('download')}
                            className="flex-1 gap-2"
                        >
                            <DownloadCloud className="h-4 w-4" />
                            Download .json
                        </Button>
                        <Button
                            onClick={() => handleExport('copy')}
                            variant="outline"
                            className="flex-1 gap-2"
                        >
                            <Ghost className="h-4 w-4" />
                            Copy JSON
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

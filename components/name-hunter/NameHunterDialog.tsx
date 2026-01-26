"use client";

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useNameHunter } from "@/lib/hooks/useNameHunter"
import { CandidateTable } from "./CandidateTable"
import { Loader2 } from "lucide-react"
import { TermCandidate, TermType } from "@/lib/services/name-hunter/types"

export interface ScanConfig {
    scope: 'manual' | 'all_chapters' | 'selected_chapters' | 'range';
    range?: string; // "1-10"
    filters: {
        names: boolean;
        terms: boolean;
        locations: boolean;
        orgs: boolean;
        skills: boolean;
        others: boolean;
        ignoreKnown: boolean;
    };
    manualText?: string;
}

interface NameHunterDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    textToScan?: string;
    workspaceId?: string;
    onScanRequest?: (config: ScanConfig) => Promise<string[]>;
    onAddTerm?: (candidate: TermCandidate) => void;
    totalChapters?: number;
    selectedCount?: number;
}

export function NameHunterDialog({
    isOpen,
    onOpenChange,
    textToScan,
    workspaceId,
    onScanRequest,
    onAddTerm,
    totalChapters = 0,
    selectedCount = 0,
}: NameHunterDialogProps) {
    const {
        scan,
        isScanning,
        candidates,
        setCandidates
    } = useNameHunter();

    // UI States
    const [step, setStep] = useState<'config' | 'results'>('config');
    const [resultsTab, setResultsTab] = useState<'active' | 'trash'>('active');
    const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto');
    const [manualText, setManualText] = useState("");
    const [lastScannedText, setLastScannedText] = useState("");
    const [junkCandidates, setJunkCandidates] = useState<TermCandidate[]>([]);
    const [isRefining, setIsRefining] = useState(false);

    // Config States
    const [rangeInput, setRangeInput] = useState("");
    const [minFrequency, setMinFrequency] = useState(2);
    const [minLength, setMinLength] = useState(2);
    const [maxLength, setMaxLength] = useState(4);
    const [filters, setFilters] = useState({
        names: true,
        terms: true,
        locations: true,
        orgs: true,
        skills: true,
        others: false,
        ignoreKnown: true, // Default to true as requested
    });

    // Loading State
    const [isReady, setIsReady] = useState(false);

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            if (textToScan) {
                setManualText(textToScan);
                setActiveTab('manual');
                setStep('config');
            }
        }
    }, [isOpen, textToScan]);

    // Load Dictionaries (Effect)
    useEffect(() => {
        let mounted = true;
        const loadResources = async () => {
            try {
                const { VietPhraseRepository } = await import("@/lib/repositories/viet-phrase-repo");
                const { SyllableRepository } = await import("@/lib/repositories/syllable-repo");

                await Promise.all([
                    VietPhraseRepository.getInstance().load("/dicts/VietPhrase.txt"),
                    SyllableRepository.getInstance().load("/dicts/ChinesePhienAmWords.txt")
                ]);

                if (mounted) setIsReady(true);
            } catch (error: unknown) {
                console.error("Failed to load dictionaries", error);
                if (mounted) setIsReady(true);
            }
        };

        if (isOpen) {
            loadResources();
        }
        return () => { mounted = false; };
    }, [isOpen]);

    const handleStartScan = async () => {
        if (!isReady) return;
        setStep('results');
        setCandidates([]);
        setJunkCandidates([]);

        let textsToProcess: string[] = [];

        if (activeTab === 'manual') {
            textsToProcess = [manualText];
        } else if (onScanRequest) {
            const isSelectedScope = rangeInput === 'selected';
            const config: ScanConfig = {
                scope: isSelectedScope ? 'selected_chapters' : (rangeInput ? 'range' : 'all_chapters'),
                range: isSelectedScope ? undefined : rangeInput,
                filters: filters,
            };
            textsToProcess = await onScanRequest(config);
        }

        const fullText = textsToProcess.join("\n\n");
        setLastScannedText(fullText);
        const rawResults = await scan(fullText);

        // Prepare User Dictionary for Filtering
        const knownSet = new Set<string>();
        if (filters.ignoreKnown) {
            try {
                const { dictionaryRepo } = await import("@/lib/repositories/dictionary");
                const entries = await dictionaryRepo.getByWorkspace(workspaceId);
                entries.forEach(e => {
                    if (e.original) knownSet.add(e.original.toLowerCase().trim());
                    if (e.translated) knownSet.add(e.translated.toLowerCase().trim());
                });
            } catch (e: unknown) { // Changed 'e' to 'e: unknown'
                console.error("Failed to load user dictionary", e);
            }
        }

        // Apply UI Filters
        const finalResults = rawResults.filter((c: TermCandidate) => {
            if (c.count < minFrequency) return false;
            const wordCount = c.original.trim().split(/\s+/).length;
            if (wordCount < minLength || wordCount > maxLength) return false;

            if (filters.ignoreKnown) {
                const normOriginal = c.original.toLowerCase().trim();
                const normChinese = c.chinese ? c.chinese.toLowerCase().trim() : null;
                if (knownSet.has(normOriginal) || (normChinese && knownSet.has(normChinese))) {
                    return false;
                }
            }
            return true;
        });

        console.log(`[NameHunter] Final Results: ${finalResults.length} (from ${rawResults.length})`);
        setCandidates(finalResults);
    };

    const handleRemove = (original: string) => {
        setCandidates(prev => prev.filter(c => c.original !== original));
        setJunkCandidates(prev => prev.filter(c => c.original !== original));

        import("@/lib/repositories/blacklist-repo").then(({ blacklistRepo, BlacklistLevel }) => {
            blacklistRepo.addToBlacklist(original, BlacklistLevel.PHRASE);
        });
    };

    const handleAdd = (candidate: TermCandidate, targetType: 'character' | 'term') => {
        if (onAddTerm) {
            onAddTerm({ ...candidate, type: targetType === 'character' ? TermType.Person : TermType.Unknown });
        }
        setCandidates(prev => prev.filter(c => c.original !== candidate.original));
        setJunkCandidates(prev => prev.filter(c => c.original !== candidate.original));
    };

    const handleRefine = async () => {
        if (isRefining) return;
        setIsRefining(true);
        const contextText = lastScannedText || manualText || "";

        try {
            const { toast } = await import("sonner");
            const { AIRefiner } = await import("@/lib/services/name-hunter/ai-refiner");

            toast.loading('AI đang tinh lọc kết quả...', { id: 'ai-refine' });

            const refined = await AIRefiner.refine(candidates, contextText, (msg) => {
                toast.loading(msg, { id: 'ai-refine' });
            });

            const valid = refined.filter(c => c.type !== TermType.Junk);
            const junk = refined.filter(c => c.type === TermType.Junk);

            setCandidates(valid);
            setJunkCandidates(prev => [...prev, ...junk]);

            toast.success(`Đã tinh lọc! Giữ lại ${valid.length} thực thể, loại ${junk.length} rác.`, { id: 'ai-refine' });
        } catch (err) {
            console.error("AI Refine error:", err);
            const { toast } = await import("sonner");
            toast.error("Không thể tinh lọc bằng AI.", { id: 'ai-refine' });
        } finally {
            setIsRefining(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <span className="text-xl">🕵️ Name Hunter</span>
                        <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full border">
                            {step === 'config' ? 'Cấu hình quét' : 'Kết quả'}
                        </span>
                    </DialogTitle>
                    <DialogDescription>
                        Công cụ trích xuất thực thể (Tên riêng, địa danh, công pháp) tự động.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto bg-muted/10 p-6">
                    {step === 'config' ? (
                        <div className="space-y-8 max-w-2xl mx-auto">
                            <div className="space-y-4 bg-card p-6 rounded-xl border">
                                <div className="grid grid-cols-[100px_1fr] gap-4">
                                    <label className="text-sm font-medium pt-2">Phạm vi:</label>
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                variant={(!rangeInput && activeTab !== 'manual') ? "secondary" : "outline"}
                                                size="sm"
                                                onClick={() => {
                                                    setRangeInput("");
                                                    setActiveTab('auto');
                                                }}
                                                className="h-8"
                                            >
                                                Tất cả ({totalChapters})
                                            </Button>
                                            {selectedCount > 0 && (
                                                <Button
                                                    variant={rangeInput === 'selected' ? "secondary" : "outline"}
                                                    size="sm"
                                                    onClick={() => {
                                                        setRangeInput("selected");
                                                        setActiveTab('auto');
                                                    }}
                                                    className="h-8"
                                                >
                                                    Đang chọn ({selectedCount})
                                                </Button>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                placeholder="Hoặc nhập range: 1-10, 15"
                                                className="flex-1 h-9 px-3 rounded-md border bg-background text-sm"
                                                value={rangeInput === 'selected' ? '' : rangeInput}
                                                onChange={(e) => {
                                                    setRangeInput(e.target.value);
                                                    setActiveTab('auto');
                                                }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">
                                            {rangeInput === 'selected'
                                                ? "Quét các chương đã chọn trong danh sách."
                                                : rangeInput
                                                    ? "Quét theo dải chương chỉ định."
                                                    : "Quét toàn bộ workspace (Tốn thời gian)."}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                    <label className="text-sm font-medium">Tần suất:</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            className="flex-1 accent-primary"
                                            value={minFrequency}
                                            onChange={(e) => setMinFrequency(parseInt(e.target.value))}
                                        />
                                        <span className="text-sm font-mono w-4">{minFrequency}+</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                    <label className="text-sm font-medium">Độ dài:</label>
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-1 items-center gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-16 h-8 px-2 rounded border bg-background text-sm"
                                                value={minLength}
                                                onChange={(e) => setMinLength(parseInt(e.target.value))}
                                            />
                                            <span className="text-muted-foreground">-</span>
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-16 h-8 px-2 rounded border bg-background text-sm"
                                                value={maxLength}
                                                onChange={(e) => setMaxLength(parseInt(e.target.value))}
                                            />
                                            <span className="text-xs text-muted-foreground ml-2">Từ</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-border my-2" />

                                <div className="grid grid-cols-[100px_1fr] items-center gap-4 pt-2">
                                    <label className="text-sm font-medium">Tùy chọn:</label>
                                    <label className="flex items-center gap-2 cursor-pointer select-none text-sm p-2 hover:bg-accent rounded-md transition-colors w-fit border border-transparent hover:border-border">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-primary text-primary focus:ring-primary"
                                            checked={filters.ignoreKnown}
                                            onChange={(e) => setFilters(prev => ({ ...prev, ignoreKnown: e.target.checked }))}
                                        />
                                        <span>Ẩn tên đã có trong Từ Điển</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    🎯 Đối tượng quét (NER Filters)
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {[
                                        { key: 'names', label: 'Tên nhân vật (Names)' },
                                        { key: 'locations', label: 'Địa danh (Locations)' },
                                        { key: 'skills', label: 'Công pháp (Skills)' },
                                        { key: 'orgs', label: 'Tổ chức (Orgs)' },
                                        { key: 'terms', label: 'Thuật ngữ (Terms)' },
                                        { key: 'others', label: 'Khác (Others)' },
                                    ].map((item) => (
                                        <label key={item.key} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors user-select-none">
                                            <input
                                                type="checkbox"
                                                checked={filters[item.key as keyof typeof filters]}
                                                onChange={(e) => setFilters(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                                className="w-4 h-4 rounded border-primary text-primary focus:ring-primary"
                                            />
                                            <span className="text-sm">{item.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col">
                            {isScanning ? (
                                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                                    <div className="relative">
                                        <div className="w-16 h-16 border-4 border-muted rounded-full"></div>
                                        <div className="absolute inset-0 w-16 h-16 border-4 border-t-primary border-r-primary border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                                    </div>
                                    <p className="text-muted-foreground animate-pulse font-medium">Đang truy lùng thực thể...</p>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col pt-2">
                                    <div className="flex items-center justify-between mb-4 bg-muted/30 p-1 rounded-lg border">
                                        <div className="flex gap-1">
                                            <Button
                                                variant={resultsTab === 'active' ? 'secondary' : 'ghost'}
                                                size="sm"
                                                onClick={() => setResultsTab('active')}
                                                className="px-4"
                                            >
                                                Tiềm năng ({candidates.length})
                                            </Button>
                                            <Button
                                                variant={resultsTab === 'trash' ? 'secondary' : 'ghost'}
                                                size="sm"
                                                onClick={() => setResultsTab('trash')}
                                                className="px-4"
                                            >
                                                Thùng rác ({junkCandidates.length})
                                            </Button>
                                        </div>

                                        {resultsTab === 'trash' && junkCandidates.length > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-600 gap-2"
                                                onClick={() => {
                                                    const originals = junkCandidates.map(c => c.original);
                                                    setJunkCandidates([]);
                                                    import("@/lib/repositories/blacklist-repo").then(({ blacklistRepo, BlacklistLevel }) => {
                                                        originals.forEach(item => blacklistRepo.addToBlacklist(item, BlacklistLevel.PHRASE));
                                                    });
                                                }}
                                            >
                                                Dọn sạch thùng rác 🧹
                                            </Button>
                                        )}

                                        <Button
                                            onClick={handleRefine}
                                            disabled={isScanning || isRefining || candidates.length === 0}
                                            className="bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md transition-all active:scale-95 ml-auto"
                                        >
                                            {isRefining ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <SparklesIcon className="mr-2 h-4 w-4" />
                                            )}
                                            {isRefining ? 'Đang tinh lọc...' : 'Tinh lọc bằng AI ✨'}
                                        </Button>
                                    </div>

                                    <CandidateTable
                                        candidates={resultsTab === 'active' ? candidates : junkCandidates}
                                        onRemove={handleRemove}
                                        onAdd={handleAdd}
                                        onBatchRemove={(originals) => {
                                            if (resultsTab === 'active') {
                                                setCandidates(prev => prev.filter(c => !originals.includes(c.original)));
                                            } else {
                                                setJunkCandidates(prev => prev.filter(c => !originals.includes(c.original)));
                                            }

                                            import("@/lib/repositories/blacklist-repo").then(({ blacklistRepo, BlacklistLevel }) => {
                                                originals.forEach(item => blacklistRepo.addToBlacklist(item, BlacklistLevel.PHRASE));
                                            });
                                        }}
                                        onEdit={(oldOriginal, newOriginal) => {
                                            const setter = resultsTab === 'active' ? setCandidates : setJunkCandidates;
                                            setter(prev => prev.map(item => item.original === oldOriginal ? { ...item, original: newOriginal } : item));
                                        }}
                                        onTypeChange={(original, newType) => {
                                            if (newType === TermType.Junk && resultsTab === 'active') {
                                                const item = candidates.find(c => c.original === original);
                                                if (item) {
                                                    setCandidates(prev => prev.filter(c => c.original !== original));
                                                    setJunkCandidates(prev => [...prev, { ...item, type: TermType.Junk }]);
                                                }
                                                return;
                                            }
                                            if (newType !== TermType.Junk && resultsTab === 'trash') {
                                                const item = junkCandidates.find(c => c.original === original);
                                                if (item) {
                                                    setJunkCandidates(prev => prev.filter(c => c.original !== original));
                                                    setCandidates(prev => [...prev, { ...item, type: newType }]);
                                                }
                                                return;
                                            }
                                            const setter = resultsTab === 'active' ? setCandidates : setJunkCandidates;
                                            setter(prev => prev.map(item => item.original === original ? { ...item, type: newType } : item));
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t bg-muted/5 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                        {step === 'results' && !isScanning && (
                            <span>Tìm thấy <b>{candidates.length}</b> thực thể còn lại.</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>
                            {step === 'config' ? 'Hủy' : 'Đóng'}
                        </Button>

                        {step === 'config' ? (
                            <Button
                                onClick={handleStartScan}
                                disabled={!isReady || (activeTab === 'manual' && !manualText.trim())}
                                className="bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-105"
                            >
                                {isReady ? 'Bắt đầu quét 🚀' : 'Đang nạp dữ liệu...'}
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                onClick={() => setStep('config')}
                                disabled={isScanning}
                            >
                                Quay lại cấu hình
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function SparklesIcon(props: React.ComponentPropsWithoutRef<"svg">) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m12 3 1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
        </svg>
    )
}

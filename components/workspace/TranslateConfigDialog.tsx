import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Edit, X, Save, ChevronDown, Zap } from "lucide-react";
import { db } from "@/lib/db";
import { AI_MODELS, DEFAULT_MODEL, migrateModelId } from "@/lib/ai-models";
import { toast } from "sonner";

interface TranslateConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedCount: number;
    onStart: (config: any, settings: any) => void;
}

export function TranslateConfigDialog({ open, onOpenChange, selectedCount, onStart }: TranslateConfigDialogProps) {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [currentSettings, setCurrentSettings] = useState({ apiKey: "", model: DEFAULT_MODEL });
    const [translateConfig, setTranslateConfig] = useState({
        customPrompt: "",
        autoExtract: false,
        maxConcurrency: 5,
        fixPunctuation: false,
        enableChunking: false,
        maxConcurrentChunks: 3
    });
    const [savedPrompts, setSavedPrompts] = useState<any[]>([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const loadAll = async () => {
        const key = await db.settings.get("apiKeyPrimary");
        const model = await db.settings.get("aiModel");
        const lastPrompt = await db.settings.get("lastCustomPrompt");
        const lastConcurrency = await db.settings.get("lastMaxConcurrency");
        const lastFixPunctuation = await db.settings.get("lastFixPunctuation");
        const lastEnableChunking = await db.settings.get("enableChunking");
        const lastMaxConcurrentChunks = await db.settings.get("maxConcurrentChunks");
        const prompts = await db.prompts.toArray();

        setCurrentSettings({
            apiKey: key?.value || "",
            model: migrateModelId(model?.value || DEFAULT_MODEL)
        });

        setTranslateConfig(prev => ({
            ...prev,
            customPrompt: lastPrompt?.value || "",
            maxConcurrency: lastConcurrency?.value || 5,
            fixPunctuation: lastFixPunctuation?.value || false,
            enableChunking: lastEnableChunking?.value || false,
            maxConcurrentChunks: lastMaxConcurrentChunks?.value || 3
        }));
        setSavedPrompts(prompts);
    };

    useEffect(() => {
        if (open) {
            loadAll();
        }
    }, [open]);

    const saveSettings = async () => {
        await db.settings.put({ key: "apiKeyPrimary", value: currentSettings.apiKey });
        await db.settings.put({ key: "aiModel", value: currentSettings.model });
        setSettingsOpen(false);
        toast.success("Đã lưu cấu hình AI!");
    };

    const handleSavePrompt = async () => {
        if (!translateConfig.customPrompt) return;
        const title = prompt("Tên mẫu prompt này?");
        if (title) {
            await db.prompts.add({ title, content: translateConfig.customPrompt, createdAt: new Date() });
            setSavedPrompts(await db.prompts.toArray());
            toast.success("Đã lưu prompt thành công!");
        }
    };

    const handleStart = async () => {
        await db.settings.put({ key: "lastCustomPrompt", value: translateConfig.customPrompt });
        await db.settings.put({ key: "lastMaxConcurrency", value: translateConfig.maxConcurrency });
        await db.settings.put({ key: "lastFixPunctuation", value: translateConfig.fixPunctuation });
        await db.settings.put({ key: "enableChunking", value: translateConfig.enableChunking });
        await db.settings.put({ key: "maxConcurrentChunks", value: translateConfig.maxConcurrentChunks || 3 });
        onStart(translateConfig, currentSettings);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] border-border bg-background text-foreground shadow-2xl" overlayClassName="bg-transparent">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                        Cấu Hình Dịch
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Thiết lập tùy chọn cho tiến trình dịch {selectedCount} chương đã chọn.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4 relative">
                    {/* Active Config Display */}
                    <div className="p-4 rounded-xl bg-muted/30 border border-border flex justify-between items-center text-sm">
                        <div>
                            <div className="text-[10px] text-muted-foreground uppercase font-black tracking-wider mb-1">Active AI Model</div>
                            <div className="font-mono font-bold text-primary">{currentSettings.model}</div>
                        </div>
                        <Button variant="outline" size="sm" className="h-8 text-xs font-semibold" onClick={() => setSettingsOpen(true)}>
                            <Edit className="h-3 w-3 mr-2" /> Thay đổi
                        </Button>
                    </div>

                    {/* Quick Settings Overlay */}
                    {settingsOpen && (
                        <div className="absolute inset-x-0 top-0 z-50 bg-card p-6 rounded-xl border border-border shadow-2xl animate-in fade-in slide-in-from-bottom-2">
                            <h4 className="font-bold mb-4 flex items-center justify-between text-lg">
                                Cấu Hình Nhanh
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSettingsOpen(false)}><X className="h-4 w-4" /></Button>
                            </h4>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">API Key (Gemini)</Label>
                                    <Input value={currentSettings.apiKey} onChange={(e) => setCurrentSettings({ ...currentSettings, apiKey: e.target.value })} type="password" placeholder="AIza..." className="bg-background border-border" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">AI Model</Label>
                                    <select value={currentSettings.model} onChange={(e) => setCurrentSettings({ ...currentSettings, model: e.target.value })} className="w-full h-10 px-3 rounded-md bg-background border border-border text-sm focus:ring-2 focus:ring-primary outline-none">
                                        {AI_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                </div>
                                <Button className="w-full font-bold" onClick={saveSettings}>Lưu cấu hình</Button>
                            </div>
                        </div>
                    )}

                    {/* Concurrency Slider */}
                    <div className="space-y-4 p-4 bg-muted/20 rounded-xl border border-border">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-bold flex items-center gap-2">
                                <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                                Tốc độ (Luồng song song)
                            </Label>
                            <span className="text-primary font-black text-sm bg-primary/10 px-2 py-0.5 rounded-md">{translateConfig.maxConcurrency}x</span>
                        </div>
                        <Slider
                            value={[translateConfig.maxConcurrency]}
                            min={1}
                            max={20}
                            step={1}
                            onValueChange={(val: number[]) => setTranslateConfig({ ...translateConfig, maxConcurrency: val[0] })}
                            className="py-1"
                        />
                        <p className="text-[10px] text-muted-foreground italic font-medium">Chỉnh quá cao có thể bị AI từ chối do quá tải (Rate Limit).</p>
                    </div>

                    {/* Custom Prompt */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-bold">Prompt Tùy Chỉnh</Label>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Button variant="outline" size="sm" className="h-8 text-xs bg-background border-border w-[220px] justify-between font-medium" onClick={() => setDropdownOpen(!dropdownOpen)}>
                                        <span className="truncate pr-2">
                                            {translateConfig.customPrompt ? "Đang dùng prompt tùy chỉnh" : "Chọn mẫu prompt..."}
                                        </span>
                                        <ChevronDown className="h-3 w-3 opacity-50" />
                                    </Button>
                                    {dropdownOpen && (
                                        <div className="absolute top-9 right-0 w-full z-10 bg-card border border-border rounded-lg shadow-xl py-1 max-h-[220px] overflow-y-auto">
                                            {savedPrompts.map(p => (
                                                <button key={p.id} className="w-full text-left px-4 py-2.5 text-xs hover:bg-muted font-medium truncate" onClick={() => {
                                                    setTranslateConfig({ ...translateConfig, customPrompt: p.content });
                                                    setDropdownOpen(false);
                                                }}>
                                                    {p.title}
                                                </button>
                                            ))}
                                            {savedPrompts.length === 0 && <div className="px-4 py-3 text-[10px] text-muted-foreground text-center font-medium">Chưa có mẫu nào được lưu</div>}
                                        </div>
                                    )}
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors" title="Lưu mẫu" onClick={handleSavePrompt}><Save className="h-4 w-4" /></Button>
                            </div>
                        </div>
                        <Textarea
                            className="bg-muted/10 border-border text-foreground text-sm min-h-[140px] focus:ring-1 focus:ring-primary leading-relaxed"
                            placeholder="Mô tả phong cách dịch, các ngôi xưng hô, văn phong kiếm hiệp/tiên hiệp..."
                            value={translateConfig.customPrompt}
                            onChange={(e) => setTranslateConfig({ ...translateConfig, customPrompt: e.target.value })}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-bold">Fix lỗi ngắt dòng (Văn phẩy)</Label>
                            <p className="text-[11px] text-muted-foreground font-medium">AI tự động sửa dấu phẩy thành dấu chấm khi ngắt ý</p>
                        </div>
                        <Switch
                            checked={translateConfig.fixPunctuation}
                            onCheckedChange={(val: boolean) => setTranslateConfig({ ...translateConfig, fixPunctuation: val })}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-bold">Tự động trích xuất</Label>
                            <p className="text-[11px] text-muted-foreground font-medium">Tự động cập nhật Dictionary sau khi dịch xong</p>
                        </div>
                        <Switch
                            checked={translateConfig.autoExtract}
                            onCheckedChange={(val: boolean) => setTranslateConfig({ ...translateConfig, autoExtract: val })}
                        />
                    </div>

                    {/* Chunking Toggle with Parallel Selection */}
                    <div className="space-y-4 p-4 bg-muted/20 rounded-xl border border-border">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-bold">Parallel Chunking (Nhanh hơn ~40%)</Label>
                                <p className="text-[11px] text-muted-foreground font-medium">Chia chapter thành chunks nhỏ và dịch song song</p>
                            </div>
                            <Switch
                                checked={translateConfig.enableChunking}
                                onCheckedChange={(val: boolean) => setTranslateConfig({ ...translateConfig, enableChunking: val })}
                            />
                        </div>

                        {translateConfig.enableChunking && (
                            <div className="space-y-2 pt-2 border-t border-border/50">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-medium text-muted-foreground">Số chunks song song</Label>
                                    <span className="text-primary font-black text-sm bg-primary/10 px-2 py-0.5 rounded-md">{translateConfig.maxConcurrentChunks || 3}</span>
                                </div>
                                <Slider
                                    value={[translateConfig.maxConcurrentChunks || 3]}
                                    min={2}
                                    max={10}
                                    step={1}
                                    onValueChange={(val: number[]) => setTranslateConfig({ ...translateConfig, maxConcurrentChunks: val[0] })}
                                    className="py-1"
                                />
                                <p className="text-[10px] text-muted-foreground italic font-medium">Tier 1 API: Khuyến nghị 3-5 chunks. Quá cao có thể bị rate limit.</p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="pt-4 border-t border-border mt-2">
                    <Button variant="ghost" className="text-muted-foreground hover:text-foreground font-medium" onClick={() => onOpenChange(false)}>Hủy</Button>
                    <Button className="font-bold min-w-[160px] shadow-lg shadow-primary/20" onClick={handleStart}>
                        Bắt đầu dịch ({selectedCount})
                    </Button>
                </DialogFooter>

                {/* Estimate Footer */}
                <div className="px-6 pb-4">
                    <EstimateInfo modelId={currentSettings.model} count={selectedCount} />
                </div>
            </DialogContent>
        </Dialog>
    );
}

function EstimateInfo({ modelId, count }: { modelId: string, count: number }) {
    const model = AI_MODELS.find(m => m.value === modelId);
    if (!model) return null;

    const AVG_CHARS_PER_CHAPTER = 4000;
    const TOKENS_PER_CHAR = 0.25;
    const TOTAL_CHARS = AVG_CHARS_PER_CHAPTER * count;
    const INPUT_TOKENS = TOTAL_CHARS * TOKENS_PER_CHAR;
    const OUTPUT_TOKENS = INPUT_TOKENS * 1.2;

    const inputCost = (INPUT_TOKENS / 1_000_000) * (model.inputPrice || 0);
    const outputCost = (OUTPUT_TOKENS / 1_000_000) * (model.outputPrice || 0);
    const totalCost = inputCost + outputCost;

    return (
        <div className="flex items-center justify-center gap-6 border-t border-border/50 pt-4 mt-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            <div>
                Est. Tokens: <span className="text-foreground font-mono">{Math.round(INPUT_TOKENS + OUTPUT_TOKENS).toLocaleString()}</span>
            </div>
            <div>
                Est. Cost: <span className="text-emerald-500 font-mono">${totalCost.toFixed(5)}</span>
            </div>
        </div>
    );
}

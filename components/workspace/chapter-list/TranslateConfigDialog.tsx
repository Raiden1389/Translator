import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, X, Save, ChevronDown, Zap, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { AI_MODELS, DEFAULT_MODEL, migrateModelId } from "@/lib/ai-models";
import { toast } from "sonner";

interface TranslateConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedCount: number;
    onStart: (config: TranslationConfig, settings: TranslationSettingsManual) => void;
}

interface TranslationConfig {
    customPrompt: string;
    autoExtract: boolean;
    maxConcurrency: number;
    fixPunctuation: boolean;
    enableChunking: boolean;
    enableTurbo: boolean; // 🚀 New
    maxConcurrentChunks: number;
    chunkSize: number;
    temperature: number; // 🎨 NEW: AI creativity (0.0-1.0)
    enableThinking?: boolean; // 🧠 For Gemini 2.5 Flash
    thinkingLevel: "minimal" | "low" | "medium" | "high"; // 🧠 NEW: For Gemini 3.0
    enableBatch: boolean; // ⚡ NEW: Batch translation
    batchSize: number; // ⚡ NEW: Chapters per batch (2-5)
    maxCharsPerBatch: number; // ⚡ NEW: Max chars per batch
}

interface TranslationSettingsManual {
    apiKey: string;
    model: string;
}

// Export default config for keyboard shortcuts
export const DEFAULT_TRANSLATION_CONFIG: TranslationConfig = {
    customPrompt: "",
    autoExtract: false,
    maxConcurrency: 5,
    fixPunctuation: false,
    enableChunking: true,
    enableTurbo: false,
    maxConcurrentChunks: 5,
    chunkSize: 800,
    temperature: 0.1,
    thinkingLevel: "minimal",
    enableBatch: false, // Disabled by default
    batchSize: 3, // 3 chapters per batch (empirical sweet spot)
    maxCharsPerBatch: 25000 // 25K chars (empirical sweet spot)
};

export function TranslateConfigDialog({ open, onOpenChange, selectedCount, onStart }: TranslateConfigDialogProps) {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [currentSettings, setCurrentSettings] = useState({ apiKey: "", model: DEFAULT_MODEL });
    const [translateConfig, setTranslateConfig] = useState<TranslationConfig>({
        customPrompt: "",
        autoExtract: false,
        maxConcurrency: 5,
        fixPunctuation: false,
        enableChunking: false,
        enableTurbo: true, // Auto-on by default
        maxConcurrentChunks: 3,
        chunkSize: 800,
        temperature: 0.1, // Default: Low creativity for consistency
        thinkingLevel: "minimal", // Default: Minimal to save cost
        enableBatch: false,
        batchSize: 3,
        maxCharsPerBatch: 25000
    });
    const [savedPrompts, setSavedPrompts] = useState<{ id?: number, title: string, content: string }[]>([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [promptExpanded, setPromptExpanded] = useState(false);
    const isMounted = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);


    useEffect(() => {
        if (!open) return;

        const load = async () => {
            const key = await db.settings.get("apiKeyPrimary");
            const model = await db.settings.get("aiModel");
            const lastPrompt = await db.settings.get("lastCustomPrompt");
            const lastConcurrency = await db.settings.get("lastMaxConcurrency");
            const lastFixPunctuation = await db.settings.get("lastFixPunctuation");
            const lastEnableChunking = await db.settings.get("enableChunking");
            const lastEnableTurbo = await db.settings.get("enableTurbo");
            const lastMaxConcurrentChunks = await db.settings.get("maxConcurrentChunks");
            const lastChunkSize = await db.settings.get("chunkSize");
            const lastTemperature = await db.settings.get("temperature");
            const lastEnableBatch = await db.settings.get("enableBatch");
            const lastBatchSize = await db.settings.get("batchSize");
            const lastMaxCharsPerBatch = await db.settings.get("maxCharsPerBatch");
            const prompts = await db.prompts.toArray();

            setCurrentSettings({
                apiKey: (key?.value as string) || "",
                model: migrateModelId((model?.value as string) || DEFAULT_MODEL)
            });

            setTranslateConfig(prev => ({
                ...prev,
                customPrompt: (lastPrompt?.value as string) || "",
                maxConcurrency: (lastConcurrency?.value as number) || 5,
                fixPunctuation: (lastFixPunctuation?.value as boolean) || false,
                enableChunking: (lastEnableChunking?.value as boolean) || false,
                enableTurbo: lastEnableTurbo ? (lastEnableTurbo.value as boolean) : true,
                maxConcurrentChunks: (lastMaxConcurrentChunks?.value as number) || 3,
                chunkSize: (lastChunkSize?.value as number) || 800,
                temperature: (lastTemperature?.value as number) ?? 0.1,
                enableBatch: (lastEnableBatch?.value as boolean) || false,
                batchSize: (lastBatchSize?.value as number) || 3,
                maxCharsPerBatch: (lastMaxCharsPerBatch?.value as number) || 25000
            }));
            setSavedPrompts(prompts);
        };

        load();
    }, [open]);

    const saveSettings = async () => {
        try {
            await db.settings.put({ key: "apiKeyPrimary", value: currentSettings.apiKey });
            await db.settings.put({ key: "aiModel", value: currentSettings.model });

            if (isMounted.current) {
                toast.success("Đã lưu cấu hình AI!");
                // Close dialog AFTER toast
                setSettingsOpen(false);
            }
        } catch (error) {
            console.error("[SAVE SETTINGS ERROR]", error);
            if (isMounted.current) {
                toast.error("Lỗi khi lưu cấu hình!");
            }
        }
    };

    const handleSavePrompt = async () => {
        if (!translateConfig.customPrompt) return;
        const title = prompt("Tên mẫu prompt này?");
        if (title) {
            await db.prompts.add({ title, content: translateConfig.customPrompt, createdAt: new Date() });
            if (isMounted.current) {
                setSavedPrompts(await db.prompts.toArray());
                toast.success("Đã lưu prompt thành công!");
            }
        }
    };

    const handleStart = async () => {
        await db.settings.put({ key: "lastCustomPrompt", value: translateConfig.customPrompt });
        await db.settings.put({ key: "lastMaxConcurrency", value: translateConfig.maxConcurrency });
        await db.settings.put({ key: "lastFixPunctuation", value: translateConfig.fixPunctuation });
        await db.settings.put({ key: "enableChunking", value: translateConfig.enableChunking });
        await db.settings.put({ key: "enableTurbo", value: translateConfig.enableTurbo });
        await db.settings.put({ key: "maxConcurrentChunks", value: translateConfig.maxConcurrentChunks || 3 });
        await db.settings.put({ key: "chunkSize", value: translateConfig.chunkSize || 800 });
        await db.settings.put({ key: "temperature", value: translateConfig.temperature ?? 0.1 });
        await db.settings.put({ key: "enableBatch", value: translateConfig.enableBatch });
        await db.settings.put({ key: "batchSize", value: translateConfig.batchSize });
        await db.settings.put({ key: "maxCharsPerBatch", value: translateConfig.maxCharsPerBatch });
        onStart(translateConfig, currentSettings);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] border-border bg-background text-foreground shadow-2xl" overlayClassName="bg-transparent">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                        Cấu Hình Dịch
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4 relative max-h-[60vh] overflow-y-auto pr-2">
                    {/* Active Config Display */}
                    <div className="p-3 rounded-xl bg-muted/30 border border-border flex justify-between items-center text-sm">
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
                                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-medium">Fix lỗi ngắt dòng (Văn phẩy)</Label>
                                        <p className="text-xs text-muted-foreground/70">AI tự động sửa dấu phẩy thành dấu chấm khi ngắt ý</p>
                                    </div>
                                    <Switch
                                        checked={translateConfig.fixPunctuation}
                                        onCheckedChange={(val: boolean) => setTranslateConfig({ ...translateConfig, fixPunctuation: val })}
                                    />
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
                        <p className="text-xs text-muted-foreground/70 italic font-medium">Chỉnh quá cao có thể bị AI từ chối do quá tải (Rate Limit).</p>
                    </div>

                    {/* Temperature Slider */}
                    <div className="space-y-4 p-4 bg-muted/20 rounded-xl border border-border">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-bold flex items-center gap-2">
                                🎨 Creativity (Temperature)
                            </Label>
                            <span className="text-primary font-black text-sm bg-primary/10 px-2 py-0.5 rounded-md">{translateConfig.temperature.toFixed(1)}</span>
                        </div>
                        <Slider
                            value={[translateConfig.temperature]}
                            min={0}
                            max={1}
                            step={0.1}
                            onValueChange={(val: number[]) => setTranslateConfig({ ...translateConfig, temperature: val[0] })}
                            className="py-1"
                        />
                        <p className="text-xs text-muted-foreground/70 italic font-medium">
                            <span className="font-bold">0.0-0.2:</span> Nhất quán, ít sáng tạo.
                            <span className="font-bold ml-2">0.3-0.5:</span> Cân bằng.
                            <span className="font-bold ml-2">0.6-1.0:</span> Sáng tạo, đa dạng.
                        </p>
                    </div>

                    {/* Thinking Controls - Conditional based on model */}
                    {currentSettings.model.includes('gemini-3') ? (
                        // Gemini 3.0: Thinking Level Selector
                        <div className="space-y-3 p-4 bg-purple-500/10 rounded-xl border border-purple-500/30">
                            <div className="space-y-1">
                                <Label className="text-sm font-bold flex items-center gap-2">
                                    🧠 Thinking Level <span className="text-xs font-normal text-purple-600">(Gemini 3.0)</span>
                                </Label>
                                <p className="text-xs text-muted-foreground/70 font-medium">
                                    Control AI reasoning depth - Higher = Smarter but slower & more expensive
                                </p>
                            </div>
                            <select
                                value={translateConfig.thinkingLevel}
                                onChange={(e) => setTranslateConfig({ ...translateConfig, thinkingLevel: e.target.value as "minimal" | "low" | "medium" | "high" })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="minimal">⚡ Minimal - Fastest, Cheapest (~$0.0035/chapter)</option>
                                <option value="low">🔹 Low - Simple tasks (~$0.0040/chapter)</option>
                                <option value="medium">⭐ Medium (Recommended) - Balanced (~$0.0050/chapter)</option>
                                <option value="high">🔥 High - Complex reasoning (~$0.0070/chapter)</option>
                            </select>
                        </div>
                    ) : (
                        // Gemini 2.5: Thinking Toggle
                        <div className="flex items-center justify-between p-4 bg-amber-500/10 rounded-xl border border-amber-500/30">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-bold flex items-center gap-2">
                                    🧠 Thinking Mode <span className="text-xs font-normal text-amber-600">(Gemini 2.5)</span>
                                </Label>
                                <p className="text-xs text-muted-foreground/70 font-medium">
                                    Deep reasoning mode - <span className="font-bold text-amber-600">costs 5.8x more</span> ($3.50 vs $0.60 per 1M tokens)
                                </p>
                            </div>
                            <Switch
                                checked={translateConfig.enableThinking || false}
                                onCheckedChange={(val: boolean) => setTranslateConfig({ ...translateConfig, enableThinking: val })}
                            />
                        </div>
                    )}

                    {/* Custom Prompt - Collapsible */}
                    <div className="space-y-3 p-4 bg-muted/20 rounded-xl border border-border">
                        <button
                            type="button"
                            onClick={() => setPromptExpanded(!promptExpanded)}
                            className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                        >
                            <Label className="text-sm font-bold cursor-pointer">Prompt Tùy Chỉnh</Label>
                            <ChevronRight className={`h-4 w-4 transition-transform ${promptExpanded ? 'rotate-90' : ''}`} />
                        </button>

                        {promptExpanded && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center justify-between">
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
                        )}
                    </div>

                    {/* Chunking Toggle with Parallel Selection */}
                    <div className="space-y-4 p-4 bg-muted/20 rounded-xl border border-border">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-bold">Parallel Chunking (Nhanh hơn ~40%)</Label>
                                <p className="text-xs text-muted-foreground/70 font-medium">Chia chapter thành chunks nhỏ và dịch song song</p>
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
                                <p className="text-xs text-muted-foreground/70 italic font-medium">Tier 1 API: Khuyến nghị 3-5 chunks. Quá cao có thể bị rate limit.</p>

                                <div className="space-y-2 pt-2 border-t border-border/50">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-medium text-muted-foreground">Kích thước Chunk (ký tự)</Label>
                                        <span className="text-primary font-black text-sm bg-primary/10 px-2 py-0.5 rounded-md">{translateConfig.chunkSize || 800}</span>
                                    </div>
                                    <Slider
                                        value={[translateConfig.chunkSize || 800]}
                                        min={500}
                                        max={4000}
                                        step={100}
                                        onValueChange={(val: number[]) => setTranslateConfig({ ...translateConfig, chunkSize: val[0] })}
                                        className="py-1"
                                    />
                                    <p className="text-xs text-muted-foreground/70 italic font-medium">Lag mạng: Hãy dùng chunk to (2000+). Mạng nhanh: Dùng chunk nhỏ (800-1200).</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Batch Translation - NEW */}
                    <div className="space-y-4 p-4 bg-green-500/10 rounded-xl border border-green-500/30">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-bold flex items-center gap-2">
                                    ⚡ Batch Translation (Dịch Gộp)
                                </Label>
                                <p className="text-xs text-muted-foreground/70 font-medium">Gộp nhiều chapters vào 1 lần dịch - Tiết kiệm 66% chi phí & nhanh hơn 53%</p>
                            </div>
                            <Switch
                                checked={translateConfig.enableBatch}
                                onCheckedChange={(val: boolean) => {
                                    // Auto-adjust chunking settings when toggling batch mode
                                    if (val) {
                                        // Batch mode ON: Enable chunking with larger chunks
                                        setTranslateConfig({
                                            ...translateConfig,
                                            enableBatch: true,
                                            enableChunking: true,
                                            chunkSize: 2500, // Batch preset
                                            maxConcurrentChunks: 5
                                        });
                                    } else {
                                        // Batch mode OFF: Revert to single-chapter chunking
                                        setTranslateConfig({
                                            ...translateConfig,
                                            enableBatch: false,
                                            chunkSize: 800 // Single mode preset
                                        });
                                    }
                                }}
                            />
                        </div>

                        {translateConfig.enableBatch && (
                            <div className="space-y-3 pt-2 border-t border-green-500/30">
                                {/* Batch size with number input (arrows) */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-muted-foreground">Số chương gộp</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            min={2}
                                            max={5}
                                            value={translateConfig.batchSize}
                                            onChange={(e) => {
                                                const val = Math.max(2, Math.min(5, Number(e.target.value)));
                                                setTranslateConfig({ ...translateConfig, batchSize: val });
                                            }}
                                            className="w-24 text-center font-bold"
                                        />
                                        <span className="text-xs text-muted-foreground">chapters/batch (2-5)</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground/70 italic">Recommended: 3 chapters (empirical sweet spot)</p>
                                </div>

                                {/* Max chars per batch */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-muted-foreground">Giới hạn ký tự/batch</Label>
                                    <Input
                                        type="number"
                                        min={10000}
                                        max={100000}
                                        step={5000}
                                        value={translateConfig.maxCharsPerBatch}
                                        onChange={(e) => setTranslateConfig({ ...translateConfig, maxCharsPerBatch: Number(e.target.value) })}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-muted-foreground/70 italic">Recommended: 25,000 chars (quality sweet spot)</p>
                                </div>

                                {/* Savings preview */}
                                <div className="p-3 bg-green-500/20 rounded-lg border border-green-500/40 space-y-2">
                                    <div className="text-xs font-bold text-green-600 uppercase tracking-wide">Tiết kiệm dự kiến ({selectedCount} chapters)</div>
                                    <div className="space-y-1 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Cost:</span>
                                            <span className="font-mono font-bold text-green-600">
                                                ${(selectedCount * 0.0075).toFixed(2)} → ${(Math.ceil(selectedCount / translateConfig.batchSize) * 0.0025).toFixed(2)} (-66%)
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Time:</span>
                                            <span className="font-mono font-bold text-green-600">
                                                {Math.ceil(selectedCount * 10 / 60)}min → {Math.ceil(Math.ceil(selectedCount / translateConfig.batchSize) * 14 / 60)}min (-53%)
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">API calls:</span>
                                            <span className="font-mono font-bold text-green-600">
                                                {selectedCount * 5} → {Math.ceil(selectedCount / translateConfig.batchSize) * 5} (-66%)
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Warning if too large */}
                                {translateConfig.maxCharsPerBatch > 50000 && (
                                    <div className="p-2 bg-amber-500/20 rounded border border-amber-500/40 text-xs text-amber-600 font-medium">
                                        ⚠️ Batch quá lớn (\u003e50K chars) có thể giảm chất lượng dịch
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="pt-4 border-t border-border mt-2 flex-col sm:flex-row gap-2">
                    <Button variant="ghost" className="text-muted-foreground hover:text-foreground font-medium w-full sm:w-auto" onClick={() => onOpenChange(false)}>Hủy</Button>
                    <Button size="lg" className="font-bold w-full sm:flex-1 shadow-lg shadow-primary/20" onClick={handleStart}>
                        Bắt đầu dịch ({selectedCount})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


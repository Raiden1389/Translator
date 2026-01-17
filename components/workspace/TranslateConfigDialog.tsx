import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, AlertTriangle, Edit, X, Save, ChevronDown, Trash2 } from "lucide-react";
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
        autoExtract: false
    });
    const [savedPrompts, setSavedPrompts] = useState<any[]>([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        if (open) {
            loadAll();
        }
    }, [open]);

    const loadAll = async () => {
        const key = await db.settings.get("apiKeyPrimary");
        const model = await db.settings.get("aiModel");
        const lastPrompt = await db.settings.get("lastCustomPrompt");
        const prompts = await db.prompts.toArray();

        setCurrentSettings({
            apiKey: key?.value || "",
            model: migrateModelId(model?.value || DEFAULT_MODEL)
        });

        if (lastPrompt?.value) {
            setTranslateConfig(prev => ({ ...prev, customPrompt: lastPrompt.value }));
        }
        setSavedPrompts(prompts);
    };

    const saveSettings = async () => {
        await db.settings.put({ key: "apiKeyPrimary", value: currentSettings.apiKey });
        await db.settings.put({ key: "aiModel", value: currentSettings.model });
        setSettingsOpen(false);
        toast.success("Đã lưu cấu hình AI!", { duration: 6000 });
    };

    const handleSavePrompt = async () => {
        if (!translateConfig.customPrompt) return;
        const title = prompt("Tên mẫu prompt này?");
        if (title) {
            await db.prompts.add({ title, content: translateConfig.customPrompt, createdAt: new Date() });
            setSavedPrompts(await db.prompts.toArray());
            toast.success("Đã lưu prompt thành công!", { duration: 10000 });
        }
    };

    const handleDeletePrompt = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Bạn có chắc muốn xóa prompt này?")) {
            await db.prompts.delete(id);
            setSavedPrompts(await db.prompts.toArray());
            toast.success("Đã xóa prompt!", { duration: 10000 });
        }
    };

    const handleRenamePrompt = async (id: number, currentTitle: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newTitle = prompt("Nhập tên mới:", currentTitle);
        if (newTitle && newTitle.trim() !== currentTitle) {
            await db.prompts.update(id, { title: newTitle.trim() });
            setSavedPrompts(await db.prompts.toArray());
            toast.success("Đã đổi tên prompt!", { duration: 10000 });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-[#1a0b2e] border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded bg-primary/20 text-primary"><RefreshCw className="h-4 w-4" /></div>
                            Cấu Hình Dịch
                        </div>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20" title="Debug DB" onClick={async () => {
                            try {
                                if (!db.isOpen()) await db.open();
                                const count = await db.prompts.count();
                                const list = await db.prompts.toArray();
                                alert(`Debug Prompts: ${count} items.\nTitles: ${list.map(p => p.title).join(', ')}`);
                            } catch (e: any) { alert("Error: " + e.message); }
                        }}>
                            <AlertTriangle className="h-3 w-3 mr-1" /> Check DB ({savedPrompts.length})
                        </Button>
                    </DialogTitle>
                    <DialogDescription className="text-white/50">
                        Thiết lập tùy chọn cho tiến trình dịch {selectedCount} chương đã chọn.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4 relative">
                    {/* Active Config Display */}
                    <div className="p-3 rounded bg-white/5 border border-white/10 flex justify-between items-center text-sm">
                        <div>
                            <div className="text-xs text-white/50 uppercase font-bold">Active Configuration</div>
                            <div className="text-white font-mono">{currentSettings.model}</div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 text-xs text-white/50 hover:text-white" onClick={() => setSettingsOpen(true)}>
                            <Edit className="h-3 w-3 mr-1" /> Change
                        </Button>
                    </div>

                    {/* Quick Settings Overly */}
                    {settingsOpen && (
                        <div className="absolute inset-x-0 top-0 z-50 bg-[#2b2b40] p-4 rounded-xl border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
                            <h4 className="text-white font-bold mb-4 flex items-center justify-between">
                                Cấu Hình Nhanh
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setSettingsOpen(false)}><X className="h-4 w-4" /></Button>
                            </h4>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-white/70">API Key (Gemini)</Label>
                                    <Input value={currentSettings.apiKey} onChange={(e) => setCurrentSettings({ ...currentSettings, apiKey: e.target.value })} type="password" placeholder="AIza..." className="bg-[#1a0b2e] border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-white/70">AI Model</Label>
                                    <select value={currentSettings.model} onChange={(e) => setCurrentSettings({ ...currentSettings, model: e.target.value })} className="w-full h-10 px-3 rounded-md bg-[#1a0b2e] border border-white/10 text-white text-sm">
                                        {AI_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                </div>
                                <Button className="w-full bg-primary" onClick={saveSettings}>Lưu Cấu Hình</Button>
                            </div>
                        </div>
                    )}

                    {/* Custom Prompt */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-white/70">Prompt Tùy Chỉnh</Label>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Button variant="outline" size="sm" className="h-7 text-xs bg-white/5 border-white/10 w-[200px] justify-between" onClick={() => setDropdownOpen(!dropdownOpen)}>
                                        {translateConfig.customPrompt ? "Sử dụng prompt tùy chỉnh" : "Chọn mẫu prompt..."}
                                        <ChevronDown className="h-3 w-3" />
                                    </Button>
                                    {dropdownOpen && (
                                        <div className="absolute top-8 right-0 w-full z-10 bg-[#2b2b40] border border-white/10 rounded-md shadow-lg py-1">
                                            {savedPrompts.map(p => (
                                                <div key={p.id} className="w-full flex items-center justify-between hover:bg-primary/20 group px-1">
                                                    <button className="flex-1 text-left px-2 py-2 text-xs truncate" onClick={() => {
                                                        setTranslateConfig({ ...translateConfig, customPrompt: p.content });
                                                        setDropdownOpen(false);
                                                    }}>
                                                        {p.title}
                                                    </button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-white/30 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={(e) => handleRenamePrompt(p.id, p.title, e)}
                                                        title="Đổi tên"
                                                    >
                                                        <Edit className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={(e) => handleDeletePrompt(p.id, e)}
                                                        title="Xóa prompt này"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                            {savedPrompts.length === 0 && <div className="px-3 py-2 text-[10px] text-white/30 text-center">Chưa có mẫu nào</div>}
                                        </div>
                                    )}
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-white/50" title="Lưu mẫu" onClick={handleSavePrompt}><Save className="h-3.5 w-3.5" /></Button>
                            </div>
                        </div>
                        <Textarea
                            className="bg-[#1a0b2e] border-white/10 text-white text-sm min-h-[120px]"
                            placeholder="Mô tả phong cách dịch, các ngôi xưng hô..."
                            value={translateConfig.customPrompt}
                            onChange={(e) => setTranslateConfig({ ...translateConfig, customPrompt: e.target.value })}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-bold">Tự động trích xuất</Label>
                            <p className="text-xs text-white/40">Tìm nhân vật & thuật ngữ mới sau khi dịch</p>
                        </div>
                        <Switch
                            checked={translateConfig.autoExtract}
                            onCheckedChange={(val) => setTranslateConfig({ ...translateConfig, autoExtract: val })}
                        />
                    </div>
                </div>

                <DialogFooter className="pt-2 border-t border-white/5">
                    <Button variant="ghost" className="text-white/50 hover:text-white" onClick={() => onOpenChange(false)}>Hủy</Button>
                    <Button className="bg-primary hover:bg-primary/90 min-w-[140px] gap-2 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]" onClick={() => onStart(translateConfig, currentSettings)}>
                        Start Translating ({selectedCount})
                    </Button>
                </DialogFooter>

                {/* Estimate Footer */}
                <div className="px-6 pb-6 text-xs text-white/30 text-center">
                    <EstimateInfo modelId={currentSettings.model} count={selectedCount} />
                </div>
            </DialogContent>
        </Dialog>
    );
}

function EstimateInfo({ modelId, count }: { modelId: string, count: number }) {
    const model = AI_MODELS.find(m => m.value === modelId);
    if (!model) return null;

    // Heuristics
    const AVG_CHARS_PER_CHAPTER = 4000;
    const TOKENS_PER_CHAR = 0.25; // ~4 chars per token
    const TOTAL_CHARS = AVG_CHARS_PER_CHAPTER * count;
    const INPUT_TOKENS = TOTAL_CHARS * TOKENS_PER_CHAR;
    const OUTPUT_TOKENS = INPUT_TOKENS * 1.2; // Output usually slightly longer due to Vietnamese verbosity? Or maybe shorter. Let's assume 1.2 for safety (system prompt overhead etc)

    const inputCost = (INPUT_TOKENS / 1_000_000) * (model.inputPrice || 0);
    const outputCost = (OUTPUT_TOKENS / 1_000_000) * (model.outputPrice || 0);
    const totalCost = inputCost + outputCost;

    return (
        <div className="flex items-center justify-center gap-4 border-t border-white/5 pt-4 mt-2">
            <div>
                Est. Tokens: <span className="text-white/70 font-mono">~{Math.round(INPUT_TOKENS + OUTPUT_TOKENS).toLocaleString()}</span>
            </div>
            <div>
                Est. Cost: <span className="text-emerald-400 font-bold font-mono">${totalCost.toFixed(5)}</span>
            </div>
        </div>
    );
}

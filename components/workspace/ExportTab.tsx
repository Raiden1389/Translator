"use client";

import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Setting } from "@/lib/db";
import {
    FileText, Book, Layout, Type, Check, Cloud, FolderPlus, RefreshCw, LogOut, Image as ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ExportLang } from "@/lib/services/export.service";

// Sub-components
import { FormatCard } from "./export/FormatCard";
import { ExportForm } from "./export/ExportForm";
import { Switch } from "@/components/ui/switch";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useExport } from "./hooks/useExport";

/* ===================== SMALL COMPONENTS ===================== */

interface LanguageSelectorProps {
    lang: ExportLang;
    setLang: (l: ExportLang) => void;
    options: { id: ExportLang; label: string; icon: React.ReactNode; desc?: string }[];
}

function LanguageSelector({ lang, setLang, options }: LanguageSelectorProps) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <Type className="w-5 h-5 text-primary" />
                2. Nội dung ngôn ngữ
            </h3>
            <div className="grid grid-cols-1 gap-2">
                {options.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => setLang(opt.id)}
                        className={cn(
                            "flex items-center justify-between p-3 px-4 rounded-xl border text-left transition-all",
                            lang === opt.id
                                ? "bg-amber-500/10 border-amber-500 ring-1 ring-amber-500 shadow-sm"
                                : "bg-muted/50 border-border hover:bg-muted hover:border-border/80"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn("w-2 h-2 rounded-full", lang === opt.id ? "bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.4)]" : "bg-slate-300")} />
                            <div>
                                <div className="font-bold text-sm text-slate-900">{opt.label}</div>
                                <div className="text-[10px] text-slate-500 font-medium">{opt.desc}</div>
                            </div>
                        </div>
                        {lang === opt.id && <Check className="w-4 h-4 text-indigo-600" />}
                    </button>
                ))}
            </div>
        </div>
    );
}

interface GDriveSectionProps {
    useDrive: boolean;
    setUseDrive: (v: boolean) => void;
    driveToken: Setting | undefined;
    driveUser: Setting | undefined;
    clientIdSetting: Setting | undefined;
    handleConnectDrive: () => void;
    handleLogoutDrive: () => void;
    driveFolders: { id: string; name: string }[];
    selectedFolderId: string;
    setSelectedFolderId: (v: string) => void;
    loadFolders: () => void;
    handleCreateFolder: () => void;
    showManualInput: boolean;
    setShowManualInput: (v: boolean) => void;
    manualToken: string;
    setManualToken: (v: string) => void;
    handleManualTokenSave: () => void;
    getManualAuthUrl: () => string;
}

function GDriveSection({
    useDrive, setUseDrive, driveToken, driveUser, clientIdSetting,
    handleConnectDrive, handleLogoutDrive, driveFolders, selectedFolderId, setSelectedFolderId,
    loadFolders, handleCreateFolder, showManualInput, setShowManualInput,
    manualToken, setManualToken, handleManualTokenSave, getManualAuthUrl
}: GDriveSectionProps) {
    return (
        <div className="space-y-4 p-5 bg-card/30 border border-border rounded-2xl">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-black flex items-center gap-2 text-foreground uppercase tracking-tight">
                    <Cloud className="w-4 h-4 text-indigo-600" />
                    Google Drive Sync
                </h3>
                <Switch checked={useDrive} onCheckedChange={setUseDrive} className="data-[state=checked]:bg-indigo-600" />
            </div>

            {useDrive && (
                <div className="space-y-4 pt-2 animate-in fade-in zoom-in-95">
                    {!driveToken?.value ? (
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground uppercase font-black">Google Client ID</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="password"
                                        placeholder="Lấy ở Google Cloud Console"
                                        defaultValue={(clientIdSetting?.value as string) || ""}
                                        className="h-9 text-xs"
                                        onBlur={async (e) => {
                                            if (e.target.value) {
                                                await db.settings.put({ key: "gdrive_client_id", value: e.target.value });
                                                toast.success("Đã cập nhật Client ID");
                                            }
                                        }}
                                    />
                                    <Button size="sm" onClick={handleConnectDrive}>Kết nối</Button>
                                </div>
                            </div>

                            {showManualInput ? (
                                <div className="space-y-3 pt-3 border-t border-border animate-in fade-in">
                                    <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Kết nối thủ công</div>
                                    <div className="text-xs text-muted-foreground leading-relaxed">
                                        1. <span onClick={async () => { const url = getManualAuthUrl(); if (url && url !== "#") { const { open } = await import("@tauri-apps/plugin-shell"); await open(url); } }} className="text-amber-500 underline font-medium cursor-pointer">Lấy Token</span> (trình duyệt sẽ mở).
                                        <br />
                                        2. Sau khi đăng nhập, copy toàn bộ URL trên thanh địa chỉ và dán vào đây:
                                    </div>
                                    <div className="flex gap-2">
                                        <Input value={manualToken} onChange={(e) => setManualToken(e.target.value)} placeholder="Dán URL..." className="h-9 text-xs flex-1" />
                                        <Button size="sm" onClick={handleManualTokenSave}>Lưu</Button>
                                    </div>
                                    <Button variant="link" size="sm" className="h-auto p-0 text-[10px]" onClick={() => setShowManualInput(false)}>Hủy</Button>
                                </div>
                            ) : (
                                <div className="text-center pt-1">
                                    <button onClick={() => setShowManualInput(true)} className="text-[10px] text-amber-500/70 hover:text-amber-500 underline">Gặp lỗi? Thử kết nối thủ công</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-2 px-3 bg-primary/5 rounded-xl border border-primary/10">
                                <div className="flex items-center gap-2 overflow-hidden text-[10px] text-muted-foreground font-medium">
                                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0 uppercase">{(driveUser?.value as { email?: string })?.email?.[0] || "?"}</div>
                                    <span className="truncate">{(driveUser?.value as { email?: string })?.email || "Đã kết nối"}</span>
                                </div>
                                <Button variant="ghost" size="sm" onClick={handleLogoutDrive} className="h-7 text-[10px] text-muted-foreground hover:text-red-500"><LogOut className="w-3 h-3 mr-1" /> Đăng xuất</Button>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground uppercase font-bold">Thư mục Drive</Label>
                                <div className="flex gap-2">
                                    <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Chọn thư mục" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="root">My Drive (Gốc)</SelectItem>
                                            {(driveFolders as { id: string; name: string }[]).map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={loadFolders}><RefreshCw className="w-3.5 h-3.5" /></Button>
                                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleCreateFolder}><FolderPlus className="w-3.5 h-3.5" /></Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ===================== MAIN ===================== */

export function ExportTab({ workspaceId }: { workspaceId: string }) {
    const workspace = useLiveQuery(() => db.workspaces.get(workspaceId), [workspaceId]);
    const chapters = useLiveQuery(async () => {
        const items = await db.chapters.where("workspaceId").equals(workspaceId).toArray();
        return items.sort((a, b) => a.order - b.order);
    }, [workspaceId]) || [];

    const { state, actions } = useExport({ workspace, chapters });

    const {
        format, lang, rangeStart, rangeEnd,
        isExporting, exportProgress,
        useDrive, driveFolders, selectedFolderId,
        showManualInput, manualToken,
        driveToken, driveUser, clientIdSetting
    } = state;

    const {
        setFormat, setLang, setRangeStart, setRangeEnd,
        setUseDrive, setSelectedFolderId, setShowManualInput, setManualToken,
        handleConnectDrive, handleLogoutDrive, handleManualTokenSave,
        handleCreateFolder, handleStartExport, loadFolders, getManualAuthUrl
    } = actions;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Layout className="w-5 h-5 text-primary" /> 1. Định dạng file
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <FormatCard id="epub" label="EPUB" icon={Book} description="E-book chuẩn, có bìa" isActive={format === "epub"} onClick={() => setFormat("epub")} />
                            <FormatCard id="txt" label="TXT" icon={FileText} description="Văn bản thô (Raw)" isActive={format === "txt"} onClick={() => setFormat("txt")} />
                        </div>
                    </div>

                    <LanguageSelector
                        lang={lang} setLang={setLang}
                        options={[
                            { id: "vi", label: "Tiếng Việt", icon: <ImageIcon className="w-5 h-5" />, desc: "Nội dung bản dịch" },
                            { id: "zh", label: "Tiếng Trung", icon: <Book className="w-5 h-5" />, desc: "Nội dung bản gốc" }
                        ]}
                    />

                    <GDriveSection
                        useDrive={useDrive} setUseDrive={setUseDrive}
                        driveToken={driveToken} driveUser={driveUser} clientIdSetting={clientIdSetting}
                        handleConnectDrive={handleConnectDrive} handleLogoutDrive={handleLogoutDrive}
                        driveFolders={driveFolders} selectedFolderId={selectedFolderId} setSelectedFolderId={setSelectedFolderId}
                        loadFolders={loadFolders} handleCreateFolder={handleCreateFolder}
                        showManualInput={showManualInput} setShowManualInput={setShowManualInput}
                        manualToken={manualToken} setManualToken={setManualToken}
                        handleManualTokenSave={handleManualTokenSave} getManualAuthUrl={getManualAuthUrl}
                    />
                </div>

                <div className="space-y-6">
                    <ExportForm
                        rangeStart={rangeStart} rangeEnd={rangeEnd} setRangeStart={setRangeStart} setRangeEnd={setRangeEnd}
                        totalAvailable={chapters.length} isExporting={isExporting} exportProgress={exportProgress}
                        onExport={handleStartExport} formatLabel={`${format.toUpperCase()} (${lang === 'vi' ? 'Tiếng Việt' : 'Tiếng Trung'})`} useDrive={useDrive}
                    />
                    <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start gap-3">
                        <ImageIcon className="w-4 h-4 text-amber-500 mt-1" />
                        <div className="text-[12px] text-muted-foreground leading-relaxed">
                            <span className="text-amber-500 font-bold mr-1">Lưu ý:</span>
                            Kiểm tra ảnh bìa ở tab Tổng quan để EPUB đẹp nhất.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

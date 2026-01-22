"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, AlertTriangle } from "lucide-react";
import { InspectionIssue } from "@/lib/gemini";

interface ReaderDialogsProps {
    // Correction Dialog
    correctionOpen: boolean;
    setCorrectionOpen: (open: boolean) => void;
    correctionOriginal: string;
    correctionReplacement: string;
    setCorrectionReplacement: (val: string) => void;
    handleSaveCorrection: () => void;

    // Dictionary Dialog
    dictDialogOpen: boolean;
    setDictDialogOpen: (open: boolean) => void;
    dictOriginal: string;
    setDictOriginal: (val: string) => void;
    dictTranslated: string;
    setDictTranslated: (val: string) => void;
    handleSaveDictionary: () => void;

    // Inspection Dialog
    activeIssue: InspectionIssue | null;
    setActiveIssue: (issue: InspectionIssue | null) => void;
    handleApplyFix: (issue: InspectionIssue, saveToCorrections: boolean) => void;
}

export function ReaderDialogs({
    correctionOpen, setCorrectionOpen,
    correctionOriginal, correctionReplacement, setCorrectionReplacement,
    handleSaveCorrection,
    dictDialogOpen, setDictDialogOpen,
    dictOriginal, setDictOriginal,
    dictTranslated, setDictTranslated,
    handleSaveDictionary,
    activeIssue, setActiveIssue,
    handleApplyFix
}: ReaderDialogsProps) {
    return (
        <>
            <Dialog open={correctionOpen} onOpenChange={setCorrectionOpen}>
                <DialogContent className="bg-popover border-border text-popover-foreground sm:max-w-[400px] z-[200]">
                    <DialogHeader>
                        <DialogTitle>Sửa lỗi & Tự động thay thế</DialogTitle>
                        <DialogDescription className="text-muted-foreground/60">
                            Quy tắc này sẽ được lưu lại để dùng cho tính năng sửa lỗi tự động sau này.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Từ sai (Đang chọn)</Label>
                            <Input value={correctionOriginal} disabled className="bg-muted border-border" />
                        </div>
                        <div className="flex justify-center text-muted-foreground/20">⬇</div>
                        <div className="space-y-2">
                            <Label>Từ đúng (Thay thế)</Label>
                            <Input
                                value={correctionReplacement}
                                onChange={(e) => setCorrectionReplacement(e.target.value)}
                                className="bg-background border-border"
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setCorrectionOpen(false)}>Hủy</Button>
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSaveCorrection}>Lưu & Áp dụng</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={dictDialogOpen} onOpenChange={setDictDialogOpen}>
                <DialogContent className="bg-popover border-border text-popover-foreground sm:max-w-[400px] z-[200]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-primary" />
                            Thêm vào Từ điển
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground/60">
                            Thêm từ mới để AI dịch chuẩn hơn trong tương lai.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Từ gốc (Trung/Việt)</Label>
                            <Input
                                value={dictOriginal}
                                onChange={(e) => setDictOriginal(e.target.value)}
                                className="bg-background border-border"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Nghĩa (Dịch)</Label>
                            <Input
                                value={dictTranslated}
                                onChange={(e) => setDictTranslated(e.target.value)}
                                className="bg-background border-border"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDictDialogOpen(false)}>Hủy</Button>
                        <Button
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={handleSaveDictionary}
                        >
                            Lưu từ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!activeIssue} onOpenChange={(v) => !v && setActiveIssue(null)}>
                <DialogContent className="bg-popover border-border text-popover-foreground sm:max-w-[400px] z-[200]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-primary">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Phát hiện vấn đề
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground/60">
                            AI phát hiện nội dung có thể cần chỉnh sửa.
                        </DialogDescription>
                    </DialogHeader>
                    {activeIssue && (
                        <div className="space-y-4 py-4">
                            <div className="p-3 bg-red-100/50 border border-red-200 rounded-lg">
                                <div className="text-xs text-red-600 font-bold uppercase mb-1">Nguyên văn (Lỗi)</div>
                                <div className="text-lg font-serif text-foreground">{activeIssue.original}</div>
                            </div>
                            <div className="flex justify-center text-muted-foreground/20">⬇</div>
                            <div className="p-3 bg-emerald-100/50 border border-emerald-200 rounded-lg">
                                <div className="text-xs text-emerald-600 font-bold uppercase mb-1">Gợi ý sửa</div>
                                <div className="text-lg font-bold text-emerald-800">{activeIssue.suggestion}</div>
                            </div>
                            <div className="text-sm text-muted-foreground italic border-l-2 border-border pl-3">
                                "{activeIssue.reason}"
                            </div>
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                                <Button
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={() => handleApplyFix(activeIssue, false)}
                                >
                                    Sửa ngay
                                </Button>
                                <Button
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => handleApplyFix(activeIssue, true)}
                                >
                                    Sửa & Lưu luật
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

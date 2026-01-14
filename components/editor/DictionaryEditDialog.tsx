"use client"

import { useState, useEffect } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BookA } from "lucide-react"
import { cn } from "@/lib/utils"

interface DictionaryEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialOriginal: string;
    initialTranslated?: string; // New prop
    onSaveSuccess: (original: string, translated: string, oldTranslated?: string) => void;
}

export function DictionaryEditDialog({
    open,
    onOpenChange,
    initialOriginal,
    initialTranslated = "",
    onSaveSuccess
}: DictionaryEditDialogProps) {
    const [original, setOriginal] = useState(initialOriginal)
    const [translated, setTranslated] = useState(initialTranslated)

    useEffect(() => {
        setOriginal(initialOriginal);
        // If initialTranslated is provided, use it (and clear original if needed, but simple overwrite is safer)
        if (initialTranslated) {
            setTranslated(initialTranslated);

            // Reverse Lookup: If triggered from Translated side (no Original), try to find Original from DB
            if (!initialOriginal && open) {
                db.dictionary.where("translated").equals(initialTranslated).first().then(entry => {
                    if (entry) {
                        setOriginal(entry.original);
                        // Also set "Old Meaning" correctly if we found it in DB
                        // But wait, initialTranslated IS the "Old Meaning" currently in text.
                        // So simple reverse lookup is enough to fill the Key.
                    }
                });
            }

        } else if (initialOriginal && open) {
            // Try to find existing entry only if we are starting from Original
            db.dictionary.where("original").equals(initialOriginal).first().then(entry => {
                if (entry) {
                    setTranslated(entry.translated);
                } else {
                    setTranslated("");
                }
            });
        }
    }, [initialOriginal, initialTranslated, open]);

    const handleSave = async () => {
        if (!translated) return;
        // Validation: Must have Original OR be in "Quick Fix" mode (initialTranslated exists)
        if (!original && !initialTranslated) return;

        try {
            // Priority: Prop > DB
            let oldTranslated = initialTranslated;

            // If we have an Original Key, standard dictionary update
            if (original) {
                const existing = await db.dictionary.where("original").equals(original).first();
                if (existing) {
                    if (!oldTranslated) oldTranslated = existing.translated;
                    await db.dictionary.update(existing.id!, { translated, createdAt: new Date() });
                } else {
                    await db.dictionary.add({
                        original,
                        translated,
                        type: 'term',
                        createdAt: new Date()
                    });
                }
            } else if (initialTranslated) {
                // "Quick Fix" Mode (No Original Key visible)
                // Attempt Reverse Lookup
                const existing = await db.dictionary.where("translated").equals(initialTranslated).first();
                if (existing) {
                    await db.dictionary.update(existing.id!, { translated, createdAt: new Date() });
                    setOriginal(existing.original);
                } else {
                    // Reverse Lookup FAILED -> Create a "Correction Rule" (Viet -> Viet)
                    /*
                       Logic:
                       original = Old Viet (e.g., "Cánh cửa")
                       translated = New Viet (e.g., "Cửa")
                       type = 'correction'
                    */
                    await db.dictionary.add({
                        original: initialTranslated, // Store OLD Viet as Key
                        translated: translated,      // Store NEW Viet as Value
                        type: 'correction',
                        createdAt: new Date()
                    });
                    console.log(`Saved correction rule: "${initialTranslated}" -> "${translated}"`);
                }
            }

            onOpenChange(false);
            onSaveSuccess(original || initialTranslated || "", translated, oldTranslated);
        } catch (e) {
            console.error("Failed to save dic entry", e);
            alert("Lỗi khi lưu từ điển");
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px] bg-[#1a0b2e] border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookA className="h-5 w-5 text-amber-500" />
                        Sửa Vietphrase
                    </DialogTitle>
                    <DialogDescription className="text-white/50">
                        Thêm hoặc sửa nghĩa của từ/cụm từ.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* 
                        Logic: 
                        1. Add Mode (!initialTranslated): ALWAYS show Original Input.
                        2. Edit Mode (initialTranslated): 
                           - Check DB for Original Key (Reverse Lookup).
                           - If FOUND: Hide Original Input (User request).
                           - If NOT FOUND: MUST show Original Input so user can add it (otherwise can't save to Dict).
                    */}
                    {(!initialTranslated || !original) && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <Label className="text-white/70">
                                {initialTranslated ? "Nhập Từ gốc (Để lưu vào Từ điển)" : "Từ gốc (Trung)"}
                                <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={original}
                                onChange={(e) => setOriginal(e.target.value)}
                                className={cn(
                                    "bg-[#2b2b40] border-white/10 text-white font-lora text-lg",
                                    !original && "ring-1 ring-red-500/50"
                                )}
                                placeholder={initialTranslated ? "Máy không tìm thấy gốc, vui lòng nhập..." : "Nhập/Paste từ gốc Tiếng Trung..."}
                                autoFocus={!original}
                            />
                        </div>
                    )}

                    {initialTranslated && original && (
                        // Hidden Original Key Indicator (Found from DB)
                        <div className="text-xs text-emerald-400 flex items-center gap-1">
                            <span className="opacity-50">Gốc:</span> {original}
                        </div>
                    )}

                    {initialTranslated && (
                        <div className="space-y-2">
                            <Label className="text-white/50 text-xs uppercase">Nghĩa cũ (Hiện tại)</Label>
                            <div className="p-2 rounded bg-white/5 border border-white/10 text-white/60 font-lora line-through decoration-white/30 truncate">
                                {initialTranslated}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="text-white/70">Nghĩa mới (Sửa thành) <span className="text-red-500">*</span></Label>
                        <Input
                            value={translated}
                            onChange={(e) => setTranslated(e.target.value)}
                            className="bg-[#2b2b40] border-white/10 text-white font-lora text-lg focus-visible:ring-amber-500"
                            placeholder="Nhập nghĩa mới..."
                            autoFocus={true} // Always focus here in Quick Fix mode
                            onKeyDown={(e) => e.key === "Enter" && handleSave()}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <div className="flex-1 text-xs text-red-400 flex items-center">
                        {(!original && !initialTranslated) && "Thiếu từ gốc"}
                        {!translated && "Thiếu nghĩa mới"}
                    </div>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/10 text-white/70 bg-transparent hover:bg-white/5 hover:text-white">Hủy</Button>
                    <Button
                        onClick={handleSave}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                        disabled={!translated || (!original && !initialTranslated)}
                    >
                        Lưu {(!original && initialTranslated) ? "(Lưu Quy Tắc Sửa Lỗi)" : "(Enter)"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

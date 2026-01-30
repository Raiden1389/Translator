import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Check, X } from 'lucide-react';

interface SelectorPreviewProps {
    selector: string;
    chapters: Array<{ title: string; url: string }>;
    onConfirm: () => void;
    onReject: () => void;
}

export function SelectorPreview({ selector, chapters, onConfirm, onReject }: SelectorPreviewProps) {
    const [showPreview, setShowPreview] = useState(false);

    return (
        <div className="space-y-3 p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 animate-in fade-in zoom-in-95">
            {/* AI Detection Success */}
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                    ✨ AI đã phát hiện selector!
                </span>
            </div>

            {/* Selector Display */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Selector Liên Kết Chương (CSS)
                </label>
                <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-black/5 dark:bg-white/5 rounded border text-sm font-mono">
                        {selector}
                    </code>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowPreview(!showPreview)}
                        className="shrink-0"
                    >
                        {showPreview ? (
                            <>
                                <EyeOff className="w-4 h-4 mr-2" />
                                Ẩn
                            </>
                        ) : (
                            <>
                                <Eye className="w-4 h-4 mr-2" />
                                Xem trước
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Preview List */}
            {showPreview && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Danh sách chương ({chapters.length} chương)
                    </div>
                    <div className="max-h-[200px] overflow-y-auto bg-white/50 dark:bg-black/20 rounded border p-3 space-y-1">
                        {chapters.slice(0, 10).map((ch, i) => (
                            <div key={i} className="text-xs flex items-start gap-2">
                                <span className="text-muted-foreground shrink-0 w-8">#{i + 1}</span>
                                <span className="flex-1 truncate">{ch.title}</span>
                            </div>
                        ))}
                        {chapters.length > 10 && (
                            <div className="text-xs text-muted-foreground italic pt-2 border-t">
                                ... và {chapters.length - 10} chương khác
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t">
                <Button
                    onClick={onConfirm}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                >
                    <Check className="w-4 h-4 mr-2" />
                    Xác nhận ({chapters.length} chương)
                </Button>
                <Button
                    onClick={onReject}
                    variant="outline"
                    size="sm"
                >
                    <X className="w-4 h-4 mr-2" />
                    Thử lại
                </Button>
            </div>
        </div>
    );
}

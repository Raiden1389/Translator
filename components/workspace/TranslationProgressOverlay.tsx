import React from "react";
import { RefreshCw, Circle, Loader2 } from "lucide-react";

interface TranslationProgressOverlayProps {
    isTranslating: boolean;
    progress: { current: number; total: number; currentTitle: string };
}

export function TranslationProgressOverlay({ isTranslating, progress }: TranslationProgressOverlayProps) {
    if (!isTranslating) return null;

    const percent = Math.round((progress.current / progress.total) * 100) || 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-300">
            {/* Subtle blocking layer to prevent accidental clicks while still showing the UI */}
            <div className="absolute inset-0 bg-black/5"></div>
            <div className="bg-[#1a0b2e] border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl space-y-8 relative overflow-hidden">
                {/* Background glow effects */}
                <div className="absolute -top-24 -left-24 h-48 w-48 bg-primary/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -right-24 h-48 w-48 bg-purple-500/10 rounded-full blur-3xl"></div>

                <div className="flex items-center justify-between relative">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/20 text-primary ring-1 ring-primary/20 scale-110">
                            <RefreshCw className="h-5 w-5 animate-spin" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Đang tiến hành dịch</h3>
                            <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">AI Processing</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black text-white font-mono tabular-nums leading-none">{percent}%</div>
                        <div className="text-[10px] text-white/30 font-bold mt-1 uppercase tracking-tighter">
                            {progress.current} / {progress.total} chương
                        </div>
                    </div>
                </div>

                <div className="space-y-4 relative">
                    <div className="flex justify-between items-end px-1">
                        <div className="space-y-1 max-w-[70%]">
                            <div className="text-[10px] text-primary/60 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                <Circle className="h-1.5 w-1.5 fill-primary animate-pulse" />
                                Current Task
                            </div>
                            <p className="text-white font-medium text-sm truncate leading-none">
                                {progress.currentTitle}
                            </p>
                        </div>
                        <div className="text-white/30 italic text-[10px] font-medium flex items-center gap-1 bg-white/5 py-1 px-2 rounded-full border border-white/5">
                            <Loader2 className="h-2 w-2 animate-spin" /> Vui lòng chờ...
                        </div>
                    </div>

                    <div className="relative h-4 bg-white/5 rounded-full p-1 border border-white/10 overflow-hidden group">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-primary via-purple-500 to-primary background-animate transition-all duration-700 ease-in-out relative"
                            style={{ width: `${percent}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            <div className="absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-white/30 to-transparent blur-sm"></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-1 backdrop-blur-md">
                            <div className="text-[10px] text-white/30 font-bold uppercase leading-none">Status</div>
                            <div className="text-sm font-bold text-green-400">Đang hoạt động</div>
                        </div>
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-1 backdrop-blur-md">
                            <div className="text-[10px] text-white/30 font-bold uppercase leading-none">Threads</div>
                            <div className="text-sm font-bold text-emerald-400">3 Workers Active</div>
                        </div>
                    </div>
                </div>

                <p className="text-center text-[11px] text-white/20 italic font-medium pt-2 border-t border-white/5">
                    Hệ thống đang sử dụng Gemini và xử lý song song để tối ưu tốc độ.
                </p>
            </div>
        </div>
    );
}

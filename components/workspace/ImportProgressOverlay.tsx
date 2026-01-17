import React from "react";
import { Loader2 } from "lucide-react";

interface ImportProgressOverlayProps {
    importing: boolean;
    progress: number;
    importStatus: string;
}

export function ImportProgressOverlay({ importing, progress, importStatus }: ImportProgressOverlayProps) {
    if (!importing) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#1a0b2e] border border-white/10 p-8 rounded-2xl max-w-md w-full text-center space-y-6 shadow-2xl">
                <div className="relative inline-block">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                    <div className="h-20 w-20 flex items-center justify-center text-xl font-bold font-mono">
                        {progress}%
                    </div>
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">Đang nhập dữ liệu...</h3>
                    <p className="text-white/50 text-sm animate-pulse">{importStatus}</p>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                    <div
                        className="bg-primary h-full transition-all duration-300 ease-out shadow-[0_0_10px_theme(colors.primary.DEFAULT)]"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

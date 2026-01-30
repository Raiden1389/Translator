import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { X, ListChecks } from "lucide-react";

interface ChapterPreviewDialogProps {
    isOpen: boolean;
    onClose: () => void;
    chapters: Array<{ title: string; url: string }>;
}

export function ChapterPreviewDialog({ isOpen, onClose, chapters }: ChapterPreviewDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl p-0 overflow-hidden border-none bg-background/90 backdrop-blur-2xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] rounded-[40px] animate-in zoom-in-95 duration-300 gap-0">
                <DialogHeader className="p-10 pb-6 bg-linear-to-b from-primary/5 to-transparent">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-3xl font-black tracking-tight text-foreground flex items-center gap-4">
                            <div className="w-14 h-14 rounded-[22px] bg-primary shadow-lg shadow-primary/20 flex items-center justify-center">
                                <ListChecks className="w-7 h-7 text-primary-foreground" />
                            </div>
                            <div className="flex flex-col">
                                <span>Table of Contents</span>
                                <span className="text-xs font-bold text-primary uppercase tracking-[0.3em] mt-1 opacity-70">
                                    {chapters.length} Chapters Found
                                </span>
                            </div>
                        </DialogTitle>
                        <Button
                            variant="secondary"
                            size="icon"
                            onClick={onClose}
                            className="h-12 w-12 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-sm"
                        >
                            <X className="h-6 w-6" />
                        </Button>
                    </div>
                </DialogHeader>

                <ScrollArea className="h-[500px] px-10 custom-scrollbar border-y border-border/10">
                    <div className="grid grid-cols-1 gap-2 py-8">
                        {chapters.map((chapter, index) => (
                            <div
                                key={index}
                                className="group flex items-center gap-6 p-5 rounded-[24px] hover:bg-primary/5 border border-transparent hover:border-primary/10 transition-all duration-300"
                            >
                                <div className="text-xs font-black font-mono text-muted-foreground/30 min-w-[40px] group-hover:text-primary transition-colors flex flex-col items-center">
                                    <span className="text-[10px] opacity-50 uppercase mb-0.5">CH</span>
                                    {(index + 1).toString().padStart(3, '0')}
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-foreground/80 group-hover:text-foreground transition-colors line-clamp-1 mb-1">
                                        {chapter.title || 'Untitled Chapter'}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground/40 font-medium truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                        {chapter.url}
                                    </div>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-primary/10 group-hover:bg-primary transition-colors" />
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <div className="p-10 bg-muted/30 backdrop-blur-md">
                    <Button
                        onClick={onClose}
                        className="w-full h-16 rounded-[24px] font-black text-lg bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 transition-all active:scale-[0.98] border-t border-white/10"
                    >
                        Return to Workspace
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

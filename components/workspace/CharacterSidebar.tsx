
import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Search, ChevronRight, User } from "lucide-react";
import { AnalyzedEntity, analyzeEntities } from "@/lib/gemini";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CharacterSidebarProps {
    workspaceId: string;
    chapterId: string;
    chapterContent: string;
    onHighlight: (name: string) => void;
    currentHighlight: string;
    isOpen: boolean;
    onToggle: () => void;
}

export function CharacterSidebar({
    workspaceId,
    chapterId,
    chapterContent,
    onHighlight,
    currentHighlight,
    isOpen,
    onToggle
}: CharacterSidebarProps) {
    const [analyzing, setAnalyzing] = useState(false);

    // Fetch characters from dictionary
    const characters = useLiveQuery(() =>
        db.dictionary.where("[workspaceId+type]").equals([workspaceId, "character"]).toArray().catch(() =>
            // Fallback if index missing or error
            db.dictionary.where("workspaceId").equals(workspaceId).and(d => d.type === "character").toArray()
        ),
        [workspaceId]
    ) || [];

    // Local scan state
    const handleScan = async () => {
        if (!chapterContent) return;
        setAnalyzing(true);
        try {
            const results = await analyzeEntities(workspaceId, chapterContent);

            // Get existing originals for deduplication
            const existingEntries = await db.dictionary.where({ workspaceId }).toArray();
            const existingOriginals = new Set(existingEntries.map(e => e.original.toLowerCase().trim()));

            const newEntities = results
                .filter(item => !existingOriginals.has(item.src.toLowerCase().trim()))
                .map(item => ({
                    workspaceId,
                    original: item.src,
                    translated: item.dest,
                    type: 'character',
                    metadata: { reason: item.reason, gender: item.metadata?.gender, category: item.category },
                    createdAt: new Date()
                }));

            if (newEntities.length > 0) {
                await db.dictionary.bulkAdd(newEntities);
                toast.success(`Đã tìm thấy và thêm ${newEntities.length} nhân vật mới!`);
            } else {
                toast.info("Không tìm thấy nhân vật mới nào.");
            }
        } catch (e) {
            console.error(e);
            toast.error("Lỗi khi quét nhân vật.");
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className={cn(
            "bg-[#1e1e2e] border-l border-white/10 flex flex-col transition-all duration-300 overflow-hidden",
            isOpen ? "w-[250px] opacity-100" : "w-0 opacity-0 border-l-0"
        )}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#2b2b40]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-400" /> Nhân vật
                </h3>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onToggle}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Quick Scan */}
            <div className="p-4 border-b border-white/10">
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10 text-xs"
                    onClick={handleScan}
                    disabled={analyzing}
                >
                    {analyzing ? "Đang quét..." : "Quét chương này"}
                    {!analyzing && <Search className="ml-2 h-3 w-3" />}
                </Button>
            </div>

            <ScrollArea className="flex-1 p-2">
                <div className="space-y-2">
                    {characters.map((char) => (
                        <div
                            key={char.id}
                            className={cn(
                                "p-2 rounded bg-white/5 border border-white/5 hover:bg-white/10 cursor-pointer transition-colors group",
                                currentHighlight === char.original && "bg-purple-500/20 border-purple-500/50"
                            )}
                            onClick={() => onHighlight(char.original)}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[10px] font-bold text-white">
                                    {char.translated.charAt(0)}
                                </div>
                                <div className="font-bold text-sm text-white/90 truncate">{char.translated}</div>
                            </div>
                            <div className="text-xs text-white/50 pl-8 truncate">{char.original}</div>
                            {char.metadata?.gender && (
                                <div className="text-[10px] text-white/30 pl-8 mt-1 italic uppercase">{char.metadata.gender}</div>
                            )}
                        </div>
                    ))}
                    {characters.length === 0 && (
                        <div className="text-center text-white/30 text-xs py-10">
                            Chưa có dữ liệu nhân vật.
                            <br />Hãy thử "Quét" chương này!
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

"use client";

import React, { useState, useRef } from "react"
// Table imports removed as they are no longer used with div-based grid
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Trash2, Pencil, UserPlus, BookPlus, Check, X } from "lucide-react"
import { TermCandidate, TermType } from "@/lib/services/name-hunter/types"
import { useVirtualizer } from "@tanstack/react-virtual"

interface CandidateTableProps {
    candidates: TermCandidate[];
    onRemove: (id: string) => void;
    onAdd: (candidate: TermCandidate, targetType: 'character' | 'term') => void;
    onBatchRemove?: (ids: string[]) => void;
    onEdit: (id: string, newOriginal: string) => void;
    onTypeChange: (id: string, newType: TermType) => void;
}

export function CandidateTable({
    candidates,
    onRemove,
    onAdd,
    onBatchRemove,
    onEdit,
    onTypeChange
}: CandidateTableProps) {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");

    // Virtualization setup
    const parentRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: candidates.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 52, // Typical row height
        overscan: 10,
    });

    const toggleSelect = (id: string) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
    };

    const toggleSelectAll = () => {
        if (selected.size === candidates.length && candidates.length > 0) {
            setSelected(new Set());
        } else {
            setSelected(new Set(candidates.map(c => c.id)));
        }
    };

    const handleBatchRemove = () => {
        const toRemove = Array.from(selected);
        if (onBatchRemove) {
            onBatchRemove(toRemove);
        } else {
            toRemove.forEach(id => onRemove(id));
        }
        setSelected(new Set());
    };

    const startEdit = (candidate: TermCandidate) => {
        setEditingId(candidate.id);
        setEditText(candidate.original);
    };

    const saveEdit = (id: string) => {
        const candidate = candidates.find(c => c.id === id);
        if (candidate && editText.trim() && editText !== candidate.original) {
            onEdit(id, editText.trim());
        }
        setEditingId(null);
    };

    const cycleType = (candidate: TermCandidate) => {
        const types = [TermType.Person, TermType.Location, TermType.Organization, TermType.Skill, TermType.Unknown];
        const currentType = candidate.type || TermType.Unknown;
        const currentIndex = types.indexOf(currentType);
        const nextIndex = (currentIndex + 1) % types.length;
        onTypeChange(candidate.id, types[nextIndex]);
    };

    return (
        <div className="flex flex-col gap-2 relative h-full min-h-0">
            {selected.size > 0 && (
                <div className="flex items-center justify-between bg-primary/10 px-4 py-3 rounded-md border border-primary/20 backdrop-blur-sm shadow-md animate-in slide-in-from-top-2 mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-primary">{selected.size} đã chọn</span>
                        <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} className="h-auto py-0 text-xs text-muted-foreground hover:text-primary">
                            Bỏ chọn
                        </Button>
                    </div>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBatchRemove}
                        className="gap-2 h-8"
                    >
                        <Trash2 className="h-4 w-4" />
                        Xóa vĩnh viễn (Blacklist)
                    </Button>
                </div>
            )}

            <div
                ref={parentRef}
                className="rounded-md border bg-card overflow-auto h-full"
                style={{ contain: 'strict' }}
            >
                <div className="bg-background sticky top-0 z-20 border-b flex items-center font-medium text-muted-foreground text-xs uppercase tracking-wider h-10 px-2 shadow-sm">
                    <div className="w-[48px] px-2 text-center">
                        <Checkbox
                            checked={candidates.length > 0 && selected.size === candidates.length}
                            onCheckedChange={toggleSelectAll}
                        />
                    </div>
                    <div className="flex-1 px-2">Thực thể</div>
                    <div className="w-[220px] px-2 shrink-0">Hán Việt/Gốc</div>
                    <div className="w-[120px] px-2 shrink-0">Phân loại</div>
                    <div className="w-[60px] px-2 text-center shrink-0">Tần suất</div>
                    <div className="w-[140px] px-2 text-right shrink-0">Hành động</div>
                </div>
                <div className="relative" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
                    {candidates.length === 0 ? (
                        <div className="h-32 flex items-center justify-center text-muted-foreground italic">
                            Không có dữ liệu thực thể nào được tìm thấy.
                        </div>
                    ) : (
                        rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const candidate = candidates[virtualRow.index];
                            return (
                                <div
                                    key={candidate.id}
                                    data-index={virtualRow.index}
                                    ref={rowVirtualizer.measureElement}
                                    className={`group absolute top-0 left-0 w-full flex items-center border-b hover:bg-muted/30 transition-colors ${selected.has(candidate.id) ? 'bg-primary/5' : ''}`}
                                    style={{
                                        height: '52px',
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                >
                                    <div className="w-[48px] p-2 text-center shrink-0">
                                        <Checkbox
                                            checked={selected.has(candidate.id)}
                                            onCheckedChange={() => toggleSelect(candidate.id)}
                                        />
                                    </div>
                                    <div className="p-2 font-medium flex-1 truncate">
                                        {editingId === candidate.id ? (
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    value={editText}
                                                    onChange={(e) => setEditText(e.target.value)}
                                                    className="h-8 py-0"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') saveEdit(candidate.id);
                                                        if (e.key === 'Escape') setEditingId(null);
                                                    }}
                                                />
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => saveEdit(candidate.id)}>
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => setEditingId(null)}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div
                                                className="flex items-center gap-2 cursor-pointer group/item truncate"
                                                onClick={() => startEdit(candidate)}
                                            >
                                                <span className="truncate">{candidate.original}</span>
                                                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2 w-[220px] shrink-0 truncate">
                                        <div className="flex flex-col truncate">
                                            <span className="font-serif text-base truncate">{candidate.chinese || '-'}</span>
                                            {candidate.metadata?.hanviet && (
                                                <span className="text-[10px] text-muted-foreground italic truncate">
                                                    P.âm: {candidate.metadata.hanviet}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-2 w-[120px] shrink-0">
                                        <div
                                            className="flex items-center gap-2 cursor-pointer select-none active:scale-95 transition-transform"
                                            onClick={() => cycleType(candidate)}
                                            title="Bấm để đổi loại"
                                        >
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${candidate.type === TermType.Person ? 'bg-blue-100 text-blue-800' :
                                                candidate.type === TermType.Location ? 'bg-green-100 text-green-800' :
                                                    candidate.type === TermType.Organization ? 'bg-purple-100 text-purple-800' :
                                                        candidate.type === TermType.Skill ? 'bg-orange-100 text-orange-800' :
                                                            candidate.type === TermType.Junk ? 'bg-red-100 text-red-800' :
                                                                'bg-gray-100 text-gray-800'
                                                }`}>
                                                {candidate.type === TermType.Person ? 'Nhân vật' :
                                                    candidate.type === TermType.Location ? 'Địa danh' :
                                                        candidate.type === TermType.Organization ? 'Tổ chức' :
                                                            candidate.type === TermType.Skill ? 'Công pháp' :
                                                                candidate.type === TermType.Junk ? 'Rác' : 'Chung'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-2 w-[60px] text-center font-mono text-xs shrink-0">{candidate.count}</div>
                                    <div className="p-2 w-[140px] text-right shrink-0">
                                        <div className="flex items-center justify-end gap-1">
                                            {selected.size === 0 ? (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 disabled:opacity-30 disabled:grayscale"
                                                        onClick={() => onAdd(candidate, 'character')}
                                                        title={candidate.type === TermType.Unknown ? "Vui lòng phân loại để thêm" : "Thêm vào Nhân vật"}
                                                        disabled={candidate.type === TermType.Unknown || candidate.type === TermType.Junk}
                                                    >
                                                        <UserPlus className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-30 disabled:grayscale"
                                                        onClick={() => onAdd(candidate, 'term')}
                                                        title={candidate.type === TermType.Unknown ? "Vui lòng phân loại để thêm" : "Thêm vào Từ điển"}
                                                        disabled={candidate.type === TermType.Unknown || candidate.type === TermType.Junk}
                                                    >
                                                        <BookPlus className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => onRemove(candidate.id)}
                                                        title="Bỏ qua"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground italic mr-2">Hàng loạt</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    )
}

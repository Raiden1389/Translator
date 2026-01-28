"use client";

import React, { useState, useRef } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Trash2, Pencil, UserPlus, BookPlus, Check, X } from "lucide-react"
import { TermCandidate, TermType } from "@/lib/services/name-hunter/types"
import { useVirtualizer } from "@tanstack/react-virtual"

interface CandidateTableProps {
    candidates: TermCandidate[];
    onRemove: (original: string) => void;
    onAdd: (candidate: TermCandidate, targetType: 'character' | 'term') => void;
    onBatchRemove?: (originals: string[]) => void;
    onEdit: (oldOriginal: string, newOriginal: string) => void;
    onTypeChange: (original: string, newType: TermType) => void;
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

    const toggleSelect = (original: string) => {
        const next = new Set(selected);
        if (next.has(original)) next.delete(original);
        else next.add(original);
        setSelected(next);
    };

    const toggleSelectAll = () => {
        if (selected.size === candidates.length && candidates.length > 0) {
            setSelected(new Set());
        } else {
            setSelected(new Set(candidates.map(c => c.original)));
        }
    };

    const handleBatchRemove = () => {
        const toRemove = Array.from(selected);
        if (onBatchRemove) {
            onBatchRemove(toRemove);
        } else {
            toRemove.forEach(original => onRemove(original));
        }
        setSelected(new Set());
    };

    const startEdit = (original: string) => {
        setEditingId(original);
        setEditText(original);
    };

    const saveEdit = (oldOriginal: string) => {
        if (editText.trim() && editText !== oldOriginal) {
            onEdit(oldOriginal, editText.trim());
        }
        setEditingId(null);
    };

    const cycleType = (candidate: TermCandidate) => {
        const types = [TermType.Person, TermType.Location, TermType.Organization, TermType.Skill, TermType.Unknown];
        const currentType = candidate.type || TermType.Unknown;
        const currentIndex = types.indexOf(currentType);
        const nextIndex = (currentIndex + 1) % types.length;
        onTypeChange(candidate.original, types[nextIndex]);
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
                <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                    <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                            <TableRow>
                                <TableHead className="w-[48px] p-2 text-center">
                                    <Checkbox
                                        checked={candidates.length > 0 && selected.size === candidates.length}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </TableHead>
                                <TableHead className="p-2">Tên (Vietphrase)</TableHead>
                                <TableHead className="p-2 w-[220px]">Hán Việt/Gốc</TableHead>
                                <TableHead className="p-2 w-[120px]">Phân loại</TableHead>
                                <TableHead className="p-2 w-[60px]">T.suất</TableHead>
                                <TableHead className="p-2 w-[140px] text-right">Hành động</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {candidates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                                        Không có dữ liệu thực thể nào được tìm thấy.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                    const candidate = candidates[virtualRow.index];
                                    return (
                                        <TableRow
                                            key={candidate.original}
                                            data-index={virtualRow.index}
                                            ref={rowVirtualizer.measureElement}
                                            className={`group absolute top-0 left-0 w-full flex items-center border-b ${selected.has(candidate.original) ? 'bg-primary/5' : ''}`}
                                            style={{
                                                transform: `translateY(${virtualRow.start}px)`,
                                            }}
                                        >
                                            <TableCell className="w-[48px] p-2 text-center shrink-0">
                                                <Checkbox
                                                    checked={selected.has(candidate.original)}
                                                    onCheckedChange={() => toggleSelect(candidate.original)}
                                                />
                                            </TableCell>
                                            <TableCell className="p-2 font-medium flex-1 truncate">
                                                {editingId === candidate.original ? (
                                                    <div className="flex items-center gap-1">
                                                        <Input
                                                            value={editText}
                                                            onChange={(e) => setEditText(e.target.value)}
                                                            className="h-8 py-0"
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') saveEdit(candidate.original);
                                                                if (e.key === 'Escape') setEditingId(null);
                                                            }}
                                                        />
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => saveEdit(candidate.original)}>
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => setEditingId(null)}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="flex items-center gap-2 cursor-pointer group/item truncate"
                                                        onClick={() => startEdit(candidate.original)}
                                                    >
                                                        <span className="truncate">{candidate.original}</span>
                                                        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0" />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="p-2 w-[220px] shrink-0">
                                                <div className="flex flex-col truncate">
                                                    <span className="font-serif text-base truncate">{candidate.chinese || '-'}</span>
                                                    {candidate.metadata?.hanviet && (
                                                        <span className="text-[10px] text-muted-foreground italic truncate">
                                                            P.âm: {candidate.metadata.hanviet}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-2 w-[120px] shrink-0">
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
                                            </TableCell>
                                            <TableCell className="p-2 w-[60px] text-center font-mono text-xs shrink-0">{candidate.count}</TableCell>
                                            <TableCell className="p-2 w-[140px] text-right shrink-0">
                                                <div className="flex items-center justify-end gap-1">
                                                    {selected.size === 0 ? (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                                onClick={() => onAdd(candidate, 'character')}
                                                                title="Thêm vào Nhân vật"
                                                            >
                                                                <UserPlus className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"
                                                                onClick={() => onAdd(candidate, 'term')}
                                                                title="Thêm vào Từ điển"
                                                            >
                                                                <BookPlus className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => onRemove(candidate.original)}
                                                                title="Bỏ qua"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <span className="text-[10px] text-muted-foreground italic mr-2">Hàng loạt</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}

"use client";

import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { HeuristicTerm } from "@/lib/db";
import { HeuristicTermItem } from "./HeuristicTermItem";
import { Layers } from "lucide-react";

interface HeuristicTermListProps {
    terms: HeuristicTerm[];
    isScanning: boolean;
    onApprove: (id: number) => void;
    onDelete: (id: number) => void;
}

export function HeuristicTermList({ terms, isScanning, onApprove, onDelete }: HeuristicTermListProps) {
    const parentRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: terms.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 88, // Height of HeuristicTermItem + margin
        overscan: 10,
    });

    if (terms.length === 0 && !isScanning) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-10 bg-muted/5 border border-dashed border-border/40 rounded-[32px] opacity-40">
                <Layers className="w-10 h-10 mb-4 text-muted-foreground/20" />
                <p className="text-sm font-bold uppercase tracking-widest">Không có kết quả thỏa mãn bộ lọc</p>
                <p className="text-[10px] mt-1">Hãy thử đổi từ khóa hoặc điều chỉnh radar</p>
            </div>
        );
    }

    return (
        <div
            ref={parentRef}
            className="flex-1 overflow-auto rounded-[32px] bg-muted/5 border border-border/20 p-4 custom-scrollbar shadow-inner"
        >
            <div
                style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const term = terms[virtualRow.index];
                    if (!term) return null;

                    return (
                        <div
                            key={virtualRow.key}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            <HeuristicTermItem
                                term={term}
                                isScanning={isScanning}
                                onApprove={onApprove}
                                onDelete={onDelete}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

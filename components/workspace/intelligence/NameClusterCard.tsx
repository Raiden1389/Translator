"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NameCluster } from "@/lib/services/name-audit.types";

interface NameClusterCardProps {
    cluster: NameCluster;
    selectedCanonical?: string;
    onSelectCanonical: (clusterId: string, canonicalName: string) => void;
    onDismiss: (clusterId: string) => void;
    onConvertChapter?: (chapterId: number) => void;
}

export function NameClusterCard({
    cluster,
    selectedCanonical,
    onSelectCanonical,
    onDismiss,
    onConvertChapter,
}: NameClusterCardProps) {
    const [expanded, setExpanded] = useState(cluster.isInconsistent);


    const maxCount = Math.max(...cluster.variants.map(v => v.count));
    const canonical = selectedCanonical;
    const displayCanonical = selectedCanonical ?? cluster.suggestedCanonical;

    const confidenceColor = cluster.confidence >= 0.8
        ? "bg-emerald-500"
        : cluster.confidence >= 0.6
            ? "bg-amber-500"
            : "bg-red-500";

    const confidenceLabel = cluster.confidence >= 0.8
        ? "Cao"
        : cluster.confidence >= 0.6
            ? "TB"
            : "Thấp";

    return (
        <div className={cn(
            "border rounded-xl transition-all duration-150",
            cluster.isInconsistent
                ? "border-amber-500/30 bg-amber-500/2"
                : "border-border/40 bg-background/50",
            selectedCanonical && "border-emerald-500/30 bg-emerald-500/2"
        )}>
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left group"
            >
                {expanded
                    ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                }

                {/* Chinese source badge */}
                {cluster.chineseName && (
                    <span className="shrink-0 text-xs font-mono bg-muted/50 border border-border/40 rounded-md px-2 py-0.5">
                        {cluster.chineseName}
                        <span className="text-muted-foreground ml-1">({cluster.hanViet})</span>
                    </span>
                )}

                {/* Canonical name */}
                <span className="font-bold text-sm text-foreground truncate">
                    {displayCanonical}
                </span>

                {/* Stats */}
                <span className="text-xs text-muted-foreground ml-auto shrink-0 flex items-center gap-2">
                    {cluster.isInconsistent && (
                        <span className="text-amber-600 font-semibold">
                            {cluster.variants.length} biến thể
                        </span>
                    )}
                    <span>{cluster.totalOccurrences}×</span>
                    <span className={cn("w-2 h-2 rounded-full shrink-0", confidenceColor)}
                        title={`Confidence: ${Math.round(cluster.confidence * 100)}% (${confidenceLabel})`}
                    />
                </span>
            </button>

            {/* Expanded content */}
            {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-border/20 pt-3">
                    {/* Variants with frequency bars */}
                    <div className="space-y-2">
                        {cluster.variants.map((variant) => {
                            const barWidth = Math.round((variant.count / maxCount) * 100);
                            const isSelected = canonical === variant.name;

                            return (
                                <div key={variant.name} className="space-y-1">
                                    <label className="flex items-center gap-2 cursor-pointer group/variant">
                                        {cluster.isInconsistent && (
                                            <input
                                                type="radio"
                                                name={`canonical-${cluster.id}`}
                                                checked={isSelected}
                                                onChange={() => onSelectCanonical(cluster.id, variant.name)}
                                                className="accent-emerald-500 shrink-0"
                                            />
                                        )}
                                        <span className={cn(
                                            "text-sm font-medium min-w-[120px]",
                                            isSelected ? "text-emerald-600" : "text-foreground"
                                        )}>
                                            {variant.name}
                                        </span>

                                        {/* Frequency bar */}
                                        <div className="flex-1 h-5 bg-muted/30 rounded-md overflow-hidden relative">
                                            <div
                                                className={cn(
                                                    "h-full rounded-md transition-all duration-150",
                                                    isSelected
                                                        ? "bg-emerald-500/20"
                                                        : "bg-primary/10"
                                                )}
                                                style={{ width: `${barWidth}%` }}
                                            />
                                            <span className="absolute right-2 top-0.5 text-[10px] text-muted-foreground font-medium">
                                                {variant.count}×
                                            </span>
                                        </div>

                                        {/* Chapter range + Convert button */}
                                        <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                                            ch.{variant.chapters[0]}–{variant.chapters[variant.chapters.length - 1]}
                                        </span>

                                        {onConvertChapter && variant.sourceRefs[0]?.chapterId && (
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    onConvertChapter(variant.sourceRefs[0].chapterId!);
                                                }}
                                                className="shrink-0 p-1 rounded hover:bg-muted/50 transition-colors"
                                                title="Đọc chương gốc (VP/HanViet)"
                                            >
                                                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                                            </button>
                                        )}
                                    </label>
                                </div>
                            );
                        })}
                    </div>

                    {/* Context samples */}
                    {cluster.variants.some(variant => variant.contexts.length > 0) && (
                        <div className="text-xs text-muted-foreground space-y-0.5 pt-1 border-t border-border/20">
                            <span className="font-semibold text-[10px] uppercase tracking-wider">Ngữ cảnh</span>
                            {cluster.variants.slice(0, 3).map((variant) =>
                                variant.contexts[0] ? (
                                    <p key={variant.name} className="italic truncate">
                                        <span className="not-italic font-medium text-foreground">{variant.name}:</span>{" "}
                                        &ldquo;{variant.contexts[0]}&rdquo;
                                    </p>
                                ) : null
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    {cluster.isInconsistent && (
                        <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                                onClick={() => onDismiss(cluster.id)}
                                className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/30 transition-colors"
                            >
                                Bỏ qua (không cùng người)
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

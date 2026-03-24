"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Lock, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TermCluster } from "@/lib/services/term-audit.types";
import { confidenceTier } from "@/lib/services/term-audit.clustering";

interface TermClusterCardProps {
    cluster: TermCluster;
    /** currently chosen canonical (from confirmedFixes map) */
    selectedCanonical?: string;
    onSelectCanonical: (clusterId: string, canonical: string | null) => void;
}

export function TermClusterCard({
    cluster,
    selectedCanonical,
    onSelectCanonical,
}: TermClusterCardProps) {
    const [expanded, setExpanded] = useState(
        cluster.clusterMode === "auto" && cluster.isInconsistent
    );
    const [showReasons, setShowReasons] = useState(false);

    const isProtected = cluster.clusterMode === "protected-related";
    const isReview = cluster.clusterMode === "review";
    const isConfirmed = !!selectedCanonical;
    const tier = confidenceTier(cluster.confidence);

    const maxCount = Math.max(...cluster.variants.map(v => v.count));

    const badgeColor = {
        high: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
        medium: "bg-amber-500/15 text-amber-700 border-amber-500/30",
        low: "bg-red-500/15 text-red-700 border-red-500/30",
    }[tier];

    const dotColor = {
        high: "bg-emerald-500",
        medium: "bg-amber-500",
        low: "bg-red-400",
    }[tier];

    const cardBorder = isConfirmed
        ? "border-emerald-500/40 bg-emerald-500/3"
        : isProtected
            ? "border-border/20 bg-muted/20"
            : isReview
                ? "border-blue-500/20 bg-blue-500/2"
                : cluster.isInconsistent
                    ? "border-amber-500/30 bg-amber-500/2"
                    : "border-border/30 bg-background/50";

    return (
        <div className={cn("border rounded-xl transition-all duration-150", cardBorder)}>
            {/* ── Header ── */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left group"
            >
                {expanded
                    ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                }

                {/* Mode badge */}
                {isProtected && (
                    <span className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted/40 border border-border/30 rounded-md px-1.5 py-0.5">
                        <Lock className="w-2.5 h-2.5" /> Bảo vệ
                    </span>
                )}
                {isReview && (
                    <span className="shrink-0 text-[10px] font-semibold text-blue-600 bg-blue-500/10 border border-blue-500/20 rounded-md px-1.5 py-0.5">
                        Xem lại
                    </span>
                )}

                {/* Canonical name */}
                <span className={cn(
                    "font-bold text-sm truncate",
                    isConfirmed ? "text-emerald-600" : "text-foreground"
                )}>
                    {selectedCanonical ?? cluster.suggestedCanonical}
                </span>

                {/* Stats row */}
                <span className="ml-auto shrink-0 flex items-center gap-2 text-xs text-muted-foreground">
                    {cluster.isInconsistent && !isProtected && (
                        <span className="text-amber-600 font-semibold">
                            {cluster.variants.length} biến thể
                        </span>
                    )}
                    <span>{cluster.totalOccurrences}×</span>
                    <span
                        className={cn("w-2 h-2 rounded-full shrink-0", dotColor)}
                        title={`Confidence: ${Math.round(cluster.confidence * 100)}% (${tier})`}
                    />
                </span>
            </button>

            {/* ── Expanded content ── */}
            {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-border/20 pt-3">
                    {/* Protected: show existing rule info */}
                    {isProtected && (cluster.relatedCorrection || cluster.relatedGlossary) && (
                        <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 flex items-start gap-2">
                            <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <div className="space-y-0.5">
                                {cluster.relatedCorrection && (
                                    <p>Cải chính: <span className="font-mono text-foreground">{cluster.relatedCorrection}</span></p>
                                )}
                                {cluster.relatedGlossary && (
                                    <p>Glossary: <span className="font-mono text-foreground">{cluster.relatedGlossary}</span></p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Variant list with frequency bars */}
                    <div className="space-y-2">
                        {cluster.variants.map(variant => {
                            const barWidth = Math.round((variant.count / maxCount) * 100);
                            const isSelected = selectedCanonical === variant.term;

                            return (
                                <div key={variant.term} className="space-y-1">
                                    <label className={cn(
                                        "flex items-center gap-2 cursor-pointer group/variant",
                                        isProtected && "cursor-default"
                                    )}>
                                        {/* Radio — only on auto clusters, not protected */}
                                        {cluster.isInconsistent && !isProtected && (
                                            <input
                                                type="radio"
                                                name={`term-canonical-${cluster.id}`}
                                                checked={isSelected}
                                                onChange={() => onSelectCanonical(cluster.id, variant.term)}
                                                className="accent-emerald-500 shrink-0"
                                            />
                                        )}

                                        <span className={cn(
                                            "text-sm font-medium min-w-[140px] font-mono",
                                            isSelected ? "text-emerald-600" : "text-foreground"
                                        )}>
                                            {variant.term}
                                        </span>

                                        {/* Frequency bar */}
                                        <div className="flex-1 h-5 bg-muted/30 rounded-md overflow-hidden relative">
                                            <div
                                                className={cn(
                                                    "h-full rounded-md transition-all duration-200",
                                                    isSelected ? "bg-emerald-500/25" : "bg-primary/10"
                                                )}
                                                style={{ width: `${barWidth}%` }}
                                            />
                                            <span className="absolute right-2 top-0.5 text-[10px] text-muted-foreground font-medium">
                                                {variant.count}×
                                            </span>
                                        </div>

                                        {/* Chapter range */}
                                        <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                                            ch.{variant.chapters[0]}
                                            {variant.chapters.length > 1 && `–${variant.chapters[variant.chapters.length - 1]}`}
                                        </span>
                                    </label>

                                    {/* Context snippet */}
                                    {variant.contexts[0] && (
                                        <p className="text-[10px] text-muted-foreground/70 italic truncate pl-7">
                                            &ldquo;{variant.contexts[0]}&rdquo;
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Confidence reasons (collapsible) */}
                    {cluster.reasons.length > 0 && (
                        <div className="border-t border-border/20 pt-2">
                            <button
                                onClick={() => setShowReasons(!showReasons)}
                                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showReasons
                                    ? <EyeOff className="w-3 h-3" />
                                    : <Eye className="w-3 h-3" />
                                }
                                Lý do gom nhóm
                                <span className={cn(
                                    "ml-1 px-1.5 py-0.5 rounded border text-[9px] font-semibold",
                                    badgeColor
                                )}>
                                    {Math.round(cluster.confidence * 100)}%
                                </span>
                            </button>

                            {showReasons && (
                                <div className="mt-1.5 space-y-0.5">
                                    {cluster.reasons.map((r, i) => (
                                        <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                            <span className="font-mono text-foreground/60 w-24 shrink-0">{r.signal}</span>
                                            <div className="flex-1 h-1 bg-muted/30 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary/40 rounded-full"
                                                    style={{ width: `${Math.round(r.score * 100)}%` }}
                                                />
                                            </div>
                                            <span className="w-8 text-right">{Math.round(r.score * 100)}%</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Review zone: un-confirm link */}
                    {isConfirmed && !isProtected && (
                        <div className="flex justify-end">
                            <button
                                onClick={() => onSelectCanonical(cluster.id, null)}
                                className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/30 transition-colors"
                            >
                                Bỏ chọn
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

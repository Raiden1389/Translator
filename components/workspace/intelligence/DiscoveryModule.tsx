"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHeuristic } from "../hooks/useHeuristic";
import { toast } from "sonner";
import { HeuristicScanner } from "./HeuristicScanner";
import { HeuristicFilters } from "./HeuristicFilters";
import { HeuristicTermList } from "./HeuristicTermList";
import { useHeuristicStats } from "../hooks/useHeuristicStats";
import { analyzeHeuristicResults, type ForensicReport } from "@/lib/gemini/heuristic/forensic-analyzer";

interface DiscoveryModuleProps {
    workspaceId: string;
}

export function DiscoveryModule({ workspaceId }: DiscoveryModuleProps) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved'>('pending');
    const [freqFilter, setFreqFilter] = useState<number | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, message: "" });
    const [scanTimeout, setScanTimeout] = useState<NodeJS.Timeout | null>(null);

    const scanStateRef = useRef<{
        isActive: boolean;
        abortController: AbortController | null;
    }>({
        isActive: false,
        abortController: null,
    });

    // Only abort scan if workspace CHANGES (not on tab switch/unmount)
    const prevWorkspaceRef = useRef(workspaceId);
    useEffect(() => {
        if (prevWorkspaceRef.current !== workspaceId) {
            // Workspace changed — abort any running scan from OLD workspace
            scanStateRef.current.abortController?.abort();
            scanStateRef.current.isActive = false;
            prevWorkspaceRef.current = workspaceId;
        }
        return () => {
            // Cleanup timeout only — DO NOT abort scan on unmount
            // This allows scan to continue running in background when user switches tabs
            if (scanTimeout) clearTimeout(scanTimeout);
        };
    }, [workspaceId, scanTimeout]);

    const { startScan, runAiRefine, approveTerm, deleteTerm, approveAll } = useHeuristic(workspaceId);
    const [isRefining, setIsRefining] = useState(false);

    const rawTermsInternal = useLiveQuery(
        () => db.heuristicTerms.where('workspaceId').equals(workspaceId).toArray(),
        [workspaceId]
    );
    const rawTerms = useMemo(() => rawTermsInternal || [], [rawTermsInternal]);

    const stats = useHeuristicStats(rawTerms);

    const blacklist = useLiveQuery(
        async () => {
            const allItems = await db.blacklist.where('workspaceId').equals(workspaceId).toArray();
            return allItems.filter(b => b.source === 'heuristic');
        },
        [workspaceId]
    );

    const forensicReport = useMemo<ForensicReport | null>(() => {
        if (rawTerms.length === 0) return null;
        const approved = rawTerms.filter(t => t.isApproved);
        return analyzeHeuristicResults(rawTerms, approved);
    }, [rawTerms]);

    // Filtering Logic
    const filteredTerms = useMemo(() => {
        return rawTerms.filter(t => {
            // Search
            const matchesSearch = !search ||
                t.original.toLowerCase().includes(search.toLowerCase()) ||
                t.translated?.toLowerCase().includes(search.toLowerCase());

            // Status
            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'pending' && !t.isApproved) ||
                (statusFilter === 'approved' && t.isApproved);

            // Frequency
            const matchesFreq = freqFilter === null || t.occurrences === freqFilter;

            return matchesSearch && matchesStatus && matchesFreq;
        }).sort((a, b) => {
            // Priority: occurrences desc, then confidence desc
            if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
            return b.confidence - a.confidence;
        });
    }, [rawTerms, search, statusFilter, freqFilter]);

    const handleScan = async () => {
        if (scanStateRef.current.isActive) {
            toast.warning("Radar đang bận quét, sếp vui lòng chờ...");
            return;
        }

        const toastId = "radar-scan-toast";
        toast.loading("🛰️ Radar đang khởi động...", { id: toastId });

        setIsScanning(true);
        scanStateRef.current.isActive = true;
        scanStateRef.current.abortController = new AbortController();

        const timeoutId = setTimeout(() => {
            scanStateRef.current.abortController?.abort();
            scanStateRef.current.isActive = false;
            setIsScanning(false);
            toast.error("⏱️ Quét vượt giới hạn 5 phút. Radar tự ngắt.", { id: toastId });
        }, 5 * 60 * 1000);

        setScanTimeout(timeoutId);

        try {
            await startScan(
                (current, total, message) => {
                    setProgress({ current, total, message });
                    if (total > 0 && current % 10 === 0) {
                        toast.loading(`🛰️ Radar: ${message} (${Math.round(current / total * 100)}%)`, { id: toastId });
                    }
                },
                scanStateRef.current.abortController.signal
            );
            toast.success("🛰️ Radar đã quét xong!", { id: toastId });
        } catch (error) {
            console.error("[DiscoveryModule] Scan error:", error);
            if (!(error instanceof DOMException && error.name === 'AbortError')) {
                toast.error("Lỗi khi quét Heuristic", { id: toastId });
            }
        } finally {
            clearTimeout(timeoutId);
            setScanTimeout(null);
            scanStateRef.current.isActive = false;
            setIsScanning(false);
        }
    };

    const handleAiRefine = async () => {
        if (isRefining) return;
        setIsRefining(true);
        try {
            await runAiRefine((msg) => setProgress({ current: 0, total: 0, message: msg }));
        } finally {
            setIsRefining(false);
        }
    };

    const handleClearAll = async () => {
        if (!confirm(`⚠️ Xóa TOÀN BỘ ${stats.total} thực thể?`)) return;
        setIsScanning(true);
        try {
            await db.heuristicTerms.where('workspaceId').equals(workspaceId).delete();
            toast.success(`✅ Đã dọn sạch vũ trụ!`);
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="h-full flex flex-col space-y-8 animate-in fade-in duration-500 overflow-hidden">
            {/* 1. Controller Area */}
            <div className="shrink-0 space-y-6">
                <HeuristicScanner
                    isScanning={isScanning || isRefining}
                    progress={progress}
                    stats={{ total: stats.total, approved: stats.approved }}
                    onScan={handleScan}
                    onAiRefine={handleAiRefine}
                    onClearAll={handleClearAll}
                    onApproveAll={() => approveAll(filteredTerms.filter(t => !t.isApproved))}
                    rawTerms={rawTerms}
                    forensicReport={forensicReport}
                    blacklist={blacklist || []}
                    workspaceId={workspaceId}
                />

                <HeuristicFilters
                    search={search}
                    onSearchChange={setSearch}
                    statusFilter={statusFilter}
                    onStatusChange={setStatusFilter}
                    freqFilter={freqFilter}
                    onFreqChange={setFreqFilter}
                    stats={{
                        total: stats.total,
                        pending: stats.total - stats.approved,
                        approved: stats.approved
                    }}
                />
            </div>

            {/* 2. Content Area */}
            <HeuristicTermList
                terms={filteredTerms}
                isScanning={isScanning}
                onApprove={approveTerm}
                onDelete={deleteTerm}
            />
        </div>
    );
}

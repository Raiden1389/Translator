"use client";

import { useState, useCallback, useRef } from "react";
import type { NameAuditReport, NameScanResult, NameFixResult } from "@/lib/services/name-audit.types";
import { scanWorkspaceNames, generateAuditReport, applyNameFixes } from "@/lib/services/name-audit.service";

interface ScanProgress {
    current: number;
    total: number;
    label?: string;
}

export function useNameAudit(workspaceId: string) {
    const [scanResult, setScanResult] = useState<NameScanResult | null>(null);
    const [report, setReport] = useState<NameAuditReport | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState<ScanProgress>({ current: 0, total: 0 });
    const [confirmedFixes, setConfirmedFixes] = useState<Map<string, string>>(new Map());
    const [dismissedClusters, setDismissedClusters] = useState<Set<string>>(new Set());
    const [similarityThreshold, setSimilarityThreshold] = useState(0.75);
    const [fromChapter, setFromChapter] = useState<number | undefined>(undefined);
    const [toChapter, setToChapter] = useState<number | undefined>(undefined);
    const [isApplying, setIsApplying] = useState(false);
    const [applyProgress, setApplyProgress] = useState<ScanProgress>({ current: 0, total: 0 });
    const [fixResult, setFixResult] = useState<NameFixResult | null>(null);
    const abortRef = useRef(false);

    const startScan = useCallback(async () => {
        if (isScanning) return;
        abortRef.current = false;
        setIsScanning(true);
        setScanProgress({ current: 0, total: 0 });
        setReport(null);
        setScanResult(null);
        setConfirmedFixes(new Map());
        setDismissedClusters(new Set());

        try {
            const result = await scanWorkspaceNames(workspaceId, (current, total) => {
                setScanProgress({ current, total });
            }, { fromChapter, toChapter });

            if (abortRef.current) return;

            setScanResult(result);
            const auditReport = generateAuditReport(result, similarityThreshold);
            setReport(auditReport);
        } catch (err) {
            console.error("[NameAudit] Scan failed:", err);
        } finally {
            setIsScanning(false);
        }
    }, [workspaceId, isScanning, similarityThreshold, fromChapter, toChapter]);

    const recluster = useCallback((threshold: number) => {
        setSimilarityThreshold(threshold);
        if (scanResult) {
            const auditReport = generateAuditReport(scanResult, threshold);
            setReport(auditReport);
            setConfirmedFixes(new Map());
            setDismissedClusters(new Set());
        }
    }, [scanResult]);

    const selectCanonical = useCallback((clusterId: string, canonicalName: string) => {
        setConfirmedFixes(prev => {
            const next = new Map(prev);
            next.set(clusterId, canonicalName);
            return next;
        });
    }, []);

    const dismissCluster = useCallback((clusterId: string) => {
        setDismissedClusters(prev => {
            const next = new Set(prev);
            next.add(clusterId);
            return next;
        });
        setConfirmedFixes(prev => {
            const next = new Map(prev);
            next.delete(clusterId);
            return next;
        });
    }, []);

    const undismissCluster = useCallback((clusterId: string) => {
        setDismissedClusters(prev => {
            const next = new Set(prev);
            next.delete(clusterId);
            return next;
        });
    }, []);

    // Filtered clusters (exclude dismissed)
    const visibleClusters = report?.clusters.filter(c => !dismissedClusters.has(c.id)) ?? [];
    const confirmedCount = confirmedFixes.size;
    const pendingInconsistent = visibleClusters.filter(c => c.isInconsistent && !confirmedFixes.has(c.id)).length;

    const applyAllFixes = useCallback(async () => {
        if (isApplying || confirmedFixes.size === 0 || !report) return;
        setIsApplying(true);
        setApplyProgress({ current: 0, total: 0 });
        setFixResult(null);

        try {
            const result = await applyNameFixes(
                confirmedFixes,
                report.clusters,
                workspaceId,
                (current, total, label) => {
                    setApplyProgress({ current, total, label });
                },
            );
            setFixResult(result);
        } catch (err) {
            console.error("[NameAudit] Apply failed:", err);
        } finally {
            setIsApplying(false);
        }
    }, [isApplying, confirmedFixes, report, workspaceId]);

    return {
        report,
        isScanning,
        scanProgress,
        confirmedFixes,
        dismissedClusters,
        visibleClusters,
        confirmedCount,
        pendingInconsistent,
        similarityThreshold,
        startScan,
        recluster,
        selectCanonical,
        dismissCluster,
        undismissCluster,
        fromChapter,
        toChapter,
        setFromChapter,
        setToChapter,
        isApplying,
        applyProgress,
        fixResult,
        applyAllFixes,
    };
}

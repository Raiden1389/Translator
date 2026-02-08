"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

interface UsageData {
    date: string;
    tokens: number;
    cost: number;
}

interface UsageChartProps {
    data: UsageData[];
    className?: string;
    isRaidenMode?: boolean;
}

export const UsageChart = ({ data, className, isRaidenMode }: UsageChartProps) => {
    const points = useMemo(() => {
        if (!data || data.length === 0) return [];

        const maxTokens = Math.max(...data.map(d => d.tokens), 100);
        const width = 100;
        const height = 40;

        return data.map((d, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - (d.tokens / maxTokens) * height;
            return { x, y };
        });
    }, [data]);

    const linePath = useMemo(() => {
        if (points.length < 2) return "";
        return `M ${points[0].x} ${points[0].y} ` +
            points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
    }, [points]);

    const areaPath = useMemo(() => {
        if (points.length < 2) return "";
        return `${linePath} L ${points[points.length - 1].x} 40 L ${points[0].x} 40 Z`;
    }, [linePath, points]);

    if (!data || data.length < 2) {
        return <div className="h-10 flex items-center justify-center text-[10px] text-muted-foreground italic">Chưa đủ dữ liệu lịch sử</div>;
    }

    return (
        <div className={cn("relative w-full h-12 mt-2 group", className)}>
            <svg
                viewBox="0 0 100 40"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
            >
                <defs>
                    <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isRaidenMode ? "#a855f7" : "#6366f1"} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={isRaidenMode ? "#a855f7" : "#6366f1"} stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Area under the line */}
                <path
                    d={areaPath}
                    fill="url(#usageGradient)"
                    className="transition-all duration-700 ease-in-out"
                />

                {/* The main line */}
                <path
                    d={linePath}
                    fill="none"
                    stroke={isRaidenMode ? "#a855f7" : "#6366f1"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-[0_0_8px_rgba(168,85,247,0.5)] transition-all duration-700 ease-in-out"
                />

                {/* Data points on hover or subtle dots */}
                {points.map((p, i) => (
                    <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r="1.5"
                        fill={isRaidenMode ? "#e879f9" : "#4f46e5"}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                ))}
            </svg>

            {/* Tooltip-like date labels (minimal) */}
            <div className="flex justify-between mt-1 px-1">
                <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-tight">{data[0].date.split('-').slice(1).join('/')}</span>
                <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-tight">Hôm nay</span>
            </div>
        </div>
    );
};

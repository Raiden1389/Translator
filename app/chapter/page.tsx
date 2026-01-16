"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ChapterEditorClient from "@/components/workspace/ChapterEditorClient";

function ChapterPageContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get("id");
    const chapterId = searchParams.get("chapterId");

    if (!id || !chapterId) return <div className="p-10 text-white/50">Invalid Parameters</div>;

    return <ChapterEditorClient id={id} chapterId={chapterId} />;
}

export default function ChapterPage() {
    return (
        <Suspense fallback={<div className="p-10 text-white/50">Loading Chapter...</div>}>
            <ChapterPageContent />
        </Suspense>
    );
}

"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import WorkspaceClient from "@/components/workspace/WorkspaceClient";
import { RaidenProvider } from "@/components/theme/RaidenProvider";

function WorkspacePageContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get("id");

    if (!id) return <div className="p-10 text-white/50">Invalid Workspace ID</div>;

    return (
        <RaidenProvider>
            <WorkspaceClient id={id} />
        </RaidenProvider>
    );
}

export default function WorkspacePage() {
    return (
        <Suspense fallback={<div className="p-10 text-white/50">Loading Workspace...</div>}>
            <WorkspacePageContent />
        </Suspense>
    );
}

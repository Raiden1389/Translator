import React, { use, Suspense } from "react";
import WorkspaceClient from "@/components/workspace/WorkspaceClient";

export async function generateStaticParams() {
    // Generate at least one dummy page to satisfy Next.js
    return [{ id: 'placeholder' }];
}

export default function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <WorkspaceClient id={id} />
        </Suspense>
    );
}

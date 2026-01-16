
import React, { use } from "react";
import WorkspaceClient from "@/components/workspace/WorkspaceClient";

export function generateStaticParams() {
    return [];
}

export default function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <WorkspaceClient id={id} />;
}

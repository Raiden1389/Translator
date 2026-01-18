import React, { use } from "react";
import ChapterEditorClient from "@/components/workspace/ChapterEditorClient";

export async function generateStaticParams() {
    return [{ id: 'placeholder', chapterId: '1' }];
}

export default function ChapterEditorPage({ params }: { params: Promise<{ id: string, chapterId: string }> }) {
    const { id, chapterId } = use(params);
    return <ChapterEditorClient id={id} chapterId={chapterId} />;
}

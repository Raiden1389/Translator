import { useState, useRef } from "react";
import { db, Chapter } from "@/lib/db";
import { toast } from "sonner";

export function useChapterImport(workspaceId: string, currentChaptersCount: number) {
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [importStatus, setImportStatus] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setImportStatus("Initializing...");
        setProgress(0);

        try {
            if (file.name.endsWith(".epub")) {
                // Dynamically import epubjs only when needed
                const ePub = (await import("epubjs")).default;
                const book = ePub();
                await book.open(await file.arrayBuffer());

                const spine = await book.loaded.spine;
                const items = (spine as unknown as { items: { href: string }[] }).items;
                const total = items.length;

                const chaptersToAdd = [];
                for (let i = 0; i < total; i++) {
                    const item = items[i];
                    setImportStatus(`Parsing section ${i + 1}/${total}...`);
                    setProgress(Math.round(((i + 1) / total) * 100));

                    const doc = await book.load(item.href);
                    const title = (doc as Document).querySelector("title")?.textContent || `Chapter ${i + 1}`;
                    const content = (doc as Document).body.innerText || "No content extracted.";

                    chaptersToAdd.push({
                        workspaceId,
                        title,
                        content_original: content,
                        content_translated: "",
                        status: "draft" as const,
                        order: currentChaptersCount + i + 1,
                        wordCountOriginal: content.trim().length,
                        wordCountTranslated: 0
                    });
                }

                await db.chapters.bulkAdd(chaptersToAdd);

                // Extract and save cover image if available
                try {
                    const coverUrl = await book.coverUrl();
                    if (coverUrl) {
                        const response = await fetch(coverUrl);
                        const blob = await response.blob();
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                            if (typeof reader.result === 'string') {
                                await db.workspaces.update(workspaceId, {
                                    cover: reader.result,
                                    updatedAt: new Date()
                                });
                                toast.success("Đã cập nhật ảnh bìa từ EPUB!");
                            }
                        };
                        reader.readAsDataURL(blob);
                    }
                } catch (coverErr) {
                    console.error("Failed to extract cover:", coverErr);
                    // Non-critical, ignore
                }

                toast.success(`Đã nhập ${chaptersToAdd.length} chương thành công!`);
            } else if (file.name.endsWith(".txt")) {
                const text = await file.text();
                // Basic TXT chunking by chapters
                const lines = text.split("\n");
                const chaptersToAdd = [];
                let currentTitle = "Phần 1";
                let currentContent: string[] = [];

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (/^\s*(Chương|Chapter|Tiết|Quyển|Episode|第|卷|回)\s*(\d+|[零一二三四五六七八九十百千]+)/i.test(line)) {
                        if (currentContent.length > 0) {
                            const contentStr = currentContent.join("\n").trim();
                            chaptersToAdd.push({
                                workspaceId,
                                title: currentTitle,
                                content_original: contentStr,
                                content_translated: "",
                                status: "draft" as const,
                                order: currentChaptersCount + chaptersToAdd.length + 1,
                                wordCountOriginal: contentStr.length,
                                wordCountTranslated: 0
                            });
                        }
                        currentTitle = line.trim();
                        currentContent = [];
                    } else {
                        currentContent.push(line);
                    }
                }

                // Push last one
                if (currentContent.length > 0) {
                    const contentStr = currentContent.join("\n").trim();
                    chaptersToAdd.push({
                        workspaceId,
                        title: currentTitle,
                        content_original: contentStr,
                        content_translated: "",
                        status: "draft" as const,
                        order: currentChaptersCount + chaptersToAdd.length + 1,
                        wordCountOriginal: contentStr.length,
                        wordCountTranslated: 0
                    });
                }

                await db.chapters.bulkAdd(chaptersToAdd);
                toast.success(`Đã nhập file TXT thành công!`);
            }
        } catch (err) {
            console.error(err);
            toast.error("Lỗi khi nhập file.");
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleImportJSON = async (e?: React.ChangeEvent<HTMLInputElement>) => {
        let text = "";

        // 1. Try Tauri Native Dialog if available
        if (typeof window !== 'undefined' && (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
            try {
                const { open } = await import("@tauri-apps/plugin-dialog");
                const { readTextFile } = await import("@tauri-apps/plugin-fs");

                const selected = await open({
                    filters: [{ name: 'JSON', extensions: ['json'] }],
                    multiple: false
                });

                if (selected && typeof selected === 'string') {
                    text = await readTextFile(selected);
                } else if (selected && typeof selected === 'object' && 'path' in selected) {
                    text = await readTextFile((selected as { path: string }).path);
                } else {
                    return; // Canceled
                }
            } catch (err) {
                console.error("Tauri Import Error:", err);
                // Fallback to standard input if possible
            }
        }

        // 2. Fallback to standard Input Element
        if (!text && e?.target.files?.[0]) {
            text = await e.target.files[0].text();
        }

        if (!text) return;

        try {
            const data = JSON.parse(text);
            if (Array.isArray(data)) {
                const chaptersWithWorkspace = data.map((c: any, index: number) => {
                    const { id: _id, ...rest } = c;
                    console.log("Importing chapter id (skipped):", _id);
                    return {
                        ...rest,
                        workspaceId,
                        order: (rest.order || currentChaptersCount + index + 1)
                    } as Chapter;
                });
                await db.chapters.bulkAdd(chaptersWithWorkspace);
                toast.success(`Đã nhập thành công ${chaptersWithWorkspace.length} chương!`);
            } else {
                toast.error("Định dạng JSON không hợp lệ.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Lỗi khi nhập file JSON.");
        } finally {
            // No reset needed for native dialogs as there's no input[type=file] state to clear
        }
    };

    return {
        importing,
        progress,
        importStatus,
        fileInputRef,
        handleFileUpload,
        handleImportJSON
    };
}

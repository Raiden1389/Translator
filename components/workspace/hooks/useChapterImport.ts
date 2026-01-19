import { useState, useRef } from "react";
import { db } from "@/lib/db";
import { toast } from "sonner";

export function useChapterImport(workspaceId: string, currentChaptersCount: number) {
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [importStatus, setImportStatus] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const importInputRef = useRef<HTMLInputElement>(null);

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
                const items = (spine as any).items;
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
                    if (/(Chương|Chapter|Tiết|Quyển|Episode)\s+\d+/i.test(line)) {
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

    const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            if (Array.isArray(data)) {
                const chaptersWithWorkspace = data.map((c, index) => {
                    const { id, ...rest } = c;
                    return {
                        ...rest,
                        workspaceId,
                        order: (rest.order || currentChaptersCount + index + 1)
                    };
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
            if (importInputRef.current) importInputRef.current.value = "";
        }
    };

    return {
        importing,
        progress,
        importStatus,
        fileInputRef,
        importInputRef,
        handleFileUpload,
        handleImportJSON
    };
}

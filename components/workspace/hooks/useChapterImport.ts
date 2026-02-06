import { useState, useRef } from "react";
import { db, Chapter } from "@/lib/db";
import { toast } from "sonner";
import { cleanHtmlContent } from "@/lib/utils/text-sanitizer";

export function useChapterImport(workspaceId: string, currentChaptersCount: number) {
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [importStatus, setImportStatus] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processJsonChapters = async (data: any) => {
        let rawChapters = [];

        // Hỗ trợ cả mảng trực tiếp hoặc object có key 'chapters'
        if (Array.isArray(data)) {
            rawChapters = data;
        } else if (data && typeof data === 'object' && Array.isArray(data.chapters)) {
            rawChapters = data.chapters;
        }

        if (rawChapters.length === 0) {
            throw new Error("Không tìm thấy danh sách chương trong file JSON.");
        }

        const chaptersWithWorkspace = rawChapters.map((c: any, index: number) => {
            const { id: _id, ...rest } = c;
            // Ưu tiên key 'content' (từ crawler) hoặc 'content_original'
            const rawContent = rest.content || rest.content_original || "";
            const cleanedContent = cleanHtmlContent(rawContent);

            return {
                ...rest,
                workspaceId,
                title: rest.title || `Chương ${currentChaptersCount + index + 1}`,
                content_original: cleanedContent,
                content_translated: rest.content_translated || "",
                status: rest.status || "draft",
                order: (rest.order || currentChaptersCount + index + 1),
                wordCountOriginal: cleanedContent.length,
                wordCountTranslated: (rest.content_translated || "").length
            } as Chapter;
        });

        await db.chapters.bulkAdd(chaptersWithWorkspace);
        return chaptersWithWorkspace.length;
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setImportStatus("Initializing...");
        setProgress(0);

        try {
            if (file.name.endsWith(".epub")) {
                // ... logic epub giữ nguyên ...
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
                    const content = cleanHtmlContent((doc as Document).body.innerText || "No content extracted.");
                    chaptersToAdd.push({
                        workspaceId, title, content_original: content, content_translated: "",
                        status: "draft" as const, order: currentChaptersCount + i + 1,
                        wordCountOriginal: content.trim().length, wordCountTranslated: 0
                    });
                }
                await db.chapters.bulkAdd(chaptersToAdd);
                toast.success(`Đã nhập ${chaptersToAdd.length} chương từ EPUB!`);
            } else if (file.name.endsWith(".txt")) {
                const text = await file.text();
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
                                workspaceId, title: currentTitle, content_original: contentStr,
                                content_translated: "", status: "draft" as const,
                                order: currentChaptersCount + chaptersToAdd.length + 1,
                                wordCountOriginal: contentStr.length, wordCountTranslated: 0
                            });
                        }
                        currentTitle = line.trim();
                        currentContent = [];
                    } else {
                        currentContent.push(line);
                    }
                }
                if (currentContent.length > 0) {
                    const contentStr = currentContent.join("\n").trim();
                    chaptersToAdd.push({
                        workspaceId, title: currentTitle, content_original: contentStr,
                        content_translated: "", status: "draft" as const,
                        order: currentChaptersCount + chaptersToAdd.length + 1,
                        wordCountOriginal: contentStr.length, wordCountTranslated: 0
                    });
                }
                await db.chapters.bulkAdd(chaptersToAdd);
                toast.success(`Đã nhập file TXT thành công!`);
            } else if (file.name.endsWith(".json")) {
                const text = await file.text();
                const count = await processJsonChapters(JSON.parse(text));
                toast.success(`Đã nạp thêm ${count} chương từ file JSON!`);
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Lỗi khi nhập file.");
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleImportJSON = async (e?: React.ChangeEvent<HTMLInputElement>) => {
        let text = "";
        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
            try {
                const { open } = await import("@tauri-apps/plugin-dialog");
                const { readTextFile } = await import("@tauri-apps/plugin-fs");
                const selected = await open({ filters: [{ name: 'JSON', extensions: ['json'] }], multiple: false });
                if (selected && typeof selected === 'string') text = await readTextFile(selected);
                else if (selected && typeof selected === 'object' && 'path' in (selected as any))
                    text = await readTextFile((selected as any).path);
            } catch (err) { console.error("Tauri Import Error:", err); }
        }

        if (!text && e?.target.files?.[0]) text = await e.target.files[0].text();
        if (!text) return;

        try {
            const count = await processJsonChapters(JSON.parse(text));
            toast.success(`Đã nhập thành công ${count} chương!`);
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Lỗi khi nhập file JSON.");
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

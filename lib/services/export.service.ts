import { Workspace, Chapter } from "@/lib/db";
import { splitIntoParagraphs } from "@/components/workspace/utils/readerFormatting";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { gdrive } from "@/lib/googleDrive";

export type ExportTarget = 'google-drive' | 'filesystem';
export type ExportFormat = 'epub' | 'txt';
export type ExportLang = 'vi' | 'zh';

export interface ExportOptions {
    workspace: Workspace;
    chapters: Chapter[];
    target: ExportTarget;
    format: ExportFormat;
    language: ExportLang;
    rangeStart: string;
    rangeEnd: string;
    folderId?: string; // For Google Drive
    onProgress?: (percent: number, message?: string) => void;
}

export interface ExportResult {
    success: boolean;
    fileName?: string;
    error?: string;
}

const escapeHTML = (str: string) => {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

/**
 * ENTRY POINT DUY NHẤT
 */
export async function exportWorkspace(options: ExportOptions): Promise<ExportResult> {
    try {
        const { workspace, chapters, format, language, rangeStart, rangeEnd, target, onProgress } = options;

        onProgress?.(5, 'Chuẩn bị dữ liệu...');

        let blob: Blob;
        let filename: string;

        if (format === 'epub') {
            const res = await buildEPUB(workspace, chapters, language, rangeStart, rangeEnd, onProgress);
            blob = res.blob;
            filename = res.filename;
        } else {
            const res = await buildTXT(workspace, chapters, language, rangeStart, rangeEnd, onProgress);
            blob = res.blob;
            filename = res.filename;
        }

        if (target === 'google-drive') {
            onProgress?.(95, 'Đang tải lên Google Drive...');
            await gdrive.uploadFile(blob, filename, options.folderId || "root");
            return { success: true, fileName: filename };
        } else {
            onProgress?.(95, 'Đang chuẩn bị lưu file...');
            const success = await saveToLocal(blob, filename, format);
            return { success, fileName: filename };
        }
    } catch (err: unknown) {
        console.error("Export service error:", err);
        const message = err instanceof Error ? err.message : 'Lỗi không xác định khi xuất file';
        return {
            success: false,
            error: message,
        };
    }
}

/* ------------------------------------------------------------------ */
/* INTERNAL IMPLEMENTATION                                             */
/* ------------------------------------------------------------------ */

async function buildTXT(ws: Workspace, chs: Chapter[], language: ExportLang, rangeStart: string, rangeEnd: string, onProgress?: (p: number) => void) {
    let content = `${ws.title}\r\nTac gia: ${ws.author || "Unknown"}\r\n\r\n`;

    chs.forEach((ch, idx) => {
        content += `--------------------------------------------------\r\n`;
        if (language === "vi") {
            content += `${ch.title_translated || ch.title}\r\n\r\n`;
            const paragraphs = splitIntoParagraphs(ch.content_translated || "[Chưa dịch]");
            content += paragraphs.join("\r\n\r\n");
        } else if (language === "zh") {
            content += `${ch.title}\r\n\r\n`;
            const paragraphs = splitIntoParagraphs(ch.content_original || "");
            content += paragraphs.join("\r\n\r\n");
        }
        content += `\r\n\r\n`;
        onProgress?.(10 + Math.round((idx / chs.length) * 80));
    });

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const filename = `${ws.title} ${rangeStart}-${rangeEnd}.txt`;
    return { blob, filename };
}

async function buildEPUB(ws: Workspace, chs: Chapter[], language: ExportLang, rangeStart: string, rangeEnd: string, onProgress?: (p: number) => void) {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
    zip.file("META-INF/container.xml", `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

    zip.file("OEBPS/style.css", `
body { font-family: "Georgia", serif; padding: 5% 8%; line-height: 1.8; color: inherit; }
h1, h2 { text-align: center; color: inherit; }
p { margin-bottom: 1.5em; text-align: justify; color: inherit; }
`);

    const manifestArr: string[] = [];
    const spineArr: string[] = [];
    let coverItem = "";

    if (ws.cover) {
        try {
            const base64Data = ws.cover.split(',')[1];
            const mime = ws.cover.split(';')[0].split(':')[1];
            const extension = mime.split('/')[1] || "jpg";
            zip.file(`OEBPS/cover.${extension}`, base64Data, { base64: true });
            manifestArr.push(`<item id="cover-image" href="cover.${extension}" media-type="${mime}"/>`);
            zip.file("OEBPS/cover.xhtml", `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Cover</title><style>body { margin: 0; padding: 0; text-align: center; background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; } img { max-width: 100%; max-height: 100%; }</style></head><body><img src="cover.${extension}" alt="Cover"/></body></html>`);
            manifestArr.push(`<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`);
            spineArr.push(`<itemref idref="cover"/>`);
            coverItem = `  <meta name="cover" content="cover-image"/>`;
        } catch (e) {
            console.error("Cover error", e);
        }
    }

    const tocEntries: string[] = [];
    for (let i = 0; i < chs.length; i++) {
        const ch = chs[i];
        const fileName = `chapter_${ch.id}.xhtml`;
        const title = language === 'vi' ? (ch.title_translated || ch.title) : ch.title;
        const paragraphs = splitIntoParagraphs(language === 'vi' ? (ch.content_translated || "[Chưa dịch]") : ch.content_original);
        const contentHtml = paragraphs.map(p => `<p>${escapeHTML(p)}</p>`).join('\n');
        const escapedTitle = escapeHTML(title);

        zip.file(`OEBPS/${fileName}`, `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${escapedTitle}</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body><h2>${escapedTitle}</h2><div class="chapter-content">${contentHtml}</div></body></html>`);
        manifestArr.push(`<item id="ch${ch.id}" href="${fileName}" media-type="application/xhtml+xml"/>`);
        spineArr.push(`<itemref idref="ch${ch.id}"/>`);
        tocEntries.push(`<navPoint id="navPoint-${i + 1}" playOrder="${i + 1}"><navLabel><text>${escapedTitle}</text></navLabel><content src="${fileName}"/></navPoint>`);

        onProgress?.(20 + Math.round((i / chs.length) * 70));
    }

    zip.file("OEBPS/content.opf", `<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf"><dc:title>${ws.title}</dc:title><dc:creator>${ws.author || "Raiden AI"}</dc:creator><dc:identifier id="bookid">urn:uuid:${ws.id}</dc:identifier><dc:language>${language === 'vi' ? 'vi' : 'zh'}</dc:language>${coverItem}</metadata><manifest><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="css" href="style.css" media-type="text/css"/>${manifestArr.join("\n    ")}</manifest><spine toc="ncx">${spineArr.join("\n    ")}</spine></package>`);
    zip.file("OEBPS/toc.ncx", `<?xml version="1.0" encoding="utf-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="urn:uuid:${ws.id}"/><meta name="dtb:depth" content="1"/></head><docTitle><text>${ws.title}</text></docTitle><navMap>${tocEntries.join("\n    ")}</navMap></ncx>`);

    const content = await zip.generateAsync({ type: "blob" });
    const filename = `${ws.title} ${rangeStart}-${rangeEnd}.epub`;
    return { blob: content, filename };
}

async function saveToLocal(blob: Blob, filename: string, fmt: string): Promise<boolean> {
    const filePath = await save({
        defaultPath: filename,
        filters: [{ name: fmt === "epub" ? "E-Book EPUB" : "Text", extensions: [fmt] }]
    });

    if (!filePath) return false;

    await writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
    return true;
}

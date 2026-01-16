"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Chapter, Workspace } from "@/lib/db";
import {
    FileText,
    Book,
    Layout,
    Type,
    Check,
    Cloud,
    FolderPlus,
    RefreshCw,
    LogOut,
    Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { cn } from "@/lib/utils";
import { gdrive } from "@/lib/googleDrive";

// Sub-components
import { FormatCard } from "./export/FormatCard";
import { ExportForm } from "./export/ExportForm";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ExportFormat = "epub" | "txt";
type ContentLang = "vi" | "zh";

export function ExportTab({ workspaceId }: { workspaceId: string }) {
    const workspace = useLiveQuery(() => db.workspaces.get(workspaceId), [workspaceId]);

    // Fetch and sort chapters in memory to avoid Dexie Collection sortBy/orderBy confusion
    const chapters = useLiveQuery(async () => {
        const items = await db.chapters.where("workspaceId").equals(workspaceId).toArray();
        return items.sort((a, b) => a.order - b.order);
    }, [workspaceId]) || [];

    const driveToken = useLiveQuery(() => db.settings.get("gdrive_token"));
    const driveUser = useLiveQuery(() => db.settings.get("gdrive_user"));
    const clientIdSetting = useLiveQuery(() => db.settings.get("gdrive_client_id"));

    const [format, setFormat] = useState<ExportFormat>("epub");
    const [lang, setLang] = useState<ContentLang>("vi");
    const [rangeStart, setRangeStart] = useState("1");
    const [rangeEnd, setRangeEnd] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);

    const [useDrive, setUseDrive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [driveFolders, setDriveFolders] = useState<{ id: string; name: string }[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string>("root");
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);

    // Set default rangeEnd when chapters load
    React.useEffect(() => {
        if (chapters.length > 0 && !rangeEnd) {
            setRangeEnd(chapters.length.toString());
        }
    }, [chapters.length, rangeEnd]);

    // Load folders if already connected
    React.useEffect(() => {
        if (driveToken?.value) {
            loadFolders();
        }
    }, [driveToken?.value]);

    // Initialize GIS if clientId exists
    React.useEffect(() => {
        if (clientIdSetting?.value) {
            gdrive.init(clientIdSetting.value).catch(console.error);
        }
    }, [clientIdSetting?.value]);

    const handleConnectDrive = async () => {
        if (!clientIdSetting?.value) {
            const id = prompt("Vui lòng nhập Google Client ID:");
            if (id) {
                await db.settings.put({ key: "gdrive_client_id", value: id });
                gdrive.init(id);
                toast.success("Đã lưu Client ID. Hãy bấm kết nối lại.");
            }
            return;
        }
        setIsConnecting(true);
        try {
            await gdrive.connect();
            toast.success("Đã kết nối Google Drive!");
        } catch (error) {
            toast.error("Lỗi kết nối Drive");
        } finally {
            setIsConnecting(false);
        }
    };

    const handleLogoutDrive = async () => {
        await gdrive.logout();
        setDriveFolders([]);
        setSelectedFolderId("root");
        toast.success("Đã đăng xuất Google Drive");
    };

    const loadFolders = async () => {
        try {
            const folders = await gdrive.listFolders();
            setDriveFolders(folders);
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreateFolder = async () => {
        const name = prompt("Nhập tên thư mục mới:");
        if (!name) return;
        setIsCreatingFolder(true);
        try {
            const folder = await gdrive.createFolder(name);
            toast.success(`Đã tạo thư mục: ${name}`);
            loadFolders();
            setSelectedFolderId(folder.id);
        } catch (error) {
            toast.error("Lỗi khi tạo thư mục");
        } finally {
            setIsCreatingFolder(false);
        }
    };

    const handleExport = async () => {
        if (!workspace) return;

        const start = parseInt(rangeStart);
        const end = parseInt(rangeEnd);

        if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
            toast.error("Khoảng chương không hợp lệ!");
            return;
        }

        const chaptersToExport = chapters.slice(start - 1, end);
        if (chaptersToExport.length === 0) {
            toast.error("Không có chương nào trong khoảng này!");
            return;
        }

        setIsExporting(true);
        setExportProgress(10);

        try {
            let blob: Blob;
            let filename: string;

            if (format === "epub") {
                const res = await exportAsEPUB(workspace, chaptersToExport, lang);
                blob = res.blob;
                filename = res.filename;
            } else {
                const res = await exportAsTXT(workspace, chaptersToExport, lang);
                blob = res.blob;
                filename = res.filename;
            }

            if (useDrive) {
                setExportProgress(95);
                await gdrive.uploadFile(blob, filename, selectedFolderId);
                toast.success("Đã đẩy lên Google Drive!");
            } else {
                downloadBlob(blob, filename);
                toast.success("Đã tải xuống máy!");
            }
        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi xuất file: " + (error as Error).message);
        } finally {
            setIsExporting(false);
            setExportProgress(0);
        }
    };

    const exportAsTXT = async (ws: Workspace, chs: Chapter[], language: ContentLang) => {
        let content = `${ws.title}\r\nTac gia: ${ws.author || "Unknown"}\r\n\r\n`;

        chs.forEach((ch, idx) => {
            content += `--------------------------------------------------\r\n`;
            if (language === "vi") {
                content += `${ch.title_translated || ch.title}\r\n\r\n`;
                content += ch.content_translated || "[Chưa dịch]";
            } else if (language === "zh") {
                content += `${ch.title}\r\n\r\n`;
                content += ch.content_original;
            }
            content += `\r\n\r\n`;
            setExportProgress(10 + Math.round((idx / chs.length) * 80));
        });

        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const filename = `${ws.title} ${rangeStart}-${rangeEnd}.txt`;
        return { blob, filename };
    };

    const exportAsEPUB = async (ws: Workspace, chs: Chapter[], language: ContentLang) => {
        const zip = new JSZip();
        zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
        zip.file("META-INF/container.xml", `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

        zip.file("OEBPS/style.css", `
body { font-family: "Georgia", serif; padding: 5%; line-height: 1.6; }
h1 { text-align: center; color: #333; margin-bottom: 2em; }
h2 { text-align: center; color: #444; margin-top: 1em; border-bottom: 1px solid #eee; padding-bottom: 0.5em; }
.chapter-content { white-space: pre-wrap; margin-top: 1.5em; font-size: 1.1em; }
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

                zip.file("OEBPS/cover.xhtml", `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Cover</title><style>body { margin: 0; padding: 0; text-align: center; background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; } img { max-width: 100%; max-height: 100%; object-contain: fit; }</style></head>
<body><img src="cover.${extension}" alt="Cover"/></body>
</html>`);
                manifestArr.push(`<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`);
                spineArr.push(`<itemref idref="cover"/>`);
                coverItem = `  <meta name="cover" content="cover-image"/>`;
            } catch (e) {
                console.error("Failed to process cover", e);
            }
        }

        const tocEntries: string[] = [];

        for (let i = 0; i < chs.length; i++) {
            const ch = chs[i];
            const fileName = `chapter_${ch.id}.xhtml`;
            const title = language === 'vi' ? (ch.title_translated || ch.title) : ch.title;
            const contentBody = language === 'vi' ? (ch.content_translated || "[Chưa dịch]") : ch.content_original;

            const html = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>${title}</title>
    <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
    <h2>${title}</h2>
    <div class="chapter-content">${contentBody.replace(/\n/g, '<br/>')}</div>
</body>
</html>`;

            zip.file(`OEBPS/${fileName}`, html);
            manifestArr.push(`<item id="ch${ch.id}" href="${fileName}" media-type="application/xhtml+xml"/>`);
            spineArr.push(`<itemref idref="ch${ch.id}"/>`);
            tocEntries.push(`<navPoint id="navPoint-${i + 1}" playOrder="${i + 1}"><navLabel><text>${title}</text></navLabel><content src="${fileName}"/></navPoint>`);

            setExportProgress(20 + Math.round((i / chs.length) * 70));
        }

        zip.file("OEBPS/content.opf", `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${ws.title}</dc:title>
    <dc:creator>${ws.author || "Raiden AI"}</dc:creator>
    <dc:identifier id="bookid">urn:uuid:${ws.id}</dc:identifier>
    <dc:language>${language === 'vi' ? 'vi' : 'zh'}</dc:language>
    ${coverItem}
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
    ${manifestArr.join("\n    ")}
  </manifest>
  <spine toc="ncx">
    ${spineArr.join("\n    ")}
  </spine>
</package>`);

        zip.file("OEBPS/toc.ncx", `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${ws.id}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${ws.title}</text></docTitle>
  <navMap>
    ${tocEntries.join("\n    ")}
  </navMap>
</ncx>`);

        const content = await zip.generateAsync({ type: "blob" });
        const filename = `${ws.title} ${rangeStart}-${rangeEnd}.epub`;
        return { blob: content, filename };
    };

    const downloadBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const formatTypes = [
        { id: "epub", label: "EPUB (E-Book)", icon: Book, desc: "Sách chuẩn, có bìa & mục lục." },
        { id: "txt", label: "TXT (Raw Text)", icon: FileText, desc: "Bản thô văn bản thuần túy." },
    ];

    const langOptions = [
        { id: "vi", label: "Tiếng Việt", desc: "Nội dung bản dịch" },
        { id: "zh", label: "Tiếng Trung", desc: "Nội dung bản gốc" },
    ];

    const currentFormatLabel = formatTypes.find(f => f.id === format)?.label || format.toUpperCase();
    const currentLangLabel = langOptions.find(l => l.id === lang)?.label || "";

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Selection Section */}
                <div className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Layout className="w-5 h-5 text-primary" />
                            1. Định dạng file
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {formatTypes.map((opt) => (
                                <FormatCard
                                    key={opt.id}
                                    id={opt.id}
                                    label={opt.label}
                                    description={opt.desc}
                                    icon={opt.icon}
                                    isActive={format === opt.id}
                                    onClick={() => setFormat(opt.id as ExportFormat)}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Type className="w-5 h-5 text-primary" />
                            2. Nội dung ngôn ngữ
                        </h3>
                        <div className="grid grid-cols-1 gap-2">
                            {langOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setLang(opt.id as ContentLang)}
                                    className={cn(
                                        "flex items-center justify-between p-3 px-4 rounded-xl border text-left transition-all relative overflow-hidden",
                                        lang === opt.id
                                            ? "bg-primary/10 border-primary ring-1 ring-primary shadow-sm"
                                            : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            lang === opt.id ? "bg-primary" : "bg-white/20"
                                        )} />
                                        <div>
                                            <div className="font-bold text-sm text-white">{opt.label}</div>
                                            <div className="text-[10px] text-white/40">{opt.desc}</div>
                                        </div>
                                    </div>
                                    {lang === opt.id && <Check className="w-4 h-4 text-primary" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 p-5 bg-white/5 border border-white/10 rounded-2xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <Cloud className="w-4 h-4 text-primary" />
                                Google Drive
                            </h3>
                            <Switch
                                checked={useDrive}
                                onCheckedChange={setUseDrive}
                            />
                        </div>

                        {useDrive && (
                            <div className="space-y-4 pt-2 animate-in fade-in zoom-in-95 duration-300">
                                {!driveToken?.value ? (
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-white/40 uppercase font-black">Google Client ID</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="password"
                                                    placeholder="Lấy ở Google Cloud Console"
                                                    defaultValue={clientIdSetting?.value || ""}
                                                    className="h-9 text-xs bg-black/20 border-white/5"
                                                    onBlur={async (e) => {
                                                        if (e.target.value) {
                                                            await db.settings.put({ key: "gdrive_client_id", value: e.target.value });
                                                            gdrive.init(e.target.value);
                                                            toast.success("Đã cập nhật Client ID");
                                                        }
                                                    }}
                                                />
                                                <Button
                                                    size="sm"
                                                    onClick={handleConnectDrive}
                                                    disabled={isConnecting}
                                                    className="bg-primary hover:bg-primary/90"
                                                >
                                                    {isConnecting ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Kết nối"}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-2 px-3 bg-primary/5 rounded-lg border border-primary/10">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary shrink-0">
                                                    {driveUser?.value?.email?.[0].toUpperCase() || "G"}
                                                </div>
                                                <span className="text-[10px] text-white/70 truncate font-medium">
                                                    {driveUser?.value?.email || "Đã kết nối"}
                                                </span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleLogoutDrive}
                                                className="h-6 text-[10px] text-white/40 hover:text-red-400 hover:bg-red-400/10 gap-1 px-2"
                                            >
                                                <LogOut className="w-3 h-3" />
                                                Đăng xuất
                                            </Button>
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-white/40 uppercase font-black">Thư mục Drive</Label>
                                            <div className="flex gap-2">
                                                <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                                                    <SelectTrigger className="h-9 text-xs bg-black/40 border-white/5">
                                                        <SelectValue placeholder="Chọn thư mục" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#1a0b2e] border-white/10 text-white">
                                                        <SelectItem value="root">My Drive (Gốc)</SelectItem>
                                                        {driveFolders.map(folder => (
                                                            <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    size="icon"
                                                    variant="secondary"
                                                    className="h-9 w-9 shrink-0 bg-white/5 hover:bg-white/10"
                                                    onClick={loadFolders}
                                                >
                                                    <RefreshCw className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="secondary"
                                                    className="h-9 w-9 shrink-0 bg-white/5 hover:bg-white/10"
                                                    onClick={handleCreateFolder}
                                                >
                                                    <FolderPlus className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Range & Action Section */}
                <div className="space-y-6">
                    <ExportForm
                        rangeStart={rangeStart}
                        rangeEnd={rangeEnd}
                        setRangeStart={setRangeStart}
                        setRangeEnd={setRangeEnd}
                        totalAvailable={chapters.length}
                        isExporting={isExporting}
                        exportProgress={exportProgress}
                        onExport={handleExport}
                        formatLabel={`${currentFormatLabel} (${currentLangLabel})`}
                        useDrive={useDrive}
                    />

                    <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
                            <ImageIcon className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="text-[12px] leading-relaxed">
                            <span className="text-amber-500 font-bold mr-1">Lưu ý:</span>
                            <span className="text-white/50">
                                Hãy đảm bảo mày đã cài đặt **Ảnh bìa** ở tab Tổng quan để EPUB có giao diện chuyên nghiệp nhất trên các thiết bị đọc sách.
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

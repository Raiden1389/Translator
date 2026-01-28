"use client";

import { useState, useCallback, useEffect } from "react";
import {
    exportWorkspace,
    ExportTarget,
    ExportFormat,
    ExportLang
} from "@/lib/services/export.service";
import { Workspace, Chapter, db } from "@/lib/db";
import { toast } from "sonner";
import { gdrive } from "@/lib/googleDrive";
import { useLiveQuery } from "dexie-react-hooks";

export interface UseExportParams {
    workspace: Workspace | undefined;
    chapters: Chapter[];
}

export function useExport({ workspace, chapters }: UseExportParams) {
    const [format, setFormat] = useState<ExportFormat>("epub");
    const [lang, setLang] = useState<ExportLang>("vi");
    const [rangeStart, setRangeStart] = useState("1");
    const [rangeEnd, setRangeEnd] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);

    const [useDrive, setUseDrive] = useState(false);
    const [driveFolders, setDriveFolders] = useState<{ id: string; name: string }[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string>("root");
    const [showManualInput, setShowManualInput] = useState(false);
    const [manualToken, setManualToken] = useState("");

    const driveToken = useLiveQuery(() => db.settings.get("gdrive_token"));
    const driveUser = useLiveQuery(() => db.settings.get("gdrive_user"));
    const clientIdSetting = useLiveQuery(() => db.settings.get("gdrive_client_id"));

    // Sync chapter range
    useEffect(() => {
        if (chapters.length > 0 && !rangeEnd) {
            setRangeEnd(chapters.length.toString());
        }
    }, [chapters.length, rangeEnd]);

    // GDrive: Load folders if token exists
    useEffect(() => {
        if (driveToken?.value) {
            loadFolders();
        }
    }, [driveToken?.value]);

    // GDrive: Init client if setting exists
    useEffect(() => {
        if (clientIdSetting?.value) {
            gdrive.init(clientIdSetting.value as string).catch(console.error);
        }
    }, [clientIdSetting?.value]);

    const loadFolders = async () => {
        try {
            const folders = await gdrive.listFolders();
            setDriveFolders(folders);
        } catch (error: any) {
            toast.error("Lỗi khi tải thư mục Drive.");
        }
    };

    const handleConnectDrive = async () => {
        if (!clientIdSetting?.value) {
            const id = prompt("Vui lòng nhập Google Client ID:");
            if (id) {
                await db.settings.put({ key: "gdrive_client_id", value: id });
                gdrive.init(id);
                toast.info("Đã lưu Client ID. Bấm 'Kết nối' lại.");
            }
            return;
        }
        try {
            await gdrive.connect();
            toast.success("Kết nối thành công!");
        } catch (error: any) {
            toast.error(error.message || "Lỗi kết nối");
        }
    };

    const handleLogoutDrive = async () => {
        await gdrive.logout();
        setDriveFolders([]);
        setSelectedFolderId("root");
    };

    const handleManualTokenSave = async () => {
        if (!manualToken.trim()) return;
        let token = manualToken.trim();
        if (token.includes("access_token=")) {
            const match = token.match(/access_token=([^&]+)/);
            if (match) token = match[1];
        }
        try {
            await db.settings.put({ key: "gdrive_token", value: token });
            (gdrive as any).accessToken = token;
            const userInfo = await gdrive.getUserInfo(token);
            await db.settings.put({ key: "gdrive_user", value: userInfo });
            toast.success("Đã lưu token!");
            setShowManualInput(false);
            setManualToken("");
            loadFolders();
        } catch (e) {
            toast.error("Token không hợp lệ.");
        }
    };

    const handleCreateFolder = async () => {
        const name = prompt("Nhập tên thư mục mới:");
        if (!name) return;
        try {
            const folder = await gdrive.createFolder(name);
            toast.success("Đã tạo thư mục!");
            await loadFolders();
            setSelectedFolderId(folder.id);
        } catch (error) {
            toast.error("Lỗi khi tạo thư mục");
        }
    };

    const handleStartExport = async () => {
        if (!workspace) return;

        const start = parseInt(rangeStart);
        const end = parseInt(rangeEnd);

        if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
            return toast.error("Khoảng chương lỗi!");
        }

        const chs = chapters.slice(start - 1, end);
        if (chs.length === 0) return toast.error("Không có chương!");

        setIsExporting(true);
        setExportProgress(5);

        try {
            const result = await exportWorkspace({
                workspace,
                chapters: chs,
                target: useDrive ? 'google-drive' : 'filesystem',
                format,
                language: lang,
                rangeStart,
                rangeEnd,
                folderId: selectedFolderId,
                onProgress: (p) => setExportProgress(p)
            });

            if (result.success) {
                toast.success(useDrive ? "Đã đẩy lên Google Drive!" : "Đã lưu file!");
            } else {
                toast.error("Lỗi: " + result.error);
            }
        } catch (error: any) {
            toast.error("Lỗi xuất file: " + error.message);
        } finally {
            setIsExporting(false);
            setExportProgress(0);
        }
    };

    const getManualAuthUrl = () => {
        if (!clientIdSetting?.value) return "#";
        const scope = encodeURIComponent("https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email");
        return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientIdSetting.value}&redirect_uri=http://localhost:3000&response_type=token&scope=${scope}`;
    };

    return {
        state: {
            format, lang, rangeStart, rangeEnd,
            isExporting, exportProgress,
            useDrive, driveFolders, selectedFolderId,
            showManualInput, manualToken,
            driveToken, driveUser, clientIdSetting
        },
        actions: {
            setFormat, setLang, setRangeStart, setRangeEnd,
            setUseDrive, setSelectedFolderId, setShowManualInput, setManualToken,
            handleConnectDrive, handleLogoutDrive, handleManualTokenSave,
            handleCreateFolder, handleStartExport, loadFolders, getManualAuthUrl
        }
    };
}

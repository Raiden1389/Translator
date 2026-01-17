"use client";

import { db } from "./db";

const DRIVE_API_URL = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3";

interface GoogleDriveConfig {
    clientId: string;
    scopes: string;
}

export class GoogleDriveService {
    private static instance: GoogleDriveService;
    private tokenClient: any = null;
    private accessToken: string | null = null;
    private expiresAt: number = 0;
    private clientId: string | null = null; // Store for lazy init

    private constructor() { }

    static getInstance() {
        if (!GoogleDriveService.instance) {
            GoogleDriveService.instance = new GoogleDriveService();
        }
        return GoogleDriveService.instance;
    }

    async init(clientId: string) {
        if (typeof window === "undefined") return;
        this.clientId = clientId;

        return new Promise<void>((resolve, reject) => {
            const checkGis = () => {
                if ((window as any).google?.accounts?.oauth2) {
                    this.initTokenClient();
                    resolve();
                } else {
                    setTimeout(checkGis, 100);
                }
            };
            checkGis();
        });
    }

    private initTokenClient() {
        if (!this.clientId || !(window as any).google?.accounts?.oauth2) return;

        console.log("Initializing Token Client with ID:", this.clientId);
        this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: this.clientId,
            scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email",
            callback: async (resp: any) => {
                if (resp.error) {
                    console.error("Auth Error:", resp);
                    return;
                }
                this.accessToken = resp.access_token;
                this.expiresAt = Date.now() + resp.expires_in * 1000;

                // Save to settings
                await db.settings.put({ key: "gdrive_token", value: this.accessToken });

                try {
                    const userInfo = await this.getUserInfo(this.accessToken!);
                    await db.settings.put({ key: "gdrive_user", value: userInfo });
                    // Provide feedback (e.g. reload UI or toast via callback if needed, but simple update is fine)
                } catch (e) {
                    console.error("Failed to fetch user info", e);
                }
            },
            error_callback: (error: any) => {
                console.error("GSI Auth Error Callback:", error);
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent("gdrive-auth-error", { detail: error }));
                }
            },
        });
    }

    async getAccessToken(): Promise<string> {
        if (this.accessToken && Date.now() < this.expiresAt) {
            return this.accessToken;
        }

        // Try getting from DB first
        const savedToken = await db.settings.get("gdrive_token");
        if (savedToken?.value) {
            this.accessToken = savedToken.value;
            // Note: We don't know the exact expiration if loaded from DB without metadata
            // Better to re-request if any API call fails with 401
            return this.accessToken!;
        }

        throw new Error("Mất kết nối với Google Drive. Hãy kết nối lại.");
    }

    connect() {
        if (!this.tokenClient) {
            // Try lazy init if script is now available
            if ((window as any).google?.accounts?.oauth2 && this.clientId) {
                this.initTokenClient();
            }
        }

        if (!this.tokenClient) {
            throw new Error("Google Script chưa tải xong. Vui lòng đợi vài giây rồi thử lại.");
        }

        this.tokenClient.requestAccessToken({ prompt: 'consent' });
    }

    async listFolders(parentId: string = "root") {
        const token = await this.getAccessToken();
        const q = `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        const resp = await fetch(`${DRIVE_API_URL}/files?q=${encodeURIComponent(q)}&fields=files(id, name)`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!resp.ok) throw new Error("Lỗi khi tải danh sách thư mục");
        const data = await resp.json();
        return data.files as { id: string; name: string }[];
    }

    async createFolder(name: string, parentId: string = "root") {
        const token = await this.getAccessToken();
        const resp = await fetch(`${DRIVE_API_URL}/files`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                mimeType: "application/vnd.google-apps.folder",
                parents: [parentId]
            })
        });

        if (!resp.ok) throw new Error("Lỗi khi tạo thư mục");
        const data = await resp.json();
        return data as { id: string; name: string };
    }

    async uploadFile(blob: Blob, filename: string, folderId: string = "root") {
        const token = await this.getAccessToken();

        // Multipart upload for metadata + media
        const metadata = {
            name: filename,
            parents: [folderId]
        };

        const formData = new FormData();
        formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
        formData.append("file", blob);

        const resp = await fetch(`${DRIVE_UPLOAD_URL}/files?uploadType=multipart`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });

        if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.error?.message || "Lỗi khi tải file lên Drive");
        }

        return await resp.json();
    }

    async getUserInfo(token: string) {
        const resp = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!resp.ok) throw new Error("Không thể lấy thông tin người dùng");
        return await resp.json();
    }

    async logout() {
        this.accessToken = null;
        this.expiresAt = 0;
        await db.settings.delete("gdrive_token");
        await db.settings.delete("gdrive_user");
        // Optional: Revoke token via Google Identity Services
        if ((window as any).google?.accounts?.oauth2?.revoke && this.accessToken) {
            (window as any).google.accounts.oauth2.revoke(this.accessToken, () => { });
        }
    }
}

export const gdrive = GoogleDriveService.getInstance();

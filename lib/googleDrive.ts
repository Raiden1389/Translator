import { db } from "./db";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-shell";

const DRIVE_API_URL = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3";

interface GoogleDriveConfig {
    clientId: string;
    scopes: string;
}

export class GoogleDriveService {
    private static instance: GoogleDriveService;
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

    isReady() {
        return !!this.clientId; // Always "ready" if we have a client ID now
    }

    async init(clientId: string) {
        if (typeof window === "undefined") return;
        this.clientId = clientId;
    }

    async getAccessToken(): Promise<string> {
        if (this.accessToken && Date.now() < this.expiresAt) {
            return this.accessToken;
        }

        const savedToken = await db.settings.get("gdrive_token");
        if (savedToken?.value) {
            this.accessToken = savedToken.value;
            return this.accessToken!;
        }

        throw new Error("Mất kết nối với Google Drive. Hãy kết nối lại.");
    }

    async connect() {
        if (!this.clientId) {
            const clientIdSetting = await db.settings.get("gdrive_client_id");
            if (clientIdSetting?.value) {
                this.clientId = clientIdSetting.value;
            }
        }

        if (!this.clientId) {
            throw new Error("Chưa cấu hình Client ID.");
        }

        // 1. Start local server in Rust
        const port = await invoke<number>("start_auth_server");
        const redirectUri = `http://127.0.0.1:${port}`;

        // 2. Construct OAuth URL
        const scope = encodeURIComponent("https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/userinfo.email");
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${this.clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;

        // 3. Open system browser
        await open(authUrl);

        // 4. Listen for token event
        return new Promise<void>((resolve, reject) => {
            console.log("Listening for oauth_token_received event...");
            const timeout = setTimeout(() => {
                if (unlisten) unlisten();
                console.error("OAuth timeout reached (120s)");
                reject(new Error("Hết thời gian chờ đăng nhập (120s). Bạn hãy đảm bảo đã nhấn 'Cho phép' trên trình duyệt và đã thêm URI vào Google Console."));
            }, 120000);

            let unlisten: () => void;
            listen<string>("oauth_token_received", async (event) => {
                console.log("Event oauth_token_received caught!", event);
                clearTimeout(timeout);
                const hash = event.payload;

                // Parse hash
                const params = new URLSearchParams(hash.substring(1));
                const token = params.get("access_token");
                const expiresIn = params.get("expires_in");

                if (token) {
                    this.accessToken = token;
                    this.expiresAt = Date.now() + (parseInt(expiresIn || "3600") * 1000);

                    await db.settings.put({ key: "gdrive_token", value: this.accessToken });

                    try {
                        const userInfo = await this.getUserInfo(this.accessToken);
                        await db.settings.put({ key: "gdrive_user", value: userInfo });
                    } catch (e) {
                        console.error("Failed to fetch user info", e);
                    }

                    resolve();
                } else {
                    reject(new Error("Không tìm thấy token trong phản hồi."));
                }

                if (unlisten) unlisten();
            }).then(u => unlisten = u);
        });
    }

    async listFolders(parentId: string = "root") {
        const token = await this.getAccessToken();
        const q = `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        const resp = await fetch(`${DRIVE_API_URL}/files?q=${encodeURIComponent(q)}&fields=files(id, name)`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}));
            console.error("Google Drive API Error (listFolders):", resp.status, errData);
            if (resp.status === 401) {
                // Token expired, clear it
                this.accessToken = null;
                await db.settings.delete("gdrive_token");
                throw new Error("Phiên làm việc hết hạn. Vui lòng kết nối lại Google Drive.");
            }
            throw new Error(`Lỗi khi tải danh sách thư mục (${resp.status})`);
        }
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

        if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}));
            console.error("Google Drive API Error (createFolder):", resp.status, errData);
            if (resp.status === 401) {
                this.accessToken = null;
                await db.settings.delete("gdrive_token");
                throw new Error("Phiên làm việc hết hạn. Vui lòng kết nối lại Google Drive.");
            }
            throw new Error(`Lỗi khi tạo thư mục (${resp.status})`);
        }
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
            const errData = await resp.json().catch(() => ({}));
            console.error("Google Drive API Error (uploadFile):", resp.status, errData);
            if (resp.status === 401) {
                this.accessToken = null;
                await db.settings.delete("gdrive_token");
                throw new Error("Phiên làm việc hết hạn. Vui lòng kết nối lại Google Drive.");
            }
            throw new Error(errData.error?.message || `Lỗi khi tải file lên Drive (${resp.status})`);
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
        if ((window as any).google?.accounts?.oauth2?.revoke && this.accessToken) {
            (window as any).google.accounts.oauth2.revoke(this.accessToken, () => {
                console.log("Token revoked");
            });
        }
        this.accessToken = null;
        this.expiresAt = 0;
        await db.settings.delete("gdrive_token");
        await db.settings.delete("gdrive_user");
    }
}

export const gdrive = GoogleDriveService.getInstance();

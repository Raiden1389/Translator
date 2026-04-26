/**
 * Gemini OAuth Settings Component with Multi-Account Support
 * Reverse-engineered from MCAI proxy pattern
 * Allows users to authenticate with multiple Google accounts
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  getAuthorizationUrl,
  exchangeCodeForTokens,
  getUserInfo,
  saveAccount,
  listAccounts,
  getActiveAccount,
  switchAccount,
  removeAccount,
  loadOAuthCredentials,
  refreshAccessToken,
  saveOAuthCredentials,
  type OAuthAccount
} from "@/lib/gemini/oauth-client";
import { CheckCircle2, XCircle, Loader2, ExternalLink, User, Trash2, Check, ChevronDown, ShieldCheck, ShieldAlert, ShieldX, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useOAuthPreference } from "@/lib/gemini/useOAuthPreference";
import { toast } from "sonner";

export function GeminiOAuthSettings() {
  const [accounts, setAccounts] = useState<OAuthAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<OAuthAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authCode, setAuthCode] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [tokenHealth, setTokenHealth] = useState<{ status: 'fresh' | 'expiring' | 'expired' | 'none'; remainingMin: number; hasRefresh: boolean } | null>(null);

  // OAuth preference toggle
  const { preferOAuth, isLoading: prefLoading, togglePreference } = useOAuthPreference();

  useEffect(() => {
    loadAccounts();
  }, []);

  // Check token health every 30s
  useEffect(() => {
    checkTokenHealth();
    const interval = setInterval(checkTokenHealth, 30_000);
    return () => clearInterval(interval);
  }, []);

  const checkTokenHealth = async () => {
    try {
      const creds = await loadOAuthCredentials();
      if (!creds) {
        setTokenHealth({ status: 'none', remainingMin: 0, hasRefresh: false });
        return;
      }
      const remaining = creds.expires_at - Date.now();
      const remainingMin = Math.max(0, Math.round(remaining / 60_000));
      const hasRefresh = !!creds.refresh_token;
      if (remaining <= 0) {
        setTokenHealth({ status: 'expired', remainingMin: 0, hasRefresh });
      } else if (remainingMin <= 10) {
        setTokenHealth({ status: 'expiring', remainingMin, hasRefresh });
      } else {
        setTokenHealth({ status: 'fresh', remainingMin, hasRefresh });
      }
    } catch {
      setTokenHealth({ status: 'none', remainingMin: 0, hasRefresh: false });
    }
  };

  const loadAccounts = async () => {
    const allAccounts = await listAccounts();
    const active = await getActiveAccount();
    setAccounts(allAccounts);
    setActiveAccount(active);
  };

  const handleTogglePreference = async (checked: boolean) => {
    try {
      await togglePreference(checked);
      setSuccess(checked ? "✅ Đã bật OAuth mode" : "✅ Đã tắt OAuth mode");
    } catch {
      setError("Lỗi khi thay đổi cài đặt");
    }
  };

  const handleManualRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const creds = await loadOAuthCredentials();
      if (!creds?.refresh_token) {
        setError("Không có refresh token. Cần đăng nhập lại.");
        return;
      }
      const newCreds = await refreshAccessToken(creds.refresh_token);
      await saveOAuthCredentials(newCreds);

      // Sync refreshed credentials to account list
      const active = await getActiveAccount();
      if (active) {
        const allAccounts = await listAccounts();
        const updated = allAccounts.map(a =>
          a.id === active.id
            ? { ...a, credentials: newCreds, lastUsed: Date.now() }
            : a
        );
        const { db } = await import("@/lib/db");
        await db.settings.put({
          key: "geminiOAuthAccounts",
          value: JSON.stringify(updated)
        });
      }

      await checkTokenHealth();
      await loadAccounts();
      setSuccess("✅ Token đã được refresh thành công!");
      toast.success("Token refreshed!");
    } catch (err) {
      setError(`Refresh thất bại: ${err instanceof Error ? err.message : 'Unknown'}. Cần đăng nhập lại.`);
    } finally {
      setLoading(false);
    }
  };

  const processOAuthCode = async (rawCode: string) => {
    setLoading(true);
    setError(null);

    try {
      const { invoke } = await import("@tauri-apps/api/core");

      // Extract code from URL if provided as full URL/Query
      let code = rawCode.trim();
      if (code.includes("code=")) {
        const urlParams = new URLSearchParams(code.includes("?") ? code.split("?")[1] : code);
        const extracted = urlParams.get("code");
        if (extracted) code = extracted;
      }

      // Exchange code for tokens + user info in one native call
      const data = await invoke<any>("exchange_code_native", {
        code,
        clientId: process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID || "",
        clientSecret: process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_SECRET || "",
        redirectUri: "http://localhost:11451"
      });

      const credentials = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + (data.expires_in * 1000),
        token_type: data.token_type
      };

      const userInfo = data.user_info || { email: "unknown@gmail.com" };

      // Save account
      await saveAccount(credentials, {
        email: userInfo.email || "unknown@gmail.com",
        name: userInfo.name,
        picture: userInfo.picture
      });

      setSuccess(`Đã thêm tài khoản ${userInfo.email} thành công!`);
      setShowCodeInput(false);
      setAuthCode("");

      // Reload accounts
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi xác thực");
    } finally {
      setLoading(false);
    }
  };


  const handleStartAuth = async () => {
    setError(null);
    setSuccess(null);

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const { listen } = await import("@tauri-apps/api/event");
      const { open } = await import("@tauri-apps/plugin-shell");

      // 1. Start local server in Rust on Gemini's specific port
      const { state } = await invoke<{ port: number, state: string }>("start_auth_server", { port: 11451 });

      // 2. Open Google OAuth consent screen
      const authUrl = getAuthorizationUrl(state);
      await open(authUrl);

      // 3. Show manual input as fallback but start listening
      setShowCodeInput(true);
      setAuthCode("");

      // 4. Listen for code event (Automatic capture)
      const unlisten = await listen<string>("oauth_token_received", async (event) => {
        const payload = event.payload;
        if (payload.includes("code=")) {
          processOAuthCode(payload);
          unlisten(); // Stop listening after success
        }
      });

      // Optional: Auto-unlisten after some time to prevent leaks
      setTimeout(() => unlisten(), 300000); // 5 minutes

    } catch (err) {
      // Fallback: Just open in browser if Tauri logic fails
      const authUrl = getAuthorizationUrl();
      window.open(authUrl, "_blank");
      setShowCodeInput(true);
    }
  };

  const handleSubmitCode = async () => {
    if (!authCode.trim()) {
      setError("Vui lòng nhập mã xác thực");
      return;
    }
    await processOAuthCode(authCode);
  };

  const handleSwitchAccount = async (accountId: string) => {
    setLoading(true);
    try {
      await switchAccount(accountId);
      await loadAccounts();
      setSuccess(`Đã chuyển sang tài khoản ${accountId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi chuyển tài khoản");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    if (!confirm(`Xóa tài khoản ${accountId}?`)) return;

    setLoading(true);
    try {
      await removeAccount(accountId);
      await loadAccounts();
      setSuccess("Đã xóa tài khoản");
    } catch {
      toast.error("Không thể kết nối với Antigravity Manager. Vui lòng kiểm tra lại service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-purple-500/20 bg-linear-to-br from-purple-500/5 to-transparent">
      <CardHeader className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <span className="text-2xl">🔐</span>
              Gemini OAuth (Không cần API Key)
            </CardTitle>
            <CardDescription className="text-foreground/80">
              Sử dụng tài khoản Google để truy cập Gemini API - Hỗ trợ nhiều tài khoản
            </CardDescription>
          </div>
          <ChevronDown
            className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent className="space-y-4">
          {/* OAuth Mode Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
            <div className="flex-1">
              <Label htmlFor="oauth-mode" className="text-sm font-bold text-foreground cursor-pointer">
                Dùng OAuth thay vì API Key
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Bật để sử dụng tài khoản Google, tắt để dùng API Key (không cần xóa key)
              </p>
            </div>
            <Switch
              id="oauth-mode"
              checked={preferOAuth}
              onCheckedChange={handleTogglePreference}
              disabled={prefLoading || loading}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-black/20">
            {accounts.length > 0 ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm text-green-400">
                  {accounts.length} tài khoản đã kết nối
                </span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-400">Chưa có tài khoản nào</span>
              </>
            )}
          </div>

          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <AlertDescription className="text-green-400">{success}</AlertDescription>
            </Alert>
          )}

          {/* Accounts List */}
          {accounts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground/80">Danh sách tài khoản:</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${activeAccount?.id === account.id
                      ? "bg-primary/10 border-primary/30 shadow-sm"
                      : "bg-muted/30 border-border hover:bg-muted/50"
                      }`}
                  >
                    {/* Avatar */}
                    {account.picture ? (
                      <img
                        src={account.picture}
                        alt={account.name || account.email}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20">
                        <User className="w-5 h-5 text-accent" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate">
                          {account.name || account.email}
                        </p>
                        {activeAccount?.id === account.id && (
                          <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full font-bold border border-green-500/20">
                            Active
                          </span>
                        )}
                        {/* Token Health Badge */}
                        {activeAccount?.id === account.id && tokenHealth && tokenHealth.status !== 'none' && (
                          tokenHealth.status === 'fresh' ? (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-mono border border-emerald-500/20 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              Token OK · {tokenHealth.remainingMin}m
                            </span>
                          ) : tokenHealth.status === 'expiring' ? (
                            <span className="text-[10px] bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full font-mono border border-yellow-500/20 flex items-center gap-1 animate-pulse">
                              <ShieldAlert className="w-3 h-3" />
                              Sắp hết · {tokenHealth.remainingMin}m
                              {tokenHealth.hasRefresh && <RefreshCw className="w-3 h-3" />}
                            </span>
                          ) : (
                            <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-mono border border-red-500/20 flex items-center gap-1">
                              <ShieldX className="w-3 h-3" />
                              {tokenHealth.hasRefresh ? 'Hết hạn · Auto-refresh' : 'Hết hạn · Cần login lại'}
                            </span>
                          )
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{account.email}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Refresh/Re-login for active account with expired token */}
                      {activeAccount?.id === account.id && tokenHealth && (tokenHealth.status === 'expired' || tokenHealth.status === 'expiring') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleManualRefresh}
                          disabled={loading}
                          className="h-8 px-3 text-xs border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-400"
                        >
                          <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                      )}
                      {activeAccount?.id !== account.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSwitchAccount(account.id)}
                          disabled={loading}
                          className="h-8 px-3 text-xs border-accent/20 hover:bg-accent/10 hover:text-accent"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Chọn
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveAccount(account.id)}
                        disabled={loading}
                        className="h-8 px-3 text-xs border-destructive/20 hover:bg-destructive/10 text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Account */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-bold text-foreground">Thêm tài khoản mới:</h3>

            {!showCodeInput ? (
              <Button
                onClick={handleStartAuth}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Đăng nhập với Google
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-2">
                  <p className="text-sm text-foreground">
                    <strong>Bước 1:</strong> Cửa sổ Google OAuth đã mở
                  </p>
                  <p className="text-sm text-foreground">
                    <strong>Bước 2:</strong> Đăng nhập và cho phép truy cập
                  </p>
                  <p className="text-sm text-foreground">
                    <strong>Bước 3:</strong> Bạn chỉ cần <strong>Đăng nhập và Cho phép</strong>, ứng dụng sẽ tự động nhận diện và hoàn tất.
                  </p>
                </div>

                <input
                  type="text"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder="Hoặc dán URL/mã code tại đây nếu tự động thất bại..."
                  className="w-full px-4 py-2 rounded-lg bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary text-xs"
                />

                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmitCode}
                    disabled={loading || !authCode.trim()}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Đang xác thực...
                      </>
                    ) : (
                      "Xác nhận"
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowCodeInput(false);
                      setAuthCode("");
                      setError(null);
                    }}
                    variant="outline"
                    className="border-border hover:bg-muted"
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 space-y-2">
            <p className="text-sm text-primary font-semibold">💡 Lợi ích:</p>
            <ul className="text-sm text-foreground space-y-1 list-disc list-inside">
              <li>Không cần API key riêng</li>
              <li>Hỗ trợ nhiều tài khoản Google</li>
              <li>Chuyển đổi tài khoản dễ dàng</li>
              <li>Credentials lưu local, an toàn</li>
              <li>Tự động refresh token</li>
            </ul>
          </div>

        </CardContent>
      )}
    </Card>
  );
}

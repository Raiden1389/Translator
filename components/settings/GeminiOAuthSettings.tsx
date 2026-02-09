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
  type OAuthAccount
} from "@/lib/gemini/oauth-client";
import { CheckCircle2, XCircle, Loader2, ExternalLink, User, Trash2, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useOAuthPreference } from "@/lib/gemini/useOAuthPreference";

export function GeminiOAuthSettings() {
  const [accounts, setAccounts] = useState<OAuthAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<OAuthAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authCode, setAuthCode] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);

  // OAuth preference toggle
  const { preferOAuth, isLoading: prefLoading, togglePreference } = useOAuthPreference();

  useEffect(() => {
    loadAccounts();
  }, []);

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
    } catch (err) {
      setError("Lỗi khi thay đổi cài đặt");
    }
  };

  const handleStartAuth = () => {
    setError(null);
    setSuccess(null);

    // Open Google OAuth consent screen
    const authUrl = getAuthorizationUrl();
    window.open(authUrl, "_blank");

    // Show code input
    setShowCodeInput(true);
  };

  const handleSubmitCode = async () => {
    if (!authCode.trim()) {
      setError("Vui lòng nhập mã xác thực");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Extract code from URL if user pasted full URL
      let code = authCode.trim();
      if (code.includes("code=")) {
        const match = code.match(/code=([^&]+)/);
        if (match) code = match[1];
      }

      // Exchange code for tokens
      const credentials = await exchangeCodeForTokens(code);

      // Get user info
      const userInfo = await getUserInfo(credentials.access_token);

      // Save account
      await saveAccount(credentials, userInfo);

      setSuccess(`✅ Đã thêm tài khoản ${userInfo.email} thành công!`);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi xóa tài khoản");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-purple-500/20 bg-linear-to-br from-purple-500/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <span className="text-2xl">🔐</span>
          Gemini OAuth (Không cần API Key)
        </CardTitle>
        <CardDescription className="text-foreground/80">
          Sử dụng tài khoản Google để truy cập Gemini API - Hỗ trợ nhiều tài khoản
        </CardDescription>
      </CardHeader>
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
            className="data-[state=checked]:bg-purple-600"
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
            <h3 className="text-sm font-bold text-gray-300">Danh sách tài khoản:</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${activeAccount?.id === account.id
                    ? "bg-purple-500/20 border-purple-500/50"
                    : "bg-black/20 border-gray-700 hover:bg-black/30"
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
                    <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center">
                      <User className="w-5 h-5 text-purple-300" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">
                        {account.name || account.email}
                      </p>
                      {activeAccount?.id === account.id && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{account.email}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {activeAccount?.id !== account.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSwitchAccount(account.id)}
                        disabled={loading}
                        className="h-8 px-3 text-xs border-purple-500/50 hover:bg-purple-500/20"
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
                      className="h-8 px-3 text-xs border-red-500/50 hover:bg-red-500/20 text-red-400"
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
                  <strong>Bước 3:</strong> Sau khi redirect về localhost:11451, copy URL hoặc mã code
                </p>
              </div>

              <input
                type="text"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                placeholder="Dán URL hoặc mã code ở đây..."
                className="w-full px-4 py-2 rounded-lg bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
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
    </Card>
  );
}

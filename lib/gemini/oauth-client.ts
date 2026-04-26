/**
 * Gemini OAuth Client
 * Reverse-engineered from MCAI proxy pattern
 * Implements OAuth 2.0 flow for Gemini API without requiring API keys
 */

import { invoke } from "@tauri-apps/api/core";
import { db } from "../db";

// OAuth Configuration — secrets loaded from .env.local (gitignored)
const OAUTH_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID || "",
  clientSecret: process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_SECRET || "",
  redirectUri: "http://localhost:11451",
  scopes: [
    // Official Gemini API scope (requires registration in Cloud Console)
    "https://www.googleapis.com/auth/generative-language.retriever",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "openid"
  ],
  authEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token"
};

export interface OAuthCredentials {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp
  token_type: string;
}

export interface OAuthAccount {
  id: string; // Unique ID (email hash or similar)
  email: string;
  name?: string;
  picture?: string;
  credentials: OAuthCredentials;
  addedAt: number;
  lastUsed: number;
}

/**
 * Step 1: Generate OAuth authorization URL
 */
export function getAuthorizationUrl(state?: string): string {
  const params: Record<string, string> = {
    client_id: OAUTH_CONFIG.clientId,
    redirect_uri: OAUTH_CONFIG.redirectUri,
    response_type: "code",
    scope: OAUTH_CONFIG.scopes.join(" "),
    access_type: "offline", // Get refresh token
    prompt: "consent" // Force consent screen to ensure refresh token
  };

  if (state) {
    params.state = state;
  }

  const searchParams = new URLSearchParams(params);
  return `${OAUTH_CONFIG.authEndpoint}?${searchParams.toString()}`;
}

/**
 * Step 2: Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(authCode: string): Promise<OAuthCredentials> {
  try {
    const data = await invoke<any>("exchange_code_native", {
      code: authCode,
      clientId: OAUTH_CONFIG.clientId,
      clientSecret: OAUTH_CONFIG.clientSecret,
      redirectUri: OAUTH_CONFIG.redirectUri
    });

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in * 1000),
      token_type: data.token_type
    };
  } catch (err) {
    throw new Error(`OAuth token exchange failed: ${err}`);
  }
}

/**
 * Step 3: Refresh access token when expired
 * Uses Tauri native request to bypass CSP restrictions
 */
export async function refreshAccessToken(refreshToken: string): Promise<OAuthCredentials> {
  try {
    const data = await invoke<any>("refresh_token_native", {
      refreshToken,
      clientId: OAUTH_CONFIG.clientId,
      clientSecret: OAUTH_CONFIG.clientSecret
    });

    return {
      access_token: data.access_token,
      refresh_token: refreshToken, // Keep existing refresh token
      expires_at: Date.now() + (data.expires_in * 1000),
      token_type: data.token_type
    };
  } catch (err) {
    throw new Error(`Token refresh failed: ${err}`);
  }
}

/**
 * Step 4: Save credentials to IndexedDB
 */
export async function saveOAuthCredentials(credentials: OAuthCredentials): Promise<void> {
  await db.settings.put({
    key: "geminiOAuthCredentials",
    value: JSON.stringify(credentials)
  });
}

/**
 * Step 5: Load credentials from IndexedDB
 */
export async function loadOAuthCredentials(): Promise<OAuthCredentials | null> {
  const setting = await db.settings.get("geminiOAuthCredentials");
  if (!setting?.value) return null;

  try {
    return JSON.parse(setting.value as string) as OAuthCredentials;
  } catch {
    return null;
  }
}

let refreshPromise: Promise<string | null> | null = null;

/**
 * Step 6: Get valid access token (auto-refresh if needed)
 * Uses a singleton promise to prevent concurrent refresh requests
 */
export async function getValidAccessToken(): Promise<string | null> {
  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    console.log("[OAuth] Waiting for concurrent token refresh...");
    return refreshPromise;
  }

  const credentials = await loadOAuthCredentials();
  if (!credentials) return null;

  // Check if token is expired (with 5min buffer)
  const isExpired = Date.now() >= (credentials.expires_at - 5 * 60 * 1000);

  if (!isExpired) {
    return credentials.access_token;
  }

  // Token is expired, start refresh process
  if (!credentials.refresh_token) {
    console.warn("[OAuth] Token expired, no refresh_token available. Need re-login.");
    return null;
  }

  refreshPromise = (async () => {
    try {
      console.log("[OAuth] Token expired, refreshing...");
      const newCredentials = await refreshAccessToken(credentials.refresh_token);
      
      // Safety check: if backend didn't return a new refresh token, keep the old one
      if (!newCredentials.refresh_token) {
        newCredentials.refresh_token = credentials.refresh_token;
      }

      await saveOAuthCredentials(newCredentials);
      await syncCredentialsToAccountList(newCredentials);
      
      console.log("[OAuth] Token refreshed successfully. Expires in", Math.round((newCredentials.expires_at - Date.now()) / 60000), "min");
      return newCredentials.access_token;
    } catch (err) {
      console.error("[OAuth] Token refresh failed:", err);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Step 6b: Sync refreshed credentials back to account list
 * Prevents stale credentials when account list is reloaded
 */
async function syncCredentialsToAccountList(newCredentials: OAuthCredentials): Promise<void> {
  try {
    const activeAccount = await getActiveAccount();
    if (!activeAccount) return;

    const accounts = await listAccounts();
    const updatedAccounts = accounts.map(a =>
      a.id === activeAccount.id
        ? { ...a, credentials: newCredentials, lastUsed: Date.now() }
        : a
    );

    await db.settings.put({
      key: "geminiOAuthAccounts",
      value: JSON.stringify(updatedAccounts)
    });
  } catch (err) {
    console.warn("[OAuth] Failed to sync credentials to account list:", err);
  }
}

/**
 * Step 7: Make Gemini API request with OAuth token
 */
export async function makeOAuthRequest(
  model: string,
  payload: string
): Promise<unknown> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error("No valid OAuth credentials. Please authenticate first.");
  }

  // Check if we're in Tauri
  // @ts-expect-error - window internals check
  const isTauri = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;

  if (isTauri) {
    // Use Tauri native request with OAuth
    const responseText = await invoke<string>("native_gemini_oauth_request", {
      payload,
      model: model.trim(),
      accessToken
    });

    return JSON.parse(responseText);
  } else {
    // Browser fallback
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.trim()}:generateContent`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: payload
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || response.statusText);
    }

    return await response.json();
  }
}

/**
 * Step 8: Clear OAuth credentials (logout)
 */
export async function clearOAuthCredentials(): Promise<void> {
  await db.settings.delete("geminiOAuthCredentials");
}

/**
 * Step 9: Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const credentials = await loadOAuthCredentials();
  return credentials !== null;
}

/**
 * Step 10: Get user info from Google API
 */
export async function getUserInfo(accessToken: string): Promise<{ email: string; name?: string; picture?: string }> {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: {
      "Authorization": `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user info");
  }

  const data = await response.json();
  return {
    email: data.email,
    name: data.name,
    picture: data.picture
  };
}

/**
 * Step 11: Save account with user info
 */
export async function saveAccount(credentials: OAuthCredentials, userInfo: { email: string; name?: string; picture?: string }): Promise<void> {
  const accounts = await listAccounts();

  const account: OAuthAccount = {
    id: userInfo.email, // Use email as unique ID
    email: userInfo.email,
    name: userInfo.name,
    picture: userInfo.picture,
    credentials,
    addedAt: Date.now(),
    lastUsed: Date.now()
  };

  // Remove existing account with same email
  const filteredAccounts = accounts.filter(a => a.id !== account.id);
  filteredAccounts.push(account);

  // Save accounts list
  await db.settings.put({
    key: "geminiOAuthAccounts",
    value: JSON.stringify(filteredAccounts)
  });

  // Set as active account
  await db.settings.put({
    key: "geminiOAuthActiveAccount",
    value: account.id
  });

  // Also save to old key for backward compatibility
  await saveOAuthCredentials(credentials);
}

/**
 * Step 12: List all saved accounts
 */
export async function listAccounts(): Promise<OAuthAccount[]> {
  const setting = await db.settings.get("geminiOAuthAccounts");
  if (!setting?.value) return [];

  try {
    return JSON.parse(setting.value as string) as OAuthAccount[];
  } catch {
    return [];
  }
}

/**
 * Step 13: Get active account
 */
export async function getActiveAccount(): Promise<OAuthAccount | null> {
  const activeIdSetting = await db.settings.get("geminiOAuthActiveAccount");
  if (!activeIdSetting?.value) return null;

  const accounts = await listAccounts();
  return accounts.find(a => a.id === activeIdSetting.value) || null;
}

/**
 * Step 14: Switch to different account
 */
export async function switchAccount(accountId: string): Promise<void> {
  const accounts = await listAccounts();
  const account = accounts.find(a => a.id === accountId);

  if (!account) {
    throw new Error("Account not found");
  }

  // Update last used
  account.lastUsed = Date.now();
  const updatedAccounts = accounts.map(a => a.id === accountId ? account : a);

  await db.settings.put({
    key: "geminiOAuthAccounts",
    value: JSON.stringify(updatedAccounts)
  });

  // Set as active
  await db.settings.put({
    key: "geminiOAuthActiveAccount",
    value: accountId
  });

  // Update credentials for backward compatibility
  await saveOAuthCredentials(account.credentials);
}

/**
 * Step 15: Remove account
 */
export async function removeAccount(accountId: string): Promise<void> {
  const accounts = await listAccounts();
  const filteredAccounts = accounts.filter(a => a.id !== accountId);

  await db.settings.put({
    key: "geminiOAuthAccounts",
    value: JSON.stringify(filteredAccounts)
  });

  // If removed account was active, switch to first available
  const activeAccount = await getActiveAccount();
  if (activeAccount?.id === accountId) {
    if (filteredAccounts.length > 0) {
      await switchAccount(filteredAccounts[0].id);
    } else {
      await clearOAuthCredentials();
      await db.settings.delete("geminiOAuthActiveAccount");
    }
  }
}


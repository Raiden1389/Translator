"use client";

import { db } from "@/lib/db";

// ===================================================
// CLOUD SYNC — Push/Pull via raidenhub.xyz R2
// ===================================================

const HUB_URL = "https://raidenhub.xyz/api/sync";

/** Get stored token from localStorage */
function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("cloudSyncToken") || "";
}

/** Save token to localStorage */
export function setToken(token: string) {
  localStorage.setItem("cloudSyncToken", token);
}

/** Check if token is set */
export function hasToken(): boolean {
  return !!getToken();
}

/** Auth headers */
function headers(extra?: Record<string, string>): Record<string, string> {
  return { Authorization: `Bearer ${getToken()}`, ...extra };
}

// ── Types ─────────────────────────────────────────

export interface CloudWorkspaceInfo {
  id: string;
  title: string;
  chapterCount: number;
  pushedAt: string;
}

export interface CloudSyncResult {
  pushed: number;
  skipped: number;
  errors: string[];
}

// ── Push ──────────────────────────────────────────

/**
 * Push a single workspace to cloud.
 * Serializes workspace metadata + translated chapters + dictionary.
 */
export async function pushWorkspace(workspaceId: string): Promise<{ chapterCount: number; sizeKB: number }> {
  const ws = await db.workspaces.get(workspaceId);
  if (!ws) throw new Error(`Workspace ${workspaceId} not found`);

  const chapters = await db.chapters
    .where("workspaceId").equals(workspaceId)
    .filter(c => c.status === "translated" || !!c.content_translated)
    .sortBy("order");

  if (chapters.length === 0) throw new Error(`No translated chapters in "${ws.title}"`);

  const dictionary = await db.dictionary
    .where("workspaceId").equals(workspaceId)
    .toArray();

  // Strip heavy/unnecessary fields for cloud storage
  const payload = JSON.stringify({
    workspace: {
      id: ws.id, title: ws.title, author: ws.author, cover: ws.cover,
      description: ws.description, genre: ws.genre,
      sourceLang: ws.sourceLang, targetLang: ws.targetLang,
      createdAt: ws.createdAt, updatedAt: ws.updatedAt,
    },
    chapters: chapters.map(c => ({
      title: c.title,
      title_translated: c.title_translated,
      content_original: c.content_original,
      content_translated: c.content_translated,
      order: c.order,
      status: c.status,
      updatedAt: c.updatedAt,
    })),
    dictionary: dictionary.map(d => ({
      original: d.original,
      translated: d.translated,
      type: d.type,
    })),
  });

  const rawSizeKB = Math.round(new Blob([payload]).size / 1024);

  // Gzip compress payload
  let body: BodyInit = payload;
  let contentEncoding = "";
  try {
    const stream = new Blob([payload]).stream().pipeThrough(new CompressionStream("gzip"));
    body = await new Response(stream).blob();
    contentEncoding = "gzip";
  } catch { body = payload; /* fallback: send uncompressed */ }

  const sizeKB = Math.round((body instanceof Blob ? body.size : new Blob([body as string]).size) / 1024);
  const url = `${HUB_URL}/${encodeURIComponent(workspaceId)}`;
  console.log(`[CloudSync] PUT "${ws.title}" → ${url} (${chapters.length} ch, ${rawSizeKB} KB → ${sizeKB} KB gzip)`);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "PUT",
      headers: headers({
        "Content-Type": "application/json",
        ...(contentEncoding ? { "Content-Encoding": contentEncoding } : {}),
        "X-Ws-Title": encodeURIComponent(ws.title),
        "X-Ws-Chapters": String(chapters.length),
      }),
      body,
    });
  } catch (fetchErr) {
    console.error(`[CloudSync] FETCH ERROR for "${ws.title}":`, fetchErr);
    throw new Error(`Network error: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`);
  }

  console.log(`[CloudSync] Response: ${res.status} ${res.statusText}`);

  if (!res.ok) {
    const err = await res.text();
    console.error(`[CloudSync] Server error: ${res.status}`, err);
    throw new Error(`Push failed (${res.status}): ${err}`);
  }

  // Track last cloud sync
  localStorage.setItem(`cloudSync_${workspaceId}`, new Date().toISOString());
  localStorage.setItem(`cloudSyncCount_${workspaceId}`, String(chapters.length));
  console.log(`[CloudSync] ✅ "${ws.title}" pushed (${sizeKB} KB)`);

  return { chapterCount: chapters.length, sizeKB };
}

/**
 * Push only NEW chapters (delta) — for auto-push after translation.
 * Sends only chapters not yet on cloud. Worker merges into existing data.
 * Falls back to full push if no cloud data exists.
 */
export async function pushDelta(workspaceId: string): Promise<{ chapterCount: number; sizeKB: number; delta: boolean }> {
  // Get last push time
  const lastPushStr = localStorage.getItem(`cloudSync_${workspaceId}`);
  const lastPushTime = lastPushStr ? new Date(lastPushStr) : null;

  // No previous push → full push
  if (!lastPushTime) {
    const result = await pushWorkspace(workspaceId);
    return { ...result, delta: false };
  }

  const ws = await db.workspaces.get(workspaceId);
  if (!ws) throw new Error(`Workspace ${workspaceId} not found`);

  // Find chapters translated AFTER last push (new + re-translated)
  const allChapters = await db.chapters
    .where("workspaceId").equals(workspaceId)
    .filter(c => c.status === "translated" || !!c.content_translated)
    .sortBy("order");

  const changedChapters = allChapters.filter(c =>
    c.lastTranslatedAt && new Date(c.lastTranslatedAt) > lastPushTime
  );

  if (changedChapters.length === 0) {
    console.log(`[CloudSync] "${ws.title}" no changes since last push`);
    return { chapterCount: allChapters.length, sizeKB: 0, delta: true };
  }

  const payload = JSON.stringify({
    workspace: { id: ws.id, title: ws.title, sourceLang: ws.sourceLang, targetLang: ws.targetLang },
    chapters: changedChapters.map(c => ({
      title: c.title, title_translated: c.title_translated,
      content_original: c.content_original, content_translated: c.content_translated,
      order: c.order, status: c.status, updatedAt: c.updatedAt,
    })),
    dictionary: [],
  });

  // Gzip compress
  let body: BodyInit = payload;
  let contentEncoding = "";
  try {
    const stream = new Blob([payload]).stream().pipeThrough(new CompressionStream("gzip"));
    body = await new Response(stream).blob();
    contentEncoding = "gzip";
  } catch { body = payload; }

  const sizeKB = Math.round((body instanceof Blob ? body.size : payload.length) / 1024);
  console.log(`[CloudSync] DELTA "${ws.title}": ${changedChapters.length} changed chapters (${sizeKB} KB gzip)`);

  const res = await fetch(`${HUB_URL}/${encodeURIComponent(workspaceId)}`, {
    method: "PUT",
    headers: headers({
      "Content-Type": "application/json",
      ...(contentEncoding ? { "Content-Encoding": contentEncoding } : {}),
      "X-Ws-Title": encodeURIComponent(ws.title),
      "X-Ws-Chapters": String(allChapters.length),
      "X-Delta": "true",
    }),
    body,
  });

  if (!res.ok) throw new Error(`Delta push failed (${res.status})`);

  localStorage.setItem(`cloudSync_${workspaceId}`, new Date().toISOString());
  localStorage.setItem(`cloudSyncCount_${workspaceId}`, String(allChapters.length));
  console.log(`[CloudSync] ✅ DELTA "${ws.title}" pushed ${changedChapters.length} chapters`);

  return { chapterCount: changedChapters.length, sizeKB, delta: true };
}
/**
 * Push all dirty workspaces (those with more translated chapters than cloud).
 */
export async function pushAllDirty(
  onProgress?: (current: number, total: number, wsTitle: string) => void
): Promise<CloudSyncResult> {
  const allWs = await db.workspaces.toArray();
  const result: CloudSyncResult = { pushed: 0, skipped: 0, errors: [] };

  // Filter to workspaces with translated chapters
  const pushable: typeof allWs = [];
  for (const ws of allWs) {
    const hasTranslated = await db.chapters
      .where("workspaceId").equals(ws.id!)
      .filter(c => c.status === "translated" || !!c.content_translated)
      .count();
    if (hasTranslated > 0) pushable.push(ws);
  }

  for (let i = 0; i < pushable.length; i++) {
    const ws = pushable[i];
    try {
      const deltaResult = await pushDelta(ws.id!);
      if (deltaResult.sizeKB === 0) {
        result.skipped++;
        onProgress?.(i + 1, pushable.length, `${ws.title} ✓`);
      } else {
        result.pushed++;
        onProgress?.(i + 1, pushable.length, `${ws.title} (${deltaResult.chapterCount} ch)`);
      }
    } catch (err) {
      result.errors.push(`${ws.title}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}

// ── Pull corrections ─────────────────────────────

/** Pull corrections from cloud (submitted by mobile) */
export async function pullCorrections(workspaceId: string): Promise<unknown[]> {
  const res = await fetch(`${HUB_URL}/${encodeURIComponent(workspaceId)}/corrections`, {
    headers: headers(),
  });
  if (!res.ok) return [];
  return res.json();
}

// ── List ──────────────────────────────────────────

/** List all workspaces on cloud */
export async function listCloudWorkspaces(): Promise<CloudWorkspaceInfo[]> {
  const res = await fetch(`${HUB_URL}/list`, { headers: headers() });
  if (!res.ok) throw new Error(`List failed: ${res.status}`);
  const data = await res.json();
  return data.workspaces;
}

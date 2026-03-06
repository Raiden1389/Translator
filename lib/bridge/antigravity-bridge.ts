/**
 * Antigravity Bridge Service
 *
 * File-based translation bridge: App exports chapters to JSON,
 * Antigravity Agent translates via chat, App imports results.
 *
 * Naming convention (v2):
 *   Inbox:  ~/.raiden/bridge/inbox_{shortId}.json
 *   Outbox: ~/.raiden/bridge/out_{shortId}_ch{order}.json
 *
 * Backward-compat: still reads legacy ag_inbox_/ag_outbox_ files.
 */
import { writeTextFile, readTextFile, exists, mkdir, remove, readDir, BaseDirectory } from "@tauri-apps/plugin-fs";
import { db } from "@/lib/db";
import type { Chapter, DictionaryEntry, CorrectionEntry } from "@/lib/db";
import { applyCorrectionsToChapters } from "@/lib/services/corrections.service";

// ─── Schema ────────────────────────────────────────────────────

const SCHEMA_VERSION = 1;
const BRIDGE_DIR = ".raiden/bridge";

export interface AgInbox {
  schemaVersion: number;
  jobId: string;
  createdAt: string;
  workspaceId: string;
  config: {
    prompt: string;
    temperature: number;
  };
  glossary: Pick<DictionaryEntry, "original" | "translated" | "type" | "gender">[];
  corrections: Pick<CorrectionEntry, "type" | "from" | "to" | "pattern" | "replace">[];
  chapters: {
    id: number;
    order: number;
    title: string;
    content: string;
  }[];
}

export interface AgOutboxResult {
  id: number;
  order?: number;
  title: string;
  content: string;
}

// ─── Helpers ───────────────────────────────────────────────────

/** Generate 8-char short ID from UUID */
function generateJobId(): string {
  return crypto.randomUUID().split("-")[0]; // e.g. "7a89877b"
}

const FS_OPTS = { baseDir: BaseDirectory.AppData };

async function ensureBridgeDir(): Promise<void> {
  if (!(await exists(BRIDGE_DIR, FS_OPTS))) {
    await mkdir(BRIDGE_DIR, { ...FS_OPTS, recursive: true });
  }
}

// ─── Export (App → Agent) ──────────────────────────────────────

export async function exportInbox(
  workspaceId: string,
  chapters: Chapter[],
  glossary: DictionaryEntry[],
  corrections: CorrectionEntry[],
  prompt: string,
  temperature: number,
): Promise<{ jobId: string; path: string; chapterCount: number }> {
  await ensureBridgeDir();
  const jobId = generateJobId();

  const inbox: AgInbox = {
    schemaVersion: SCHEMA_VERSION,
    jobId,
    createdAt: new Date().toISOString(),
    workspaceId,
    config: { prompt, temperature },
    glossary: glossary.map(g => ({
      original: g.original,
      translated: g.translated,
      type: g.type,
      gender: g.gender,
    })),
    corrections: corrections.map(c => ({
      type: c.type,
      from: c.from,
      to: c.to,
      pattern: c.pattern,
      replace: c.replace,
    })),
    chapters: chapters.map(c => ({
      id: c.id!,
      order: c.order,
      title: c.title,
      content: c.content_original,
    })),
  };

  // New naming: inbox_{shortId}.json
  const filePath = `${BRIDGE_DIR}/inbox_${jobId}.json`;
  await writeTextFile(filePath, JSON.stringify(inbox, null, 2), FS_OPTS);

  return { jobId, path: filePath, chapterCount: chapters.length };
}

// ─── Import (Agent → App) ──────────────────────────────────────

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

/** Find outbox files — supports both new (out_) and legacy (ag_outbox_) naming */
async function findOutboxFilesForJob(jobId: string): Promise<string[]> {
  if (!(await exists(BRIDGE_DIR, FS_OPTS))) return [];
  const entries = await readDir(BRIDGE_DIR, FS_OPTS);
  return entries
    .filter(e => e.isFile && e.name.endsWith(".json") && (
      e.name.startsWith(`out_${jobId}`) ||      // New: out_{id}_ch26.json
      e.name.startsWith(`ag_outbox_${jobId}`)    // Legacy: ag_outbox_{uuid}_ch9938.json
    ))
    .map(e => `${BRIDGE_DIR}/${e.name}`);
}

/** Find latest outbox job ID — supports both naming conventions */
async function findLatestOutboxJobId(): Promise<string | null> {
  if (!(await exists(BRIDGE_DIR, FS_OPTS))) return null;
  const entries = await readDir(BRIDGE_DIR, FS_OPTS);
  const outboxFiles = entries
    .filter(e => e.isFile && e.name.endsWith(".json") && (
      e.name.startsWith("out_") || e.name.startsWith("ag_outbox_")
    ))
    .map(e => e.name)
    .sort()
    .reverse();
  if (outboxFiles.length === 0) return null;

  // Try new naming first: out_{shortId}_ch*.json
  const newMatch = outboxFiles[0].match(/^out_([a-f0-9]+)/);
  if (newMatch) return newMatch[1];

  // Fallback to legacy: ag_outbox_{uuid}*.json
  const legacyMatch = outboxFiles[0].match(/^ag_outbox_([a-f0-9-]+)/);
  return legacyMatch ? legacyMatch[1] : null;
}

export async function importOutbox(
  currentWorkspaceId: string,
  expectedJobId?: string,
): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

  // Resolve jobId
  const actualJobId = expectedJobId || await findLatestOutboxJobId();
  if (!actualJobId) {
    result.errors.push("Không tìm thấy outbox nào trong thư mục bridge");
    return result;
  }

  // Find all outbox files for this job
  const outboxPaths = await findOutboxFilesForJob(actualJobId);
  if (outboxPaths.length === 0) {
    result.errors.push(`Không tìm thấy outbox cho job ${actualJobId}`);
    return result;
  }

  // Merge results from all files
  const allResults: AgOutboxResult[] = [];
  let workspaceId = "";

  for (const filePath of outboxPaths) {
    try {
      const raw = await readTextFile(filePath, FS_OPTS);
      const data = JSON.parse(raw) as Record<string, unknown>;

      // Case 1: Legacy wrapper with results array
      if (Array.isArray(data.results)) {
        workspaceId = workspaceId || (data.workspaceId as string) || "";
        for (const r of data.results as Record<string, unknown>[]) {
          allResults.push({
            id: r.id as number,
            order: r.order as number | undefined,
            title: (r.title_translated || r.title || "") as string,
            content: (r.content_translated || r.content || "") as string,
          });
        }
      }
      // Case 2: Flat per-chapter file (new format)
      else if (data.id !== undefined && (data.content || data.content_translated)) {
        allResults.push({
          id: data.id as number,
          order: data.order as number | undefined,
          title: (data.title_translated || data.title || "") as string,
          content: (data.content_translated || data.content || "") as string,
        });
      }
      else {
        result.errors.push(`Không nhận dạng được format: ${filePath}`);
      }
    } catch (err) {
      result.errors.push(`Lỗi đọc file ${filePath}: ${err}`);
    }
  }

  // Validate workspace
  if (workspaceId && workspaceId !== currentWorkspaceId) {
    result.errors.push(`Workspace mismatch: expected ${currentWorkspaceId}, got ${workspaceId}`);
    return result;
  }

  // Import merged results
  for (const r of allResults) {
    const title = (r.title || "").trim();
    const content = (r.content || "").trim();

    if (!content) {
      result.skipped++;
      result.errors.push(`Chapter ${r.id}: nội dung dịch rỗng, bỏ qua`);
      continue;
    }

    const chapter = await db.chapters.get(r.id);
    if (!chapter) {
      result.skipped++;
      result.errors.push(`Chapter ${r.id}: không tồn tại trong DB, bỏ qua`);
      continue;
    }

    const wordCount = content.split(/\s+/).filter(Boolean).length;

    await db.chapters.update(r.id, {
      content_translated: content,
      title_translated: title,
      wordCountTranslated: wordCount,
      status: "translated",
      lastTranslatedAt: new Date(),
      translationModel: "antigravity-bridge",
    });
    result.imported++;
  }

  // Post-processing: Apply global corrections (Luyện Văn)
  if (result.imported > 0) {
    const importedIds = allResults
      .filter(r => (r.content || "").trim())
      .map(r => r.id);
    const corrected = await applyCorrectionsToChapters(importedIds);
    if (corrected > 0) {
      result.errors.push(`✅ Luyện Văn: đã sửa ${corrected}/${importedIds.length} chương`);
    }

    // Cleanup ALL files after successful import
    await cleanupJobFiles(actualJobId);
  }

  return result;
}

// ─── Cleanup ───────────────────────────────────────────────────

/** Remove inbox + all outbox files for a job (both new and legacy naming) */
async function cleanupJobFiles(jobId: string): Promise<void> {
  try {
    const entries = await readDir(BRIDGE_DIR, FS_OPTS);
    const jobFiles = entries.filter(e => e.isFile && e.name.endsWith(".json") && (
      e.name === `inbox_${jobId}.json` ||          // New inbox
      e.name === `ag_inbox_${jobId}.json` ||        // Legacy inbox
      e.name.startsWith(`out_${jobId}`) ||          // New outbox
      e.name.startsWith(`ag_outbox_${jobId}`)       // Legacy outbox
    ));
    for (const f of jobFiles) {
      try { await remove(`${BRIDGE_DIR}/${f.name}`, FS_OPTS); } catch { /* noop */ }
    }
  } catch { /* noop */ }
}

// ─── Status Check ──────────────────────────────────────────────

export async function hasPendingOutbox(): Promise<boolean> {
  const jobId = await findLatestOutboxJobId();
  return jobId !== null;
}

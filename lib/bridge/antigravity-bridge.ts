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
import type { Chapter, DictionaryEntry, CorrectionEntry, BridgeJobEntry } from "@/lib/db";
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

export interface DoneSentinel {
  jobId: string;
  completedAt: string;
  totalChapters: number;
  completedChapters: number[];
}

export interface PollProgress {
  completed: number;
  total: number;
  completedOrders: number[];
  isDone: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────

/** Generate 8-char short ID from UUID */
function generateJobId(): string {
  return crypto.randomUUID().split("-")[0]; // e.g. "7a89877b"
}

const FS_OPTS = { baseDir: BaseDirectory.AppData };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isOutboxFileName(name: string, jobId: string): boolean {
  const escaped = escapeRegExp(jobId);
  return new RegExp(`^out_${escaped}_ch\\d+\\.json$`).test(name)
    || new RegExp(`^ag_outbox_${escaped}(?:_ch\\d+)?\\.json$`).test(name);
}

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
  const createdAt = new Date().toISOString();

  // Shared metadata (config, glossary, corrections)
  const sharedMeta = {
    schemaVersion: SCHEMA_VERSION,
    jobId,
    createdAt,
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
  };

  // Write one file per chapter: inbox_{jobId}_ch{order}.json
  let firstFilePath = "";
  for (const ch of chapters) {
    const inbox: AgInbox = {
      ...sharedMeta,
      chapters: [{
        id: ch.id!,
        order: ch.order,
        title: ch.title,
        content: ch.content_original,
      }],
    };
    const filePath = `${BRIDGE_DIR}/inbox_${jobId}_ch${ch.order}.json`;
    await writeTextFile(filePath, JSON.stringify(inbox, null, 2), FS_OPTS);
    if (!firstFilePath) firstFilePath = filePath;
  }

  // Log to history
  await logBridgeJob({
    jobId,
    workspaceId,
    status: 'exported',
    exportedAt: new Date(),
    chapterCount: chapters.length,
  });

  return { jobId, path: firstFilePath, chapterCount: chapters.length };
}

// ─── Import (Agent → App) ──────────────────────────────────────

export interface ImportResult {
  imported: number;
  importedOrders: number[];
  skipped: number;
  errors: string[];
}

/** Find outbox files — supports both new (out_) and legacy (ag_outbox_) naming */
export async function findOutboxFilesForJob(jobId: string): Promise<string[]> {
  if (!(await exists(BRIDGE_DIR, FS_OPTS))) return [];
  const entries = await readDir(BRIDGE_DIR, FS_OPTS);
  return entries
    .filter(e => e.isFile && isOutboxFileName(e.name, jobId))
    .map(e => `${BRIDGE_DIR}/${e.name}`);
}

/** Check if agent wrote the done sentinel file */
export async function checkDoneSentinel(jobId: string): Promise<DoneSentinel | null> {
  const filePath = `${BRIDGE_DIR}/done_${jobId}.json`;
  try {
    if (!(await exists(filePath, FS_OPTS))) return null;
    const raw = await readTextFile(filePath, FS_OPTS);
    return JSON.parse(raw) as DoneSentinel;
  } catch {
    return null;
  }
}

/** Poll job progress: count outbox files + check done sentinel */
export async function pollJobProgress(jobId: string, expectedCount: number): Promise<PollProgress> {
  const outFiles = await findOutboxFilesForJob(jobId);
  const done = await checkDoneSentinel(jobId);
  const outFileOrders = outFiles.map(f => {
    const match = f.match(/_ch(\d+)\.json$/);
    return match ? parseInt(match[1]) : -1;
  }).filter(n => n >= 0);
  const completedOrders = done?.completedChapters?.length ? done.completedChapters : outFileOrders;

  return {
    completed: completedOrders.length,
    total: done?.totalChapters || expectedCount,
    completedOrders,
    // `done_` is the only completion signal. Outbox count is progress only;
    // the agent writes QA before done, so importing early can skip QA fixes.
    isDone: done !== null,
  };
}

/** Find latest outbox job ID — uses done sentinel timestamps for accuracy */
async function findLatestOutboxJobId(): Promise<string | null> {
  if (!(await exists(BRIDGE_DIR, FS_OPTS))) return null;
  const entries = await readDir(BRIDGE_DIR, FS_OPTS);

  // Strategy 1: Find all done_*.json files — pick newest by completedAt
  const doneFiles = entries.filter(e => e.isFile && e.name.startsWith("done_") && e.name.endsWith(".json"));
  const doneCandidates: { jobId: string; completedAt: string }[] = [];
  for (const f of doneFiles) {
    const match = f.name.match(/^done_([a-f0-9]+)\.json$/);
    if (!match) continue;
    try {
      const raw = await readTextFile(`${BRIDGE_DIR}/${f.name}`, FS_OPTS);
      const data = JSON.parse(raw) as { completedAt?: string };
      doneCandidates.push({ jobId: match[1], completedAt: data.completedAt || "" });
    } catch { /* skip unreadable done files */ }
  }

  // Sort by completedAt descending → pick the newest that still has outbox files
  doneCandidates.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  for (const candidate of doneCandidates) {
    const hasOutbox = entries.some(e =>
      e.isFile && isOutboxFileName(e.name, candidate.jobId)
    );
    if (hasOutbox) return candidate.jobId;
  }

  // Strategy 2: No done files with outbox → collect unique jobIds from outbox files
  const outboxJobIds = new Set<string>();
  for (const e of entries) {
    if (!e.isFile || !e.name.endsWith(".json")) continue;
    const newMatch = e.name.match(/^out_([a-f0-9]+)_ch\d+\.json$/);
    if (newMatch) { outboxJobIds.add(newMatch[1]); continue; }
    const legacyMatch = e.name.match(/^ag_outbox_([a-f0-9-]+)(?:_ch\d+)?\.json$/);
    if (legacyMatch) outboxJobIds.add(legacyMatch[1]);
  }
  if (outboxJobIds.size === 0) return null;

  // Pick the jobId with the most outbox files (most likely the latest batch)
  let bestJobId = "";
  let bestCount = 0;
  for (const jid of outboxJobIds) {
    const count = entries.filter(e => e.isFile && isOutboxFileName(e.name, jid)).length;
    if (count > bestCount) { bestCount = count; bestJobId = jid; }
  }
  return bestJobId || null;
}

export async function importOutbox(
  currentWorkspaceId: string,
  expectedJobId?: string,
  expectedCount?: number,
): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, importedOrders: [], skipped: 0, errors: [] };

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
  const importedChapterIds: number[] = [];
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
    if (chapter.workspaceId !== currentWorkspaceId) {
      result.skipped++;
      result.errors.push(`Chapter ${r.id}: workspace mismatch, bỏ qua`);
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
    importedChapterIds.push(r.id);
    result.imported++;
    if (r.order !== undefined) {
      result.importedOrders.push(r.order);
    }
  }

  // Post-processing: Apply global corrections (Luyện Văn)
  if (result.imported > 0) {
    const importedIds = importedChapterIds;
    const corrected = await applyCorrectionsToChapters(importedIds);
    if (corrected > 0) {
      result.errors.push(`✅ Luyện Văn: đã sửa ${corrected}/${importedIds.length} chương`);
    }

    // Parse QA report and apply hard fixes
    const qaReport = await parseQAReport(actualJobId);
    let qaSummary: QASummary | undefined;
    if (qaReport) {
      qaSummary = aggregateQASummary(qaReport);
      // Apply hard fixes from QA to already-imported chapters
      for (const chEntry of qaReport.chapters) {
        const hardFixes = chEntry.findings.filter(f => f.severity === 'hard' && f.fix);
        if (hardFixes.length === 0) continue;
        const matchResult = allResults.find(r => (r.order ?? r.id) === chEntry.order);
        if (!matchResult) continue;
        if (!importedChapterIds.includes(matchResult.id)) continue;
        const chapter = await db.chapters.get(matchResult.id);
        if (!chapter?.content_translated) continue;
        const fixed = applyQAHardFixes(chapter.content_translated, hardFixes);
        if (fixed !== chapter.content_translated) {
          await db.chapters.update(matchResult.id, { content_translated: fixed });
        }
      }
      result.errors.push(`🔍 QA: ${qaSummary.totalFindings} findings (${qaSummary.hardFindings} hard, ${qaSummary.softFindings} soft)`);
    }

    // Update history with import result
    const importedOrders = allResults
      .filter(r => importedChapterIds.includes(r.id))
      .map(r => r.order ?? r.id);
    await updateBridgeJobStatus(actualJobId, {
      status: (expectedCount && result.imported < expectedCount) ? 'partial' : 'imported',
      importedAt: new Date(),
      importedCount: result.imported,
      completedOrders: importedOrders,
      ...(qaSummary ? { qaSummary } : {}),
    });

    // Safe cleanup: only delete files when all chapters imported
    if (expectedCount === undefined || result.imported >= expectedCount) {
      await cleanupJobFiles(actualJobId);
    } else {
      result.errors.push(
        `⚠️ Import ${result.imported}/${expectedCount} chương — giữ lại file để import tiếp`
      );
    }
  }

  return result;
}

// ─── Cleanup ───────────────────────────────────────────────────

/** Remove inbox + all outbox + done sentinel files for a job */
async function cleanupJobFiles(jobId: string): Promise<void> {
  try {
    const entries = await readDir(BRIDGE_DIR, FS_OPTS);
    const inboxPerChapterRe = new RegExp(`^inbox_${escapeRegExp(jobId)}_ch\\d+\\.json$`);
    const jobFiles = entries.filter(e => e.isFile && e.name.endsWith(".json") && (
      e.name === `inbox_${jobId}.json` ||          // Legacy single inbox
      inboxPerChapterRe.test(e.name) ||            // Per-chapter inbox
      e.name === `ag_inbox_${jobId}.json` ||        // Legacy inbox
      e.name === `done_${jobId}.json` ||            // Done sentinel
      e.name === `qa_${jobId}.json` ||              // QA report
      isOutboxFileName(e.name, jobId)
    ));
    const failed: string[] = [];
    for (const f of jobFiles) {
      const path = `${BRIDGE_DIR}/${f.name}`;
      try {
        await remove(path, FS_OPTS);
      } catch {
        // Retry once after a short delay (file may be locked)
        try {
          await new Promise(r => setTimeout(r, 200));
          await remove(path, FS_OPTS);
        } catch (retryErr) {
          failed.push(f.name);
          console.warn(`[Bridge] Failed to cleanup ${f.name}:`, retryErr);
        }
      }
    }
    if (failed.length > 0) {
      console.warn(`[Bridge] ${failed.length} files could not be deleted for job ${jobId}:`, failed);
    }
  } catch (err) {
    console.warn(`[Bridge] cleanupJobFiles(${jobId}) failed:`, err);
  }
}

// ─── Status Check ──────────────────────────────────────────────

export async function hasPendingOutbox(): Promise<boolean> {
  const jobId = await findLatestOutboxJobId();
  return jobId !== null;
}

/** Return metadata about the latest outbox job (for reopening Bridge dialog) */
export async function findLatestOutboxInfo(): Promise<{ jobId: string; fileCount: number; orders: number[] } | null> {
  const jobId = await findLatestOutboxJobId();
  if (!jobId) return null;
  const files = await findOutboxFilesForJob(jobId);
  if (files.length === 0) return null;
  const orders = files.map(f => {
    const match = f.match(/_ch(\d+)\.json$/);
    return match ? parseInt(match[1]) : -1;
  }).filter(n => n >= 0);
  return { jobId, fileCount: files.length, orders };
}

// ─── Missing Chapter Detection ─────────────────────────────────

export interface MissingChapterInfo {
  expectedOrders: number[];
  completedOrders: number[];
  missingOrders: number[];
  hasMissing: boolean;
}

/** Compare expected vs completed orders to detect missing chapters */
export function detectMissingChapters(
  expectedOrders: number[],
  completedOrders: number[],
): MissingChapterInfo {
  const completedSet = new Set(completedOrders);
  const missingOrders = expectedOrders.filter(o => !completedSet.has(o));
  return {
    expectedOrders,
    completedOrders,
    missingOrders,
    hasMissing: missingOrders.length > 0,
  };
}

/** Re-export only missing chapters as a new inbox job */
export async function exportMissingOnly(
  workspaceId: string,
  missingOrders: number[],
  glossary: DictionaryEntry[],
  corrections: CorrectionEntry[],
  prompt: string,
  temperature: number,
): Promise<{ jobId: string; path: string; chapterCount: number }> {
  // Fetch only the missing chapters by order
  const allChapters = await db.chapters
    .where('workspaceId').equals(workspaceId)
    .toArray();
  const chapters = allChapters.filter(c => missingOrders.includes(c.order));

  if (chapters.length === 0) {
    throw new Error(`Không tìm thấy chương nào với order: ${missingOrders.join(', ')}`);
  }

  return exportInbox(workspaceId, chapters, glossary, corrections, prompt, temperature);
}

// ─── Bridge Job History ────────────────────────────────────────

const MAX_HISTORY_ENTRIES = 20;

/** Log a new bridge job to history */
export async function logBridgeJob(
  entry: Omit<BridgeJobEntry, 'id'>,
): Promise<void> {
  try {
    await db.bridgeJobs.add(entry as BridgeJobEntry);
    // Auto-purge old entries
    const count = await db.bridgeJobs.count();
    if (count > MAX_HISTORY_ENTRIES) {
      const oldest = await db.bridgeJobs
        .orderBy('exportedAt')
        .limit(count - MAX_HISTORY_ENTRIES)
        .toArray();
      await db.bridgeJobs.bulkDelete(oldest.map(e => e.id!));
    }
  } catch {
    console.warn('[Bridge] Failed to log job history');
  }
}

/** Update bridge job status */
export async function updateBridgeJobStatus(
  jobId: string,
  updates: Partial<Pick<BridgeJobEntry, 'status' | 'completedAt' | 'importedAt' | 'importedCount' | 'missingOrders' | 'completedOrders' | 'qaSummary'>>,
): Promise<void> {
  try {
    const job = await db.bridgeJobs.where('jobId').equals(jobId).first();
    if (job?.id) {
      await db.bridgeJobs.update(job.id, updates);
    }
  } catch {
    console.warn('[Bridge] Failed to update job status');
  }
}

/** Get recent bridge jobs for history UI */
export async function getBridgeJobHistory(
  workspaceId?: string,
  limit = 10,
): Promise<BridgeJobEntry[]> {
  const query = db.bridgeJobs.orderBy('exportedAt').reverse();
  if (workspaceId) {
    const all = await query.toArray();
    return all.filter(j => j.workspaceId === workspaceId).slice(0, limit);
  }
  return query.limit(limit).toArray();
}

// ─── QA Report Parsing ─────────────────────────────────────────

export interface QAFinding {
  severity: 'hard' | 'soft';
  rule: string;
  span: string;
  fix: string | null;
}

export interface QAChapterEntry {
  order: number;
  checks: Record<string, boolean>;
  findings: QAFinding[];
  appliedFixCount: number;
  remainingHardFindings: number;
}

export interface QAReport {
  jobId: string;
  scannedAt: string;
  chapters: QAChapterEntry[];
}

export interface QASummary {
  cleanChapters: number;
  fixedChapters: number;
  totalFindings: number;
  hardFindings: number;
  softFindings: number;
  topRules: [string, number][];
}

/** Parse qa_{jobId}.json from bridge folder */
export async function parseQAReport(jobId: string): Promise<QAReport | null> {
  try {
    const filePath = `${BRIDGE_DIR}/qa_${jobId}.json`;
    const fileExists = await exists(filePath, FS_OPTS);
    if (!fileExists) return null;
    const raw = await readTextFile(filePath, FS_OPTS);
    return JSON.parse(raw) as QAReport;
  } catch {
    console.warn('[Bridge] Failed to parse QA report');
    return null;
  }
}

/** Aggregate QA report into summary stats */
export function aggregateQASummary(report: QAReport): QASummary {
  const ruleCounts = new Map<string, number>();
  let cleanChapters = 0;
  let fixedChapters = 0;
  let totalFindings = 0;
  let hardFindings = 0;
  let softFindings = 0;

  for (const ch of report.chapters) {
    const hardCount = ch.findings.filter(f => f.severity === 'hard').length;
    const softCount = ch.findings.filter(f => f.severity === 'soft').length;
    totalFindings += ch.findings.length;
    hardFindings += hardCount;
    softFindings += softCount;

    const hasHardFix = ch.findings.some(f => f.severity === 'hard' && f.fix);
    if (ch.findings.length === 0) {
      cleanChapters++;
    } else if (hasHardFix) {
      fixedChapters++;
    }

    for (const f of ch.findings) {
      ruleCounts.set(f.rule, (ruleCounts.get(f.rule) ?? 0) + 1);
    }
  }

  const topRules = Array.from(ruleCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) as [string, number][];

  return { cleanChapters, fixedChapters, totalFindings, hardFindings, softFindings, topRules };
}

/** Apply hard fixes from QA report to imported chapter content */
export function applyQAHardFixes(
  content: string,
  findings: QAFinding[],
): string {
  let result = content;
  for (const f of findings) {
    if (f.severity === 'hard' && f.fix && f.span) {
      // Use escapeRegExp for safe replacement
      const escapedSpan = f.span.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // If the span is long enough (> 10 chars), assume it's specific enough for global replace
      // Otherwise, try to use word boundaries to avoid partial word replacement
      if (escapedSpan.length > 10) {
        result = result.replaceAll(f.span, f.fix);
      } else {
        // Simple word boundary check (only for alphanumeric spans)
        const isWord = /^\w+$/.test(f.span);
        const regex = isWord
          ? new RegExp(`\\b${escapedSpan}\\b`, 'g')
          : new RegExp(escapedSpan, 'g');
        result = result.replace(regex, f.fix);
      }
    }
  }
  return result;
}

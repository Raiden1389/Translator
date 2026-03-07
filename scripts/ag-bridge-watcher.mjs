import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const DEFAULT_BRIDGE_DIR = path.join(
  process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"),
  "com.raiden.translator",
  ".raiden",
  "bridge",
);

function parseArgs(argv) {
  const args = {
    bridgeDir: DEFAULT_BRIDGE_DIR,
    mode: "watch",
    intervalMs: 1500,
    jobId: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--once") args.mode = "once";
    else if (arg === "--watch") args.mode = "watch";
    else if (arg === "--status") args.mode = "status";
    else if (arg === "--job" && argv[i + 1]) args.jobId = argv[++i];
    else if (arg === "--dir" && argv[i + 1]) args.bridgeDir = argv[++i];
    else if (arg === "--interval" && argv[i + 1]) args.intervalMs = Number(argv[++i]) || args.intervalMs;
  }

  return args;
}

function listJsonFiles(bridgeDir) {
  if (!fs.existsSync(bridgeDir)) return [];
  return fs.readdirSync(bridgeDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => {
      const fullPath = path.join(bridgeDir, entry.name);
      const stat = fs.statSync(fullPath);
      return {
        name: entry.name,
        fullPath,
        mtimeMs: stat.mtimeMs,
        size: stat.size,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function extractJobId(name) {
  let match = name.match(/^inbox_([a-f0-9]+)\.json$/i);
  if (match) return match[1];
  match = name.match(/^out_([a-f0-9]+)_ch\d+\.json$/i);
  if (match) return match[1];
  match = name.match(/^done_([a-f0-9]+)\.json$/i);
  if (match) return match[1];
  match = name.match(/^error_([a-f0-9]+)\.json$/i);
  if (match) return match[1];
  match = name.match(/^lock_([a-f0-9]+)\.json$/i);
  if (match) return match[1];
  match = name.match(/^ag_inbox_([a-f0-9-]+)\.json$/i);
  if (match) return match[1];
  match = name.match(/^ag_outbox_([a-f0-9-]+)_ch\d+\.json$/i);
  if (match) return match[1];
  return null;
}

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function buildJobs(files) {
  const jobs = new Map();

  for (const file of files) {
    const jobId = extractJobId(file.name);
    if (!jobId) continue;

    if (!jobs.has(jobId)) {
      jobs.set(jobId, {
        jobId,
        inbox: null,
        expectedCount: null,
        outboxCount: 0,
        outboxOrders: [],
        done: false,
        error: false,
        lock: false,
        latestMtimeMs: file.mtimeMs,
      });
    }

    const job = jobs.get(jobId);
    job.latestMtimeMs = Math.max(job.latestMtimeMs, file.mtimeMs);

    if (/^(inbox_|ag_inbox_)/i.test(file.name)) {
      job.inbox = file.name;
      const payload = safeReadJson(file.fullPath);
      if (Array.isArray(payload?.chapters)) {
        job.expectedCount = payload.chapters.length;
      }
    } else if (/^(out_|ag_outbox_)/i.test(file.name)) {
      job.outboxCount += 1;
      const orderMatch = file.name.match(/_ch(\d+)\.json$/i);
      if (orderMatch) job.outboxOrders.push(Number(orderMatch[1]));
    } else if (/^done_/i.test(file.name)) {
      job.done = true;
    } else if (/^error_/i.test(file.name)) {
      job.error = true;
    } else if (/^lock_/i.test(file.name)) {
      job.lock = true;
    }
  }

  return [...jobs.values()].sort((a, b) => b.latestMtimeMs - a.latestMtimeMs);
}

function jobState(job) {
  if (job.error) return "error";
  if (job.done) return "done";
  if (job.lock) return "locked";
  if (job.outboxCount > 0 && job.expectedCount !== null && job.outboxCount < job.expectedCount) return "partial";
  if (job.outboxCount > 0) return "ready";
  return "waiting";
}

function formatJob(job) {
  const expected = job.expectedCount ?? "?";
  const orders = job.outboxOrders.length > 0
    ? ` [${job.outboxOrders.sort((a, b) => a - b).join(", ")}]`
    : "";
  return `${job.jobId} | ${jobState(job)} | ${job.outboxCount}/${expected}${orders}`;
}

function snapshot(args) {
  const files = listJsonFiles(args.bridgeDir);
  const jobs = buildJobs(files);
  const filtered = args.jobId ? jobs.filter((job) => job.jobId === args.jobId) : jobs;
  return { jobs: filtered };
}

function printSnapshot(args) {
  const { jobs } = snapshot(args);
  console.log(`Bridge: ${args.bridgeDir}`);
  if (jobs.length === 0) {
    console.log("No bridge jobs found.");
    return;
  }
  for (const job of jobs) {
    console.log(formatJob(job));
  }
}

function watchJobs(args) {
  let lastRender = "";

  const tick = () => {
    const { jobs } = snapshot(args);
    const body = jobs.length === 0
      ? "No bridge jobs found."
      : jobs.map(formatJob).join("\n");
    const nextRender = `Bridge: ${args.bridgeDir}\n${body}`;

    if (nextRender !== lastRender) {
      process.stdout.write("\x1Bc");
      console.log(nextRender);
      console.log(`Polling every ${args.intervalMs}ms. Ctrl+C to stop.`);
      lastRender = nextRender;
    }
  };

  tick();
  setInterval(tick, args.intervalMs);
}

const args = parseArgs(process.argv.slice(2));

if (args.mode === "once" || args.mode === "status") {
  printSnapshot(args);
} else {
  watchJobs(args);
}

import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";

// ===== TIMING HELPERS =====
const t0 = Date.now();
const now = () => Date.now();
function logStep(name, start) {
    const ms = now() - start;
    console.log(`⏱️ ${name}: ${(ms / 1000).toFixed(1)}s`);
}

const MARKER_DIR = ".agent/knowledge";
const MARKER_FILE = path.join(MARKER_DIR, ".last-web-build");
const OUT_DIR = "C:/Users/Admin/.gemini/antigravity/scratch/Exe";
const TAURI_BIN = "raiden-ai-translator.exe";
const TAURI_RELEASE_DIR = "src-tauri/target/release";

function run(cmd) {
    console.log("> " + cmd);
    execSync(cmd, { stdio: "inherit" });
}

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];
    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });
    return arrayOfFiles;
}

function needsWebBuild() {
    if (!fs.existsSync("out") || !fs.existsSync(MARKER_FILE)) return true;

    const lastBuildTime = fs.statSync(MARKER_FILE).mtimeMs;
    const watchPaths = ["app", "components", "lib", "styles"];
    const extensions = [".tsx", ".ts", ".css", ".js"];

    for (const folder of watchPaths) {
        if (!fs.existsSync(folder)) continue;
        const files = getAllFiles(folder);
        for (const file of files) {
            if (extensions.some(ext => file.endsWith(ext))) {
                if (fs.statSync(file).mtimeMs > lastBuildTime) {
                    console.log(`🔍 Change detected: ${file}`);
                    return true;
                }
            }
        }
    }
    return false;
}

// ===== 0. START =====
const FORCE = process.argv.includes("--force");
console.log("\n" + "=".repeat(40));
console.log("⚡ ULTRA-FAST SMART BUILD (v3.1)");
console.log("=".repeat(40) + "\n");

// ===== 1. SMART UI SCAN =====
if (FORCE || needsWebBuild()) {
    const tUI = now();
    console.log(FORCE ? "🔨 Force rebuild frontend..." : "🎨 UI changes detected -> Next.js build...");
    run("npm run build");
    logStep("Frontend build", tUI);

    if (!fs.existsSync(MARKER_DIR)) fs.mkdirSync(MARKER_DIR, { recursive: true });
    fs.writeFileSync(MARKER_FILE, Date.now().toString());
} else {
    console.log("✨ UI is up-to-date. Skipping frontend build.");
}

// ===== 2. TAURI BUILD (bundle: false — exe only, no msi/nsis) =====
const tRust = now();
console.log("🦀 Building Rust Binary (exe only, no installer)...");

// tauri.fast.conf.json has bundle.active = false — skips msi/nsis
// tauri build automatically enables custom-protocol feature to embed frontend
run("node_modules\\.bin\\tauri.cmd build -c src-tauri/tauri.fast.conf.json");
logStep("Tauri build", tRust);

// ===== 3. COPY TO OUTPUT =====
const tCopy = now();
const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
const sourceExe = path.join(TAURI_RELEASE_DIR, TAURI_BIN);

if (!fs.existsSync(sourceExe)) {
    console.error("❌ Error: source.exe not found!");
    process.exit(1);
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
const finalExe = path.join(OUT_DIR, `Raiden-v${pkg.version}.exe`);
fs.copyFileSync(sourceExe, finalExe);
logStep("Copy EXE", tCopy);

// ===== 4. SUMMARY =====
const exeSize = (fs.statSync(finalExe).size / 1024 / 1024).toFixed(1);
console.log(`\n✅ EXE READY: ${finalExe} (${exeSize} MB)`);
console.log("=".repeat(40));
logStep("TOTAL BUILD TIME", t0);
console.log("=".repeat(40) + "\n");

// ===== 5. OPEN OUTPUT FOLDER (non-blocking, won't crash) =====
try {
    spawn("explorer", [OUT_DIR.replace(/\//g, "\\")], { detached: true, stdio: "ignore" }).unref();
} catch (_) {
    // ignore explorer errors
}

process.exit(0);

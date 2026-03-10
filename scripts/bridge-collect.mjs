import fs from 'fs';
import path from 'path';
import os from 'os';

const BRIDGE_DIR = path.join(os.homedir(), 'AppData/Roaming/com.raiden.translator/.raiden/bridge');
const SCRATCH_DIR = path.join(os.homedir(), '.gemini/antigravity/scratch');

async function collect() {
    console.log('📦 Collecting (UTF-8 Force Mode)...');

    const collected = [];
    let jobId = null;
    let workspaceId = null;

    for (let i = 1; i <= 3; i++) {
        const stationPath = path.join(SCRATCH_DIR, `dich-${i}`);
        const inputPath = path.join(stationPath, 'input.json');
        const outputPath = path.join(stationPath, 'output.json');

        if (!fs.existsSync(outputPath)) { console.warn(`⚠ dich-${i}: chưa xong`); continue; }

        try {
            // Đọc dùng utf8 rõ ràng
            const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
            const output = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
            if (!jobId) jobId = input.jobId;
            if (!workspaceId) workspaceId = input.workspaceId;

            const results = Array.isArray(output) ? output : [output];
            results.forEach(res => collected.push({ jobId: input.jobId, workspaceId: input.workspaceId, result: res }));
        } catch (err) { console.error(`❌ dich-${i}:`, err.message); }
    }

    if (collected.length === 0) { console.log('⚠ Zero results.'); return; }
    console.log(`📦 Collected ${collected.length} chapters.`);

    collected.forEach(({ jobId, workspaceId, result }) => {
        const filename = `out_${jobId}_ch${result.id}.json`;
        // Ghi dùng utf8 rõ ràng
        fs.writeFileSync(path.join(BRIDGE_DIR, filename), JSON.stringify({
            schemaVersion: 1, jobId, workspaceId,
            completedAt: new Date().toISOString(),
            model: "antigravity-bridge-parallel-v4",
            results: [{ id: result.id, order: result.order, title_translated: result.title, content_translated: result.content, wordCountTranslated: result.content.length }]
        }, null, 2), 'utf8');
        console.log(`  ✅ ${filename}`);
    });

    fs.writeFileSync(path.join(BRIDGE_DIR, `done_${jobId}.json`), JSON.stringify({
        jobId, completedAt: new Date().toISOString(),
        totalChapters: collected.length,
        completedChapters: collected.map(c => c.result.id)
    }, null, 2), 'utf8');
    console.log('🎉 Done! Chữ bao nét, Sếp Import đi!');
}
collect().catch(console.error);

import fs from 'fs';
import path from 'path';
import os from 'os';

const BRIDGE_DIR = path.join(os.homedir(), 'AppData/Roaming/com.raiden.translator/.raiden/bridge');
const SCRATCH_DIR = path.join(os.homedir(), '.gemini/antigravity/scratch');

async function distribute() {
    console.log('🚀 Distribute v4 (Isolated Workspaces)...');

    const files = fs.readdirSync(BRIDGE_DIR);
    const inboxFiles = files.filter(f => f.startsWith('inbox_') && f.endsWith('.json'));
    if (inboxFiles.length === 0) { console.log('⚠ No inbox found.'); return; }
    inboxFiles.sort((a, b) => fs.statSync(path.join(BRIDGE_DIR, b)).mtimeMs - fs.statSync(path.join(BRIDGE_DIR, a)).mtimeMs);

    const inboxData = JSON.parse(fs.readFileSync(path.join(BRIDGE_DIR, inboxFiles[0]), 'utf8'));
    const { jobId, workspaceId, glossary, chapters } = inboxData;
    console.log(`📦 Job: ${jobId} | ${chapters.length} chapters`);

    const numStations = 3;
    const chunkSize = Math.ceil(chapters.length / numStations);

    for (let i = 0; i < numStations; i++) {
        const stationChapters = chapters.slice(i * chunkSize, (i + 1) * chunkSize);
        if (stationChapters.length === 0) break;

        // ISOLATED folder ngoài workspace chính
        const stationPath = path.join(SCRATCH_DIR, `dich-${i + 1}`);
        if (!fs.existsSync(stationPath)) fs.mkdirSync(stationPath, { recursive: true });

        // Clean old output
        const oldOutput = path.join(stationPath, 'output.json');
        if (fs.existsSync(oldOutput)) fs.unlinkSync(oldOutput);

        // input.json
        fs.writeFileSync(path.join(stationPath, 'input.json'), JSON.stringify({
            LENH: "Đọc chapters bên dưới, dịch theo GEMINI.md, ghi output.json dạng array.",
            jobId, workspaceId, glossary,
            chapters: stationChapters
        }, null, 2));

        // GEMINI.md
        fs.writeFileSync(path.join(stationPath, 'GEMINI.md'), `# Dịch Station ${i + 1} — Translation Agent

## Vai trò
Bạn là dịch giả tiểu thuyết Trung → Việt cao cấp. Đọc \`input.json\`, dịch theo rules dưới đây, ghi ra \`output.json\`.

## Rules cứng
- Ngôi xưng: 我=Ta, 你=Ngươi (đối thoại/độc thoại), 他=hắn, 她=nàng (trần thuật). CẤM: tôi, bạn, anh, em, mình.
- Tên nhân vật TỐI ĐA 1 lần/đoạn. Khi phân vân → ẨN chủ ngữ.
- CẤM: hít hơi lạnh, vấn đề không lớn, dường như, tựa hồ, bất giác, thanh âm vang lên.
- Thoát ý, thuần Việt, câu chiến đấu ngắn gọn (3-10 từ). CẤM câu >25 từ.
- Viết thường đại từ trừ đầu câu. Dấu phẩy CẤM sau từ nối đầu câu.

## Format output.json
Đây là format bắt buộc:
\`\`\`json
[
  { "id": 1, "order": 1, "title": "...", "content": "..." }
]
\`\`\`

## Lệnh: Đọc input.json → Dịch → Ghi output.json. Không giải thích.
`);

        console.log(`  ✅ dich-${i + 1}: ${stationChapters.length} chapters (ch${stationChapters[0].order}-${stationChapters[stationChapters.length - 1].order})`);
    }
    console.log('👉 Mở Agent Manager → 3 window dich-1, dich-2, dich-3 → bảo "Dịch đi"');
}
distribute().catch(console.error);

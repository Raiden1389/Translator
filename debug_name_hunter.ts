
import { VietPhraseRepository } from './lib/repositories/viet-phrase-repo';
import { NameHunterRegexEngine } from './lib/services/name-hunter/regex-engine';
import { NameHunterJudge } from './lib/services/name-hunter/judge';
import { TermType } from './lib/services/name-hunter/types';

// Mock Fetch for Node.js environment
global.fetch = require('node-fetch'); // Ensure node-fetch is available or mock it

// Mock Dictionary Loading (Optional: Load real file if possible, or mock data)
// We will mock the internal data structure of Repo to avoid file IO issues in this script if strictly sandbox.
// But better to try to use the real class logic.

async function runDebug() {
    console.log("--- Starting Name Hunter Debug ---");

    // 1. Setup Repo with Mock Data
    const vpRepo = VietPhraseRepository.getInstance();
    // Inject mock data directly if possible or use load. 
    // Since 'insert' is private, we might need to use 'load' with a data URI or mock fetch.
    // Let's monkey-patch 'load' or just use 'insert' via 'any' cast for debug.

    (vpRepo as any).insert("林凡", "Lâm Phàm");
    (vpRepo as any).insert("震惊", "Kinh Ngạc");
    (vpRepo as any).insert("宗门", "Tông Môn");
    (vpRepo as any).insert("是一个", "Là Một"); // Common phrase
    (vpRepo as any).insert("好", "Hảo");
    (vpRepo as any).insert("人", "Nhân");

    console.log("Repo initialized with mock data: 林凡=Lâm Phàm, 震惊=Kinh Ngạc...");

    // 2. Simulated Input (Chinese)
    const chineseText = "林凡是一个好人。他非常震惊。宗门大比开始了。";
    console.log("\nInput (Chinese):", chineseText);

    // 3. Conversion
    const converted = vpRepo.convert(chineseText);
    console.log("Converted (VietPhrase):", `"${converted}"`);

    // 4. Regex Extraction
    const engine = new NameHunterRegexEngine();
    const rawCandidates = engine.extractCandidates(converted);
    console.log("\nRegex Output:", rawCandidates.map(c => c.original));

    // 5. Judge Classification
    const judge = new NameHunterJudge();
    // Mock Judge dependencies? Judge uses Singleton Repo, so it should share the mock data.
    // Judge also uses SyllableRepo. We need to mock that too.
    const sylRepo = (require('./lib/repositories/syllable-repo').SyllableRepository).getInstance();
    // Assuming 'isValidTerm' checks if syllables are valid.
    // We need to ensure "Lâm", "Phàm", "Kinh", "Ngạc" are valid.
    // sylRepo has a Set.
    ["Lâm", "Phàm", "Kinh", "Ngạc", "Tông", "Môn", "Là", "Một", "Hảo", "Nhân"].forEach(s => {
        (sylRepo as any).syllables.add(s.toLowerCase());
    });

    console.log("\nJudge Classification:");
    for (const c of rawCandidates) {
        const type = judge.classify(c);
        console.log(`- "${c.original}": ${type}`);

        // Debug specific checks
        const isStopword = (judge as any)._isStopword(c.original);
        const isValidSyl = sylRepo.isValidTerm(c.original);
        const inVP = vpRepo.has(c.original);

        if (type === "Junk" || type === "Unknown") {
            console.log(`  -> Stopword: ${isStopword}, ValidSyl: ${isValidSyl}, InVP: ${inVP}`);
        }
    }
}

runDebug().catch(console.error);

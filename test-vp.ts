
import { VietPhraseRepository } from "./lib/repositories/viet-phrase-repo";
import { SyllableRepository } from "./lib/repositories/syllable-repo";
import fs from 'fs';
import path from 'path';

async function test() {
    const vp = VietPhraseRepository.getInstance();
    const syllable = SyllableRepository.getInstance();

    // Mock fetch for local file access since we are in Node
    const dictPath = path.resolve(process.cwd(), 'public/dicts/VietPhrase.txt');
    const syllablePath = path.resolve(process.cwd(), 'public/dicts/ChinesePhienAmWords.txt');

    console.log("Loading dicts...");
    const vpContent = fs.readFileSync(dictPath, 'utf8');
    const sylContent = fs.readFileSync(syllablePath, 'utf8');

    // Inject manually since load() uses fetch() which fails in node without mock
    // We'll just parse them manually to simulate the repo state
    const parseDict = (content: string) => {
        const map = new Map();
        content.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                map.set(parts[0].trim(), parts[1].trim().split('/')[0]);
            }
        });
        return map;
    };

    // Simulate the Trie/Convert logic
    const testTitle = "诚实厚道";
    console.log(`Translating: ${testTitle}`);

    // For now, let's just see if they exist in the raw content
    const hasChengshi = vpContent.includes("诚实=");
    const hasHoudao = vpContent.includes("厚道=");
    const hasFull = vpContent.includes("诚实厚道=");

    console.log(`Has 诚实: ${hasChengshi}`);
    console.log(`Has 厚道: ${hasHoudao}`);
    console.log(`Has 诚实厚道: ${hasFull}`);

    if (hasFull) {
        const match = vpContent.match(/诚实厚道=([^/\n]+)/);
        console.log(`Result (Full): ${match?.[1]}`);
    } else {
        const m1 = vpContent.match(/诚实=([^/\n]+)/);
        const m2 = vpContent.match(/厚道=([^/\n]+)/);
        console.log(`Result (Split): ${m1?.[1]} ${m2?.[1]}`);
    }
}

test();

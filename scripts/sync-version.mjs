#!/usr/bin/env node

/**
 * Version Sync Script
 * Syncs version across package.json, tauri.conf.json, and Cargo.toml
 * Usage: pnpm run meta:version-sync
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const ROOT = process.cwd();
const PACKAGE_JSON = join(ROOT, 'package.json');
const TAURI_CONF = join(ROOT, 'src-tauri', 'tauri.conf.json');
const CARGO_TOML = join(ROOT, 'src-tauri', 'Cargo.toml');

console.log('🔄 Syncing version across project files...\n');

async function readVersion(file, pattern) {
    const content = await readFile(file, 'utf-8');
    const match = content.match(pattern);
    return match ? match[1] : null;
}

async function updateVersion(file, pattern, newVersion) {
    let content = await readFile(file, 'utf-8');
    content = content.replace(pattern, (match, p1) => match.replace(p1, newVersion));
    await writeFile(file, content, 'utf-8');
}

async function main() {
    try {
        // Read versions from all files
        console.log('📖 Reading versions...');

        const packageVersion = await readVersion(PACKAGE_JSON, /"version":\s*"([^"]+)"/);
        const tauriVersion = await readVersion(TAURI_CONF, /"version":\s*"([^"]+)"/);
        const cargoVersion = await readVersion(CARGO_TOML, /^version\s*=\s*"([^"]+)"/m);

        console.log(`   package.json:      ${packageVersion}`);
        console.log(`   tauri.conf.json:   ${tauriVersion}`);
        console.log(`   Cargo.toml:        ${cargoVersion}\n`);

        // Check if all versions match
        if (packageVersion === tauriVersion && tauriVersion === cargoVersion) {
            console.log(`✅ All versions are in sync: ${packageVersion}\n`);
            return;
        }

        // Versions don't match - use package.json as source of truth
        console.log('⚠️  Versions are out of sync!');
        console.log(`   Using package.json version (${packageVersion}) as source of truth...\n`);

        // Update tauri.conf.json
        if (tauriVersion !== packageVersion) {
            console.log(`   Updating tauri.conf.json: ${tauriVersion} → ${packageVersion}`);
            await updateVersion(TAURI_CONF, /"version":\s*"([^"]+)"/, packageVersion);
        }

        // Update Cargo.toml
        if (cargoVersion !== packageVersion) {
            console.log(`   Updating Cargo.toml: ${cargoVersion} → ${packageVersion}`);
            await updateVersion(CARGO_TOML, /^version\s*=\s*"([^"]+)"/m, packageVersion);
        }

        console.log(`\n✅ Version sync complete: ${packageVersion}`);
        console.log('\n💡 Next steps:');
        console.log('   1. Review changes: git diff');
        console.log('   2. Commit: git commit -m "chore: sync version to ' + packageVersion + '"');
        console.log('   3. Build: pnpm run build:release\n');

    } catch (error) {
        console.error('❌ Error syncing versions:', error.message);
        console.error('\n🔧 Troubleshooting:');
        console.error('   - Ensure all files exist');
        console.error('   - Check file permissions');
        console.error('   - Verify file formats are correct\n');
        process.exit(1);
    }
}

main();

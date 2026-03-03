#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const KEEP = Number(process.env.CHANGELOG_KEEP || 8);
const FULL = path.join(ROOT, 'CHANGELOG.full.md');
const TARGET = path.join(ROOT, 'CHANGELOG.md');

function classify(title) {
  const t = title.toLowerCase();
  if (/(breaking|migration)/.test(t)) return 'Breaking/Migration';
  if (/(fix|bug|hotfix|patch)/.test(t)) return 'Fixed';
  if (/(perf|optimi|speed|build)/.test(t)) return 'Perf';
  if (/(add|new|feature|implement)/.test(t)) return 'Added';
  return 'Changed';
}

function parseVersions(md) {
  const re = /^##\s+\[(.+?)\]\s+-\s+(.+)$/gm;
  const matches = [...md.matchAll(re)];
  if (matches.length === 0) return [];

  return matches.map((m, i) => {
    const start = m.index;
    const end = i + 1 < matches.length ? matches[i + 1].index : md.length;
    const block = md.slice(start, end).trimEnd();
    const lines = block.split(/\r?\n/);
    const heading = lines[0];
    const body = lines.slice(1);
    return { heading, body };
  });
}

function summarizeBlock(block) {
  const sectionMap = new Map();
  const top = [];
  let current = 'Changed';

  for (const raw of block.body) {
    const line = raw.trimEnd();
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      current = classify(h3[1]);
      if (!sectionMap.has(current)) sectionMap.set(current, []);
      continue;
    }

    if (/^-\s+/.test(line)) {
      const bullet = line.replace(/^-\s+/, '- ').trim();
      if (bullet.length < 4) continue;
      if (top.length < 5) top.push(bullet);
      if (!sectionMap.has(current)) sectionMap.set(current, []);
      const arr = sectionMap.get(current);
      if (arr.length < 6) arr.push(bullet);
    }
  }

  const ordered = ['Added', 'Changed', 'Fixed', 'Perf', 'Breaking/Migration'];
  const lines = [block.heading, ''];

  if (top.length) {
    lines.push('### Top Impact');
    lines.push(...top);
    lines.push('');
  }

  for (const key of ordered) {
    const arr = sectionMap.get(key) || [];
    if (!arr.length) continue;
    lines.push(`### ${key}`);
    lines.push(...arr);
    lines.push('');
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
}

async function run() {
  let fullText = '';
  try {
    fullText = await fs.readFile(FULL, 'utf8');
  } catch {
    const existing = await fs.readFile(TARGET, 'utf8');
    await fs.writeFile(FULL, existing, 'utf8');
    fullText = existing;
    console.log('Created CHANGELOG.full.md from current CHANGELOG.md');
  }

  const blocks = parseVersions(fullText);
  if (!blocks.length) throw new Error('No version sections found (expected "## [x.y.z] - date")');

  const trimmed = blocks.slice(0, KEEP).map(summarizeBlock).join('\n\n');
  await fs.writeFile(TARGET, `${trimmed}\n`, 'utf8');

  console.log(`Trimmed CHANGELOG.md with ${Math.min(KEEP, blocks.length)} version(s). Source: CHANGELOG.full.md`);
}

run().catch((err) => {
  console.error('[changelog:trim] Failed:', err.message);
  process.exit(1);
});

/**
 * Translation Quality Audit Script
 * Checks 4 criteria: (A) POV drop, (B) Name repetition, (C) "mình" usage, (D) Subject ratio
 * Based on GPT's heuristic mechanics approach
 */

export interface AuditResult {
  povDropCount: number;
  repeatNameParagraphs: number;
  selfCount: number;
  noSubjectRatio: number;
  totalSentences: number;
  status: 'PASS' | 'WARNING' | 'FAIL';
  warnings: string[];
}

export interface AuditThresholds {
  povDropMax: number;        // (A) Max POV drop blocks
  repeatNameMax: number;      // (B) Max paragraphs with repeated name
  selfCountMax: number;       // (C) Max "mình" occurrences
  noSubjectRatioMin: number;  // (D) Min % no-subject sentences
  noSubjectRatioMax: number;  // (D) Max % no-subject sentences
}

const DEFAULT_THRESHOLDS: AuditThresholds = {
  povDropMax: 1,
  repeatNameMax: 0,
  selfCountMax: 5,
  noSubjectRatioMin: 30,
  noSubjectRatioMax: 55,
};

/**
 * Audit translated text for quality issues
 * @param text - Translated Vietnamese text
 * @param mainCharacterName - Main character name (e.g., "Bùi Khiêm")
 * @param thresholds - Custom thresholds (optional)
 */
export function auditTranslation(
  text: string,
  mainCharacterName: string,
  thresholds: Partial<AuditThresholds> = {}
): AuditResult {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };

  // Split into paragraphs and sentences
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  const sentences = text.split(/(?<=[.!?…])\s+/).filter(s => s.trim());

  // (A) POV DROP: 3+ consecutive sentences without POV markers
  const POV_WORDS = new RegExp(`(${mainCharacterName}|hắn|ta)`, 'i');
  let povDropCount = 0;

  for (let i = 0; i < sentences.length - 2; i++) {
    const block = sentences.slice(i, i + 3).join(' ');
    if (!POV_WORDS.test(block)) {
      povDropCount++;
    }
  }

  // (B) NAME REPETITION: Paragraphs with 2+ occurrences of main character name
  let repeatNameParagraphs = 0;
  paragraphs.forEach(p => {
    const matches = p.match(new RegExp(mainCharacterName, 'g'));
    if (matches && matches.length > 1) {
      repeatNameParagraphs++;
    }
  });

  // (C) "MÌNH" USAGE: Count occurrences of "mình" or "của mình"
  const selfCount = (text.match(/\bmình\b|\bcủa mình\b/gi) || []).length;

  // (D) SUBJECT RATIO: % of sentences without explicit subject
  const SUBJECT_REGEX = new RegExp(
    `^(${mainCharacterName}|hắn|ta|ngươi|nàng|Mã Dương)`,
    'i'
  );

  let noSubjectCount = 0;
  sentences.forEach(s => {
    if (!SUBJECT_REGEX.test(s.trim())) {
      noSubjectCount++;
    }
  });

  const noSubjectRatio = parseFloat(
    ((noSubjectCount / sentences.length) * 100).toFixed(1)
  );

  // Determine status and warnings
  const warnings: string[] = [];
  let status: 'PASS' | 'WARNING' | 'FAIL' = 'PASS';

  if (povDropCount > t.povDropMax) {
    warnings.push(`(A) POV drop: ${povDropCount} blocks (max: ${t.povDropMax})`);
    status = 'FAIL';
  }

  if (repeatNameParagraphs > t.repeatNameMax) {
    warnings.push(`(B) Name repetition: ${repeatNameParagraphs} paragraphs (max: ${t.repeatNameMax})`);
    status = 'FAIL';
  }

  if (selfCount > t.selfCountMax) {
    warnings.push(`(C) "mình" usage: ${selfCount} times (max: ${t.selfCountMax})`);
    if (status !== 'FAIL') status = 'WARNING';
  }

  if (noSubjectRatio > t.noSubjectRatioMax) {
    warnings.push(`(D) Too many no-subject sentences: ${noSubjectRatio}% (max: ${t.noSubjectRatioMax}%)`);
    if (status !== 'FAIL') status = 'WARNING';
  }

  if (noSubjectRatio < t.noSubjectRatioMin) {
    warnings.push(`(D) Too few no-subject sentences: ${noSubjectRatio}% (min: ${t.noSubjectRatioMin}%)`);
    if (status !== 'FAIL') status = 'WARNING';
  }

  return {
    povDropCount,
    repeatNameParagraphs,
    selfCount,
    noSubjectRatio,
    totalSentences: sentences.length,
    status,
    warnings,
  };
}

/**
 * Format audit result as human-readable report
 */
export function formatAuditReport(result: AuditResult): string {
  const lines = [
    '📊 TRANSLATION QUALITY AUDIT',
    '─────────────────────────────',
    `(A) POV drop blocks: ${result.povDropCount}`,
    `(B) Paragraphs with repeated name: ${result.repeatNameParagraphs}`,
    `(C) "mình / của mình" count: ${result.selfCount}`,
    `(D) No-subject sentence ratio: ${result.noSubjectRatio}% (${result.totalSentences} total)`,
    '',
    `Status: ${result.status}`,
  ];

  if (result.warnings.length > 0) {
    lines.push('', '⚠️ Warnings:');
    result.warnings.forEach(w => lines.push(`  - ${w}`));
  }

  return lines.join('\n');
}

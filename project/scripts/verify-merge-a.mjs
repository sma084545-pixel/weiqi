import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {verifyOnlineDependencies} from './verify-online-dependencies.mjs';

const root = process.cwd();
const readJson = (relativePath) => JSON.parse(readFileSync(join(root, relativePath), 'utf8'));
const sha256 = (relativePath) => createHash('sha256').update(readFileSync(join(root, relativePath))).digest('hex');

const manifest = readJson('content/t09/FILE_MANIFEST.json');
assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.rulesetId, 'GO-CLUB-AREA-1');
assert.equal(manifest.baseVersion, '0.2.0');
assert.equal(manifest.resultVersion, '0.2.0-t09.1');
assert.equal(manifest.files.length, 200);
assert.equal(manifest.fileCountIncludingManifest, 201);

for (const file of manifest.files) {
  assert.ok(file.path.startsWith('content/') || file.path === 'handoff/T09.md', `越界的 T09 文件：${file.path}`);
  assert.equal(readFileSync(join(root, file.path)).byteLength, file.bytes, `${file.path} 大小不符`);
  assert.equal(sha256(file.path), file.sha256, `${file.path} SHA-256 不符`);
}

const packageJson = readJson('package.json');
const [major, minor, patch] = packageJson.version.split('.').map(Number);
assert.ok(major > 0 || minor > 9 || (minor === 9 && patch >= 1), '项目版本不得早于完成合并 A 的 0.9.1');
const input = readJson('content/t09/input-manifest.json');
assert.equal(input.schemaVersion, 1);
assert.equal(input.rulesetId, 'GO-CLUB-AREA-1');
assert.equal(sha256('schemas/content.schema.json'), input.compatibilityFingerprints['schemas/content.schema.json']);
if(sha256('pnpm-lock.yaml')!==input.compatibilityFingerprints['pnpm-lock.yaml']){
  // The original T09 fingerprint stays immutable; only this audited user-authorized addition is allowed.
  const change=verifyOnlineDependencies(root);
  assert.equal(change.baseLockSha256,input.compatibilityFingerprints['pnpm-lock.yaml']);
}

const puzzleFiles = readdirSync(join(root, 'content/puzzles')).filter((name) => name.endsWith('.json')).sort();
const endgameFiles = readdirSync(join(root, 'content/endgames')).filter((name) => name.endsWith('.json')).sort();
const categories = ['AREA', 'CAP', 'CON', 'DISC', 'LIB', 'LIFE'];
const expectedPuzzles = categories.flatMap((category) =>
  Array.from({ length: 5 }, (_, index) => `${category}-${String(index + 1).padStart(3, '0')}.json`),
).sort();
const expectedEndgames = Array.from({ length: 6 }, (_, index) => `END-${String(index + 1).padStart(3, '0')}.json`);
assert.deepEqual(puzzleFiles, expectedPuzzles);
assert.deepEqual(endgameFiles, expectedEndgames);

const puzzleDocuments = puzzleFiles.map((name) => readJson(`content/puzzles/${name}`));
const endgameDocuments = endgameFiles.map((name) => readJson(`content/endgames/${name}`));
const documents = [...puzzleDocuments, ...endgameDocuments];
assert.equal(new Set(documents.map((item) => item.id)).size, 36);
for (const item of documents) {
  assert.equal(item.schemaVersion, 1, `${item.id} schemaVersion`);
  assert.equal(item.rulesetId, 'GO-CLUB-AREA-1', `${item.id} rulesetId`);
  assert.equal(item.revision, 1, `${item.id} revision`);
  assert.equal(item.validation?.humanReviewed, null, `${item.id} humanReviewed`);
  assert.doesNotMatch(item.id, /(?:DEV|DEMO|TEMPLATE|TEST)/, `${item.id} 不是正式 ID`);
}
assert.ok(puzzleDocuments.every((item) => item.kind === 'Puzzle' && item.developmentOnly !== true));
assert.ok(endgameDocuments.every((item) => item.kind === 'TerminalFixture'));

const bundle = readJson('content/t09/bundle.json');
assert.equal(bundle.schemaVersion, 1);
assert.equal(bundle.rulesetId, 'GO-CLUB-AREA-1');
assert.equal(bundle.items.length, 36);
const bundleById = new Map(bundle.items.map((item) => [item.id, item]));
for (const item of documents) assert.deepEqual(bundleById.get(item.id), item, `${item.id} 与 bundle 不一致`);

const releasePool = readJson('content/t09/release-pool.json');
assert.equal(releasePool.formalPuzzleIds.length, 30);
assert.equal(releasePool.automaticPuzzleIds.length, 25);
assert.equal(releasePool.discussionOnlyIds.length, 5);
assert.equal(releasePool.endgameIds.length, 6);
assert.deepEqual(releasePool.quarantineIds, []);
assert.equal(releasePool.humanReview, 'not-performed');

const results = readJson('content/validation/results.json');
assert.equal(results.passed, true);
assert.equal(results.checks, 851);
assert.equal(results.replayedMoves, 134);
assert.equal(results.exploredTransitions, 2179);
assert.equal(results.items.length, 36);

const end006 = endgameDocuments.find((item) => item.id === 'END-006');
assert.equal(end006.status, 'unsettled');
assert.equal(end006.expectedScore, null);
for (const item of endgameDocuments.filter((candidate) => candidate.id !== 'END-006')) {
  assert.equal(item.status, 'teaching-assumption', `${item.id} 终局边界`);
  assert.deepEqual(item.agreement.confirmedBy, [], `${item.id} 不得伪造双方确认`);
}

console.log('PASS: MERGE_A integrity; 201 T09 files, 30 formal puzzles, 6 endgames, schema v1 and GO-CLUB-AREA-1 verified.');

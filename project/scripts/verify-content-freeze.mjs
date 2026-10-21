/** Portable, read-only freeze verification. Run from either supplied package. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const manifest = read('handoff/CONTENT_FREEZE.json');
assert.equal(manifest.schemaVersion, 1, 'Unknown freeze schema major');
assert.equal(manifest.rulesetId, 'GO-CLUB-AREA-1');
assert.equal(manifest.status, 'complete-file-lock');
assert.equal(manifest.blockers.length, 0);
assert.equal(manifest.humanReviewed, null, 'File freeze must not impersonate human review');
const seen = new Set();
for (const item of manifest.files) {
  assert(!path.isAbsolute(item.path) && !item.path.split('/').includes('..'), 'Unsafe path');
  assert(!seen.has(item.path), 'Duplicate manifest path: '+item.path); seen.add(item.path);
  const bytes = fs.readFileSync(path.join(root, item.path));
  assert.equal(bytes.length, item.bytes, 'Length mismatch: '+item.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256, 'Changed frozen file: '+item.path);
}
const expectedIds = ['LIB','CAP','CON','LIFE','AREA','DISC'].flatMap(c =>
  Array.from({length:5}, (_,i) => `${c}-${String(i+1).padStart(3,'0')}`));
const terminalIds = Array.from({length:6}, (_,i) => `END-${String(i+1).padStart(3,'0')}`);
assert.deepEqual(manifest.puzzles.map(p=>p.id).sort(), expectedIds.sort());
assert.deepEqual(manifest.terminals.map(p=>p.id).sort(), terminalIds);
const bundle = read(manifest.bundle.path);
assert.equal(bundle.items.length, 36);
assert.equal(new Set(bundle.items.map(x=>x.id)).size, 36);
for (const item of [...manifest.puzzles, ...manifest.terminals]) {
  assert(seen.has(item.path) && seen.has(item.diagram.path));
  const d = read(item.path);
  assert.equal(d.id, item.id); assert.equal(d.revision, item.revision);
  assert.equal(d.schemaVersion, 1); assert.equal(d.rulesetId, manifest.rulesetId);
  assert.deepEqual(bundle.items.find(x=>x.id===d.id), d, 'Bundle differs: '+d.id);
  assert(!d.developmentOnly && !/^(TEST|TEMPLATE|DEMO)-/.test(d.id));
  for (const field of ['structure','moveLegality','solutionChecked']) {
    assert.equal(d.validation[field]?.status, 'passed', d.id+' '+field);
  }
  assert.equal(d.validation.humanReviewed, null);
}
for (const [dir, ids] of [['content/puzzles', expectedIds], ['content/endgames', terminalIds]]) {
  assert.deepEqual(fs.readdirSync(path.join(root,dir)).filter(n=>n.endsWith('.json')).map(n=>n.slice(0,-5)).sort(), ids);
}
assert.equal(read('content/endgames/END-006.json').expectedScore, null);
assert.equal(read('content/endgames/END-006.json').status, 'unsettled');
assert.equal(manifest.puzzles.filter(p=>p.grading==='discussion-only').length, 5);
console.log(`PASS ${manifest.freezeId}: ${manifest.files.length} SHA-256 files, 30 puzzles, 6 terminals, exact bundle/revisions. Human review not performed.`);

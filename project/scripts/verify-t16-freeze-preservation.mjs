/** Verify the formal content, schema, rules and frozen T20 material while allowing T16 application files to change. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'handoff/CONTENT_FREEZE.json'),'utf8'));
assert.equal(manifest.schemaVersion,1);assert.equal(manifest.rulesetId,'GO-CLUB-AREA-1');assert.equal(manifest.freezeId,'GO-CLUB-FREEZE-B-20260919-01');
const exact=new Set(['docs/RULES.md','docs/CONTENT_SCHEMA.md','src/core/content.generated.ts']);
const prefixes=['content/','schemas/','materials/t20/'];
const selected=manifest.files.filter(item=>exact.has(item.path)||prefixes.some(prefix=>item.path.startsWith(prefix)));
assert(selected.length>100,'Expected the formal freeze subset');
for(const item of selected){const bytes=fs.readFileSync(path.join(root,item.path));assert.equal(bytes.length,item.bytes,`Length mismatch: ${item.path}`);assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256,`Changed frozen file: ${item.path}`);}
const bundle=JSON.parse(fs.readFileSync(path.join(root,manifest.bundle.path),'utf8'));assert.equal(bundle.items.length,36);assert.equal(manifest.puzzles.length,30);assert.equal(manifest.terminals.length,6);assert(manifest.puzzles.every(item=>item.revision===1));assert(manifest.terminals.every(item=>item.revision===1));
console.log(`PASS ${manifest.freezeId}: ${selected.length} content/rules/schema files unchanged; 30 puzzles + 6 terminals remain at frozen revisions.`);

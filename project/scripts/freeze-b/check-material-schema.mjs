import fs from 'node:fs';
import assert from 'node:assert/strict';
import {validateContent} from '../../src/core/validation.ts';
const entries=fs.readdirSync('materials/rule-cards/data').filter(x=>x.startsWith('RULE-DEMO-T20-'));
for(const name of entries){const d=JSON.parse(fs.readFileSync('materials/rule-cards/data/'+name,'utf8'));assert.equal(validateContent(d).ok,true,name);assert.equal(d.historyPolicy,'fresh-setup');assert.equal(d.history,null);}
assert.equal(entries.length,9);console.log('PASS: 9 T20 Positions conform to the current schema; fresh setup, unknown prior history.');

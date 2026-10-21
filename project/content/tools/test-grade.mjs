import fs from 'node:fs';
import assert from 'node:assert/strict';
import { gradePuzzle } from './grade.mjs';
const b=JSON.parse(fs.readFileSync(new URL('../t09/bundle.json',import.meta.url)));
const p=id=>b.items.find(x=>x.id===id);let count=0;
function test(id,response,verdict,moves=[]){count++;assert.equal(gradePuzzle(p(id),response,moves).verdict,verdict,id);}
test('LIB-001',{type:'number',value:4},'success');test('LIB-001',{type:'number',value:5},'failure');test('LIB-001',{type:'number',value:NaN},'invalid');
test('LIB-002',{type:'point-set',points:[{row:1,col:0},{row:0,col:1}]},'success');test('LIB-002',{type:'point-set',points:[{row:1,col:0},{row:1,col:0}]},'invalid');
const m=(r,c,color='B')=>({type:'place',color,at:{row:r,col:c}});
test('CAP-001',{type:'move',move:m(2,3)},'success');test('CAP-001',{type:'move',move:m(0,0)},'unknown');
test('CAP-001',{type:'move',move:m(2,2)},'invalid');test('CAP-001',{type:'move',move:m(2,3,'W')},'invalid');
test('CON-002',{type:'move',move:m(1,2)},'success');test('CON-002',{type:'move',move:m(2,1)},'success');
test('LIFE-005',{type:'move',move:m(0,1,'W')},'continue');
test('LIFE-005',{type:'move',move:m(0,1,'W')},'success',[m(0,1,'W'),m(0,2)]);
test('DISC-001',{type:'open-text',text:'我选择自己的合法候选，并解释回应。'},'discussion');test('DISC-001',{type:'open-text',text:'<script>alert(1)</script>'},'discussion');
test('AREA-002',{type:'region-labels',labels:p('AREA-002').answer.labels.slice().reverse()},'success');
test('AREA-005',{type:'reason-choice',optionIds:['area']},'success');test('AREA-005',{type:'reason-choice',optionIds:['prisoners']},'failure');
const before=JSON.stringify(b);gradePuzzle(p('CAP-001'),{type:'move',move:m(2,2)});assert.equal(JSON.stringify(b),before);count++;
const unverified=structuredClone(p('LIB-001'));unverified.validation.solutionChecked=null;assert.equal(gradePuzzle(unverified,{type:'number',value:4}).verdict,'unknown');count++;
console.log(`PASS: ${count} adapter checks including legal unknown, multiple solutions, invalid-state preservation and open discussion.`);

test('CAP-001',{type:'move',move:m(1,3)},'failure');console.log('PASS: known wrong first move immediately fails the one-move objective.');

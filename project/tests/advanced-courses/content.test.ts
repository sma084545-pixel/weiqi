import {describe,it,expect} from 'vitest';
import Ajv from 'ajv';
import formal from '../../schemas/content.schema.json';
import schema from '../../schemas/advanced-course.schema.json';
import {courseBundle,advancedScenes,advancedLessons,sceneById} from '../../src/features/advanced-courses/data';
import {sceneState,replayLine,judgeScene} from '../../src/features/advanced-courses/model';
import {getLiberties,getGroup,getAtariGroups,tryMove} from '../../src/core/rules';
import {layoutKey} from '../../src/core/coordinates';
const s=(id:string)=>sceneById(id)!;
const root=(id:string)=>{const r=sceneState(s(id));if(!r.ok)throw Error(id);return r.value;};
describe('advanced course coordinate and evidence contracts',()=>{
 it('has six linked lessons, exactly 37 original scenes and no fake human review',()=>{
  expect(advancedLessons.map(l=>l.number)).toEqual([7,8,9,10,11,12]);expect(advancedScenes).toHaveLength(37);
  expect(advancedLessons.map(l=>l.sceneIds.length)).toEqual([6,8,7,6,6,4]);
  for(const lesson of advancedLessons){for(const id of [...lesson.sceneIds,lesson.introSceneId,...lesson.guidedSceneIds,...lesson.concepts.map(c=>c.sceneId)])expect(s(id).lesson).toBe(lesson.number);expect(lesson.summary.length).toBeGreaterThanOrEqual(2);}
  expect(new Set(advancedScenes.map(s=>s.id)).size).toBe(37);expect(advancedScenes.every(s=>s.evidence.humanReviewed===null)).toBe(true);
 });
 it('validates the supplement and rejects unknown schema, bad coordinates and missing evidence',()=>{
  const ajv=new Ajv({allErrors:true,strict:false});ajv.addSchema(formal);const check=ajv.compile(schema);expect(check(courseBundle),JSON.stringify(check.errors)).toBe(true);
  for(const mutate of [(v:any)=>v.schemaVersion=2,(v:any)=>v.scenes[0].position.stones[0].row=99,(v:any)=>delete v.scenes[0].evidence.handCalculation,(v:any)=>v.scenes[0].evidence.humanReviewed={reviewer:'fabricated'}]){const copy=structuredClone(courseBundle);mutate(copy);expect(check(copy)).toBe(false);expect(check.errors?.length).toBeGreaterThan(0);}
 });
 for(const scene of advancedScenes)it(`${scene.id}: legal complete board, choices, literal liberty and capture vectors`,()=>{
  const r=sceneState(scene);expect(r.ok).toBe(true);if(!r.ok)return;
  expect(r.value.history.layouts).toHaveLength(1);expect(scene.position.historyPolicy).toBe('fresh-setup');
  for(const pos of [scene.comparison?.position,...(scene.illustrations??[]).map(i=>i.position)].filter(Boolean))expect(sceneState({...scene,position:pos!}).ok).toBe(true);
  for(const target of scene.libertyTargets??[]){const libs=getLiberties(r.value.board,target.at);expect(libs.ok).toBe(true);if(libs.ok)expect(libs.value).toEqual(target.expected.slice().sort((a,b)=>a.row-b.row||a.col-b.col));}
  for(const line of scene.lines){const result=replayLine(scene,line);expect(result.events.map(e=>e.captured.length)).toEqual(line.captures);expect(line.notes).toHaveLength(line.moves.length);}
  for(const c of scene.choices){const response=c.at&&scene.interaction==='point'?{kind:'point' as const,at:c.at}:c.at&&scene.interaction==='group'?{kind:'group' as const,at:c.at}:{kind:'choice' as const,id:c.id};expect(judgeScene(scene,response).verdict).toBe(c.verdict);}
 });
 it('empty triangle is 7 liberties, three-stone line is 8; diagonal is not merged',()=>{
  const t=root('ADV-07-01');expect(getLiberties(t.board,{row:1,col:1})).toMatchObject({ok:true,value:expect.any(Array)});
  const a=getLiberties(t.board,{row:1,col:1});expect(a.ok&&a.value.length).toBe(7);
  const b=sceneState({...s('ADV-07-01'),position:s('ADV-07-01').comparison!.position});if(!b.ok)throw Error('line');expect(getLiberties(b.value.board,{row:2,col:2})).toMatchObject({value:expect.any(Array)});const libs=getLiberties(b.value.board,{row:2,col:2});expect(libs.ok&&libs.value.length).toBe(8);
  const d=root('ADV-07-05');expect(getGroup(d.board,{row:1,col:1})).toMatchObject({value:{stones:[{row:1,col:1}]}});
 });
 it('soft connection remains separate until the authored response connects; a cut can be captured',()=>{
  const scene=s('ADV-07-04');const a=replayLine(scene,scene.lines[0]);const b=replayLine(scene,scene.lines[1]);
  const before=getGroup(a.states[1].board,{row:2,col:1});expect(before.ok&&before.value?.stones.some(p=>p.col===3)).toBe(false);
  for(const result of [a,b]){const g=getGroup(result.states.at(-1)!.board,{row:2,col:1});expect(g.ok&&g.value?.stones.some(p=>p.row===2&&p.col===3)).toBe(true);}
  expect(b.events.at(-1)?.captured).toEqual([{row:2,col:2}]);
 });
 it('double atari affects two different groups and accepts either defence',()=>{
  const scene=s('ADV-08-01'),a=replayLine(scene,scene.lines[0]);const status=getAtariGroups(a.states[1].board);expect(status.ok&&status.value.filter(g=>g.color==='W').length).toBe(2);
  expect(replayLine(scene,scene.lines[1]).events.at(-1)?.captured).toEqual([{row:1,col:1}]);
 });
 it('ladder full line captures 12; ladder breaker stops that same capture line',()=>{
  const ladder=replayLine(s('ADV-08-02'),s('ADV-08-02').lines[0]);expect(ladder.states.at(-1)!.board[2][2]).toBe(null);expect(ladder.events.at(-1)?.captured).toHaveLength(12);
  const broken=replayLine(s('ADV-08-03'),s('ADV-08-03').lines[2]);const libs=getLiberties(broken.states.at(-1)!.board,{row:2,col:2});expect(libs.ok&&libs.value.length).toBeGreaterThanOrEqual(3);
  for(const line of s('ADV-08-03').lines.slice(0,2))expect(replayLine(s('ADV-08-03'),line).events.at(-1)?.captured).toHaveLength(3);
 });
 it('snapback is 0,1,3 captured and does not recreate the old layout',()=>{
  const scene=s('ADV-08-04'),r=replayLine(scene,scene.lines[0]);expect(r.events.map(e=>e.captured.length)).toEqual([0,1,3]);expect(r.states[3].history.layouts).toHaveLength(4);expect(layoutKey(r.states[3].board)).not.toBe(layoutKey(r.states[1].board));
 });
 it('same equal race board changes result with actual first player, not just a label',()=>{
  const a=s('ADV-09-03'),b=s('ADV-09-06');expect(a.position.stones).toEqual(b.position.stones);expect(a.position.toPlay).toBe('B');expect(b.position.toPlay).toBe('W');
  const black=replayLine(a,a.lines[0]),white=replayLine(b,b.lines[0]);expect(black.events.at(-1)?.captured).toHaveLength(2);expect(white.events.at(-1)?.captured).toHaveLength(3);
  expect(black.states.at(-1)!.board[4][2]).toBe('B');expect(white.states.at(-1)!.board[4][5]).toBe('W');
 });
 it('two protected true eyes actually reject the opponent at both points',()=>{
  for(const id of ['ADV-09-07','ADV-10-02']){const game=root(id);for(const at of [{row:1,col:1},{row:1,col:3}])expect(tryMove(game,{type:'place',color:game.toPlay,at})).toMatchObject({ok:false,error:{code:'SUICIDE'}});}
 });
});

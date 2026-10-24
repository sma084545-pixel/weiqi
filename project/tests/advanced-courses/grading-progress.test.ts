import {describe,it,expect} from 'vitest';
import {judgeScene,replayResponse,sceneState} from '../../src/features/advanced-courses/model';
import {sceneById,advancedLessons} from '../../src/features/advanced-courses/data';
import {emptyLessonProgress,currentSceneAttempt,saveSceneAttempt,lessonKey,practiceReadiness,learningStatus} from '../../src/features/advanced-courses/progress';
import {createLearningProgressStore,emptyLearningProgress,LEARNING_PROGRESS_KEY,setStageMark} from '../../src/features/learning-hub/progress';
import {namespaceForKey} from '../../src/core/unified-persistence';
import {STAGES} from '../../src/features/learning-hub/stages';
const scene=(id:string)=>sceneById(id)!;
describe('goal-bound feedback and compatible local progress',()=>{
 it('accepts both net defences and returns unknown for uncovered legal lines',()=>{
  const s=scene('ADV-08-07');for(const l of s.lines)expect(judgeScene(s,{kind:'sequence',moves:l.moves.map(m=>(m as {at:{row:number;col:number}}).at)}).verdict).toBe('success');
  expect(judgeScene(scene('ADV-08-04'),{kind:'sequence',moves:[{row:4,col:4}]}).verdict).toBe('unknown');
  expect(judgeScene(scene('ADV-07-03'),{kind:'point',at:{row:4,col:4}}).verdict).toBe('unknown');
 });
 it('explains suboptimal, point-set missing/extra, whole group selection, and incomplete input',()=>{
  expect(judgeScene(scene('ADV-07-03'),{kind:'point',at:{row:2,col:2}})).toMatchObject({verdict:'suboptimal',detail:expect.stringContaining('7气')});
  expect(judgeScene(scene('ADV-09-04'),{kind:'points',points:[{row:1,col:1}]})).toMatchObject({verdict:'failure',missing:[{row:2,col:2}],extra:[{row:1,col:1}]});
  expect(judgeScene(scene('ADV-10-01'),{kind:'group',at:{row:0,col:0}}).verdict).toBe('failure');expect(judgeScene(scene('ADV-10-01'),{kind:'group',at:{row:6,col:6}}).verdict).toBe('success');
  expect(judgeScene(scene('ADV-09-04'),{kind:'points',points:[{row:2,col:2},{row:2,col:2}]}).verdict).toBe('incomplete');
 });
 it('illegal actions do not alter state, turn or history',()=>{
  const s=scene('ADV-08-04');const before=JSON.stringify(sceneState(s));expect(judgeScene(s,{kind:'sequence',moves:[{row:0,col:0}]}).verdict).toBe('illegal');expect(JSON.stringify(sceneState(s))).toBe(before);
  expect(replayResponse(s,[{row:99,col:0}])).toMatchObject({ok:false,error:{code:'OUT_OF_BOUNDS'}});
 });
 it('loads old v1 progress without migration, adds lessons and keeps the old six IDs',()=>{
  const map=new Map<string,string>();const port={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);}};
  const old=setStageMark(emptyLearningProgress(),'STAGE-05','practice');map.set(LEARNING_PROGRESS_KEY,JSON.stringify(old));const store=createLearningProgressStore(port);expect(store.load()).toMatchObject({ok:true,value:old});
  const lesson=advancedLessons[0],p=emptyLessonProgress(1),s=scene('ADV-07-01'),attempt={sceneRevision:1,response:{kind:'choice' as const,id:'B'},verdict:'success' as const,hintsUsed:1};
  const next={...old,advancedLessons:{[lessonKey(lesson)]:{...saveSceneAttempt(p,s,attempt),selfMark:'learned' as const,selfMarkRevision:1}}};expect(store.save(next).ok).toBe(true);expect(store.load()).toMatchObject({ok:true,value:next});expect(Object.keys(next.stageMarks).every(id=>/^STAGE-0[1-6]$/.test(id))).toBe(true);
  expect(STAGES.slice(0,6).map(s=>[s.id,s.number,s.title])).toEqual([['STAGE-01',1,'从交叉点开始'],['STAGE-02',2,'打吃、提子与吃子小游戏'],['STAGE-03',3,'完成一盘9路'],['STAGE-04',4,'连接与切断'],['STAGE-05',5,'眼与基础死活'],['STAGE-06',6,'自选挑战与13路']]);
  map.set('go-club:teacher-drafts:v1','draft');map.set('go-club:v1:LIB-001','puzzle');store.clear();expect(port.getItem('go-club:teacher-drafts:v1')).toBe('draft');expect(port.getItem('go-club:v1:LIB-001')).toBe('puzzle');
 });
 it('does not reuse old scene revisions or force mastery for challenge questions',()=>{
  const s=scene('ADV-07-01');const p=saveSceneAttempt(emptyLessonProgress(1),s,{sceneRevision:1,response:{kind:'choice',id:'B'},verdict:'success',hintsUsed:0});
  expect(currentSceneAttempt(p,{...s,revision:2})).toBeUndefined();expect(lessonKey({...advancedLessons[0],revision:2})).not.toBe(lessonKey(advancedLessons[0]));
  const readiness=practiceReadiness(advancedLessons[0],[s],p);expect(readiness).toEqual({completed:1,total:1,recommended:true});
  expect(learningStatus({...advancedLessons[0],revision:2},{...p,selfMarkRevision:1},'learned')).not.toContain('已完成');
  expect(namespaceForKey(LEARNING_PROGRESS_KEY)).toBe('progress');expect(namespaceForKey('go-club:v1:LOCAL-ADVANCED-FULL-GAME-13')).toBe('games');
 });
});

import {describe,it,expect} from 'vitest';
import vectors from '../fixtures/rules-vectors.json';
import {getGroup,getLiberties,getAtariGroups,tryMove,applyPass,resumePlay,undo,redo,resign,startGame,validateSetup,setKomi,restoreGame} from '../../src/core/rules';
import {evaluatePlacement} from '../../src/core/rules/placement';
import {layoutKey} from '../../src/core/coordinates';
import type {Move,Position,Size} from '../../src/core/content.generated';
import {value,board,rows,game,position,place,snapshot} from './helpers';
const ko=()=>vectors.ko.sequence.reduce((s,[r,c])=>place(s,r,c),game());
describe('T01 fixed topology',()=>{
 for(const f of vectors.topology)it(f.id,()=>{expect(value(getGroup(board(f.rows),f.at))?.stones).toEqual(f.stones);expect(value(getLiberties(board(f.rows),f.at))).toEqual(f.liberties);});
 it('empty is not a group',()=>{expect(value(getGroup(game().board,{row:1,col:1}))).toBeNull();expect(value(getLiberties(game().board,{row:1,col:1}))).toEqual([]);});
 it.each([5,9,13,19] as Size[])('%i uses real full boundaries',n=>{const s=place(game(n),n-1,n-1);expect(value(getLiberties(s.board,{row:n-1,col:n-1}))).toEqual([{row:n-2,col:n-1},{row:n-1,col:n-2}]);expect(s.board).toHaveLength(n);});
 it('rejects malformed matrix, unknown cell and out of bounds',()=>{expect(getGroup([[null]] as any,{row:0,col:0})).toMatchObject({ok:false,error:{code:'INVALID_BOARD'}});const b=board(vectors.topology[0].rows);(b[0] as any)[0]='X';expect(getLiberties(b,{row:0,col:0})).toMatchObject({ok:false,error:{code:'INVALID_BOARD'}});expect(getGroup(game().board,{row:5,col:0})).toMatchObject({ok:false,error:{code:'OUT_OF_BOUNDS'}});});
});
describe('T01 placement transactions',()=>{
 for(const f of vectors.placements)it(f.id,()=>{
  const original=game(f.rows),input=structuredClone(original),before=JSON.stringify(input);
  const result=tryMove(input,f.move as Extract<Move,{type:'place'}>);
  expect(JSON.stringify(input)).toBe(before);expect(Object.isFrozen(input)).toBe(false);
  if(f.error){expect(result).toMatchObject({ok:false,error:{code:f.error}});return;}
  const t=value(result);expect(rows(t.nextState.board)).toEqual(f.after);expect(t.event.captured).toEqual(f.captured);expect(t.nextState.captures).toEqual({B:f.captured!.length,W:0});
  expect(t.event.before).toEqual(original.board);expect(t.event.after).toEqual(t.nextState.board);expect(t.nextState.toPlay).toBe('W');
  if(f.libertiesBefore)expect(t.event.libertiesBefore).toEqual(f.libertiesBefore);if(f.libertiesAfter)expect(t.event.libertiesAfter).toEqual(f.libertiesAfter);
  expect(Object.isFrozen(t.nextState.board[0])).toBe(true);
 });
 it('atari reports the actual block and last liberty',()=>{const g=game(vectors.placements[0].rows);expect(value(getAtariGroups(g.board))).toContainEqual({color:'W',stones:[{row:1,col:1}],liberties:[{row:1,col:2}],isAtari:true});const t=value(tryMove(g,vectors.placements[0].move as any));expect(t.event.groupsBefore?.some(g=>g.color==='W'&&g.isAtari)).toBe(true);expect(t.event.groupsAfter?.some(g=>g.color==='W')).toBe(false);});
 it.each([
  ['NOT_YOUR_TURN','W',0,0],['OUT_OF_BOUNDS','B',-1,0],['OUT_OF_BOUNDS','B',5,0],['OUT_OF_BOUNDS','B',0.5,0],['OCCUPIED','B',1,1]
 ])('%s rejects without state changes',(code,color,row,col)=>{const s=game(['.....','.B...','.....','.....','.....']);const text=JSON.stringify(s);expect(tryMove(s,{type:'place',color,at:{row,col}} as any)).toMatchObject({ok:false,error:{code}});expect(JSON.stringify(s)).toBe(text);});
 it('legal place resets pass count',()=>{const s=value(applyPass(game(),'B')).nextState;expect(place(s,0,0).consecutivePasses).toBe(0);});
 it('trial leaves original revision/history uncommitted',()=>{const s=game(),a=place(s,0,0),b=place(s,1,1);expect(s.moves).toEqual([]);expect(s.history.layouts).toHaveLength(1);expect(a.revision).toBe(2);expect(b.board[0][0]).toBeNull();});
});
describe('T01 positional superko',()=>{
 it('from empty: ko, rejected recapture, genuine atari threat, answer, legal retake',()=>{
  const before=ko();expect(rows(before.board)).toEqual(vectors.ko.before);expect(before.history.layouts[0]).toBe('5|.........................');
  const captured=value(tryMove(before,vectors.ko.capture as any)).nextState;expect(rows(captured.board)).toEqual(vectors.ko.after);
  const text=JSON.stringify(captured);expect(tryMove(captured,vectors.ko.recapture as any)).toMatchObject({ok:false,error:{code:'SUPERKO'}});expect(JSON.stringify(captured)).toBe(text);
  const threat=value(tryMove(captured,vectors.ko.threat as any)).nextState;expect(value(getLiberties(threat.board,{row:4,col:4}))).toEqual([{row:4,col:3}]);
  const answer=value(tryMove(threat,vectors.ko.answer as any)).nextState;const retaken=value(tryMove(answer,vectors.ko.recapture as any)).nextState;
  expect(rows(retaken.board)).toEqual(vectors.ko.afterLegalRecapture);expect(retaken.captures).toEqual({B:1,W:1});expect(value(restoreGame(retaken))).toEqual(retaken);
 });
 it('passes and dispute resume preserve old ko prohibition',()=>{let s=value(tryMove(ko(),vectors.ko.capture as any)).nextState;const hist=s.history;s=value(applyPass(s,'W')).nextState;s=value(applyPass(s,'B')).nextState;expect(s.phase).toBe('scoring');expect(s.history).toEqual(hist);s=value(resumePlay(s,'B'));expect(tryMove(s,vectors.ko.recapture as any)).toMatchObject({ok:false,error:{code:'SUPERKO'}});});
 it('explicit detector vector finds older-than-simple-ko layout and initial entry',()=>{
  // Deliberately injected contexts, NOT a played cycle and NOT importable GameStates.
  const s=game(),target='5|B........................',middle='5|....W....................';
  for(const history of [[target,middle,layoutKey(s.board)],[middle,target,'5|....................W....',layoutKey(s.board)]]){
   expect(evaluatePlacement({...s,history:{layouts:history}},{type:'place',color:'B',at:{row:0,col:0}})).toMatchObject({ok:false,error:{code:'SUPERKO'}});
  }
  const forged=structuredClone(s);forged.history.layouts=[target,middle,layoutKey(s.board)];expect(restoreGame(forged).ok).toBe(false);expect(tryMove(forged,{type:'place',color:'B',at:{row:0,col:0}}).ok).toBe(false);
 });
 it('undo excludes future layouts; replaying same move is legal; new branch truncates redo',()=>{const root=game(),a=place(root,0,0),b=place(a,0,1),back=value(undo(b));expect(back.history).toEqual(a.history);const again=place(back,0,1);expect(again.board).toEqual(b.board);expect(again.redoStack).toEqual([]);const different=place(back,1,1);expect(different.history.layouts).not.toContain(layoutKey(b.board));expect(redo(different)).toMatchObject({ok:false,error:{code:'NOTHING_TO_REDO'}});});
});
describe('T01 lifecycle and setup',()=>{
 it('two passes enter confirmation without killing stones',()=>{let s=game(vectors.placements[0].rows);const b=s.board;s=value(applyPass(s,'B')).nextState;s=value(applyPass(s,'W')).nextState;expect(s.phase).toBe('scoring');expect(s.result).toBeNull();expect(s.agreement).toBeNull();expect(s.board).toEqual(b);expect(s.captures).toEqual({B:0,W:0});expect(s.history.layouts).toHaveLength(1);expect(tryMove(s,{type:'place',color:'B',at:{row:0,col:0}})).toMatchObject({ok:false,error:{code:'GAME_NOT_PLAYING'}});});
 it('resign preserves all nonterminal state and rejects later moves',()=>{const s=value(applyPass(game(),'B')).nextState;const t=value(resign(s,'W'));expect(t.nextState.result).toEqual({reason:'resign',winner:'B'});for(const k of ['board','toPlay','captures','history','consecutivePasses'] as const)expect(t.nextState[k]).toEqual(s[k]);expect(t.event.captured).toEqual([]);expect(t.event.libertiesAfter).toEqual([]);expect(tryMove(t.nextState,{type:'place',color:'W',at:{row:0,col:0}})).toMatchObject({ok:false,error:{code:'GAME_NOT_PLAYING'}});expect(snapshot(value(undo(t.nextState)))).toEqual(snapshot(s));});
 it('first capture wins in capture-first, never area',()=>{const s=game(vectors.placements[0].rows,'capture-first');const t=value(tryMove(s,vectors.placements[0].move as any)).nextState;expect(t.result).toEqual({reason:'first-capture',winner:'B'});expect(t.phase).toBe('finished');});
 it('capture-first double pass has no winner; new game resets it',()=>{let s=game(5,'capture-first');s=value(applyPass(s,'B')).nextState;s=value(applyPass(s,'W')).nextState;expect(s.result).toEqual({reason:'two-passes',winner:null});expect(resumePlay(s,'B')).toMatchObject({ok:false,error:{code:'WRONG_MODE'}});expect(game(5,'capture-first').phase).toBe('playing');});
 it('undo/redo restores every snapshot field; revision increases',()=>{const root=game(vectors.placements[0].rows),captured=value(tryMove(root,vectors.placements[0].move as any)).nextState;const p=value(applyPass(captured,'W')).nextState;const back=value(undo(p));expect(snapshot(back)).toEqual(snapshot(captured));expect(back.revision).toBe(p.revision+1);const done=value(redo(back));expect(snapshot(done)).toEqual(snapshot(p));expect(done.redoStack).toEqual([]);expect(value(restoreGame(back))).toEqual(back);});
 it('rejected move, pass, resign do not clear redo',()=>{const s=value(undo(place(place(game(),0,0),1,1)));const text=JSON.stringify(s);expect(tryMove(s,{type:'place',color:'W',at:{row:0,col:0}}).ok).toBe(false);expect(applyPass(s,'B').ok).toBe(false);expect(resign(s,'B').ok).toBe(false);expect(JSON.stringify(s)).toBe(text);expect(value(redo(s)).moves).toHaveLength(2);});
 it('empty undo/redo are structured failures',()=>{expect(undo(game())).toMatchObject({ok:false,error:{code:'NOTHING_TO_UNDO'}});expect(redo(game())).toMatchObject({ok:false,error:{code:'NOTHING_TO_REDO'}});});
 const invalids:[string,(p:Position)=>void][]=[
  ['duplicate',p=>p.stones=[{row:0,col:0,color:'B'},{row:0,col:0,color:'W'}]],
  ['bounds',p=>p.stones=[{row:5,col:0,color:'B'}]],
  ['unknown stone',p=>p.stones=[{row:0,col:0,color:'X' as any}]],
  ['null sparse stone',p=>p.stones=[{row:0,col:0,color:null as any}]],
  ['unknown turn',p=>p.toPlay='X' as any],['missing turn',p=>delete (p as any).toPlay],
  ['zero-liberty',p=>p.stones=position(['BW...','W....','.....','.....','.....']).stones],
  ['schema',p=>(p as any).schemaVersion=2],['size',p=>p.size=7 as any]
 ];
 for(const [name,mutate] of invalids)it(`invalid setup ${name}`,()=>{const p=position();mutate(p);const before=JSON.stringify(p);expect(validateSetup(p)).toMatchObject({ok:false,error:{code:'INVALID_SETUP'}});expect(startGame(p,{mode:'full-game',komi:0,gameId:'DEV-GAME'}).ok).toBe(false);expect(JSON.stringify(p)).toBe(before);});
 it('fresh origin explicitly warns unknown past and accepts chosen turn',()=>{const p=position(9,'W');expect(value(validateSetup(p)).warnings).toEqual(['UNKNOWN_PAST_HISTORY']);const s=value(startGame(p,{mode:'full-game',komi:0,gameId:'DEV-GAME'}));expect(s.toPlay).toBe('W');expect(s.history.layouts).toHaveLength(1);expect(Object.isFrozen(p)).toBe(false);});
 it('recorded position cannot silently lose history',()=>{const p=position();p.historyPolicy='recorded';p.history={layouts:['5|.........................']};expect(validateSetup(p)).toMatchObject({ok:false,error:{code:'HISTORY_REQUIRED'}});});
 it('komi is fixed and immutable after start; capture mode forbids it',()=>{const s=game(5,'full-game',0.5);expect(setKomi(s,7.5)).toMatchObject({ok:false,error:{code:'KOMI_LOCKED'}});expect(value(setKomi(s,0.5))).toBe(s);expect(()=>{s.komi=7.5;}).toThrow();expect(startGame(position(),{mode:'capture-first',komi:0.5,gameId:'DEV-GAME'})).toMatchObject({ok:false,error:{code:'WRONG_MODE'}});});
});

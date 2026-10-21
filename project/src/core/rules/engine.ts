import type {Color,Position,Move,GameState,GameSnapshot,GameEvent,ScoreAgreement,AreaScore} from '../content.generated';
import type {Result,SetupValidation,Trial,ScoreRequest,TransitionEvent} from './contract';
import {boardFromPosition,layoutKey} from '../coordinates';
import {validateContent,parseContent} from '../validation';
import {evaluatePlacement} from './placement';
import {checkedAgreement,computeArea} from './scoring';
import {attempt,unwrap,fail,freeze,clone,checkColor,other,allGroups,equal} from './internal';
export const MAX_GAME_BYTES=64_000_000;
// Only deeply immutable engine results are memoized. External objects always undergo replay.
const trusted=new WeakSet<object>();
function seal(state:GameState):GameState{freeze(state);trusted.add(state);return state;}
function snapshot(s:GameState):GameSnapshot {return {size:s.size,board:s.board,toPlay:s.toPlay,history:s.history,moves:s.moves,captures:s.captures,consecutivePasses:s.consecutivePasses,phase:s.phase,komi:s.komi,lastMove:s.lastMove,agreement:s.agreement,result:s.result};}
function revision(s:GameState):number {if(!Number.isSafeInteger(s.revision)||s.revision>=Number.MAX_SAFE_INTEGER)fail('INVALID_ARGUMENT','/revision');return s.revision+1;}
function stateInput(s:GameState):GameState{return trusted.has(s)?s:unwrap(restoreGame(s));}
function push(s:GameState,event:GameEvent,patch:Partial<GameSnapshot>):GameState {
 return seal({...s,...patch,moves:[...s.moves,event],undoStack:[...s.undoStack,snapshot(s)],redoStack:[],revision:revision(s)});
}
function playable(s:GameState,c:Color){if(s.phase!=='playing')fail('GAME_NOT_PLAYING','/phase');checkColor(c);if(c!==s.toPlay)fail('NOT_YOUR_TURN','/color');}
function quietEvent(s:GameState):TransitionEvent {const groups=allGroups(s.board);return freeze({before:s.board,after:s.board,placed:null,captured:[],libertiesBefore:[],libertiesAfter:[],groupsBefore:groups,groupsAfter:groups});}
export function validateSetup(position:Position):Result<SetupValidation>{return attempt(()=>{
 const result=validateContent(position);if(!result.ok)fail('INVALID_SETUP',result.issues[0].path);
 if(result.value.kind!=='Position')fail('INVALID_SETUP','/kind');
 if(position.historyPolicy!=='fresh-setup')fail('HISTORY_REQUIRED','/historyPolicy');
 const board=boardFromPosition(position);
 const bad=allGroups(board).find(g=>g.liberties.length===0);if(bad)fail('INVALID_SETUP','/stones',bad.stones[0]);
 return {position:clone(position),rootLayout:layoutKey(board),warnings:['UNKNOWN_PAST_HISTORY']};
});}
export function startGame(position:Position,options:{mode:'full-game'|'capture-first';komi:number;gameId:string}):Result<GameState>{return attempt(()=>{
 const checked=unwrap(validateSetup(position));
 if(!options||!['full-game','capture-first'].includes(options.mode))fail('INVALID_ARGUMENT','/mode');
 if(!Number.isFinite(options.komi))fail('INVALID_ARGUMENT','/komi');
 if(options.mode==='capture-first'&&options.komi!==0)fail('WRONG_MODE','/komi');
 const s:GameState={schemaVersion:1,id:options.gameId,revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'GameState',size:position.size,setup:checked.position,mode:options.mode,board:boardFromPosition(checked.position),toPlay:position.toPlay,history:{layouts:[checked.rootLayout]},moves:[],captures:{B:0,W:0},consecutivePasses:0,phase:'playing',komi:options.komi,lastMove:null,agreement:null,result:null,undoStack:[],redoStack:[]};
 const valid=validateContent(s);if(!valid.ok)fail('INVALID_ARGUMENT',valid.issues[0].path);return seal(s);
});}
export function tryMove(input:GameState,move:Extract<Move,{type:'place'}>):Result<Trial>{return attempt(()=>{
 const s=stateInput(input);playable(s,move?.color);
 const placement=unwrap(evaluatePlacement(s,move));
 const shape=validateContent({schemaVersion:1,id:'DEV-MOVE-CHECK',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Move',size:s.size,move});
 if(!shape.ok)fail('INVALID_ARGUMENT',shape.issues[0].path);
 const action:Extract<Move,{type:'place'}>={type:'place',color:move.color,at:{row:move.at.row,col:move.at.col}};
 const won=s.mode==='capture-first'&&placement.event.captured.length>0;
 const nextState=push(s,action,{board:placement.board,toPlay:other(s.toPlay),history:{layouts:[...s.history.layouts,placement.layout]},captures:{...s.captures,[s.toPlay]:s.captures[s.toPlay]+placement.event.captured.length},consecutivePasses:0,lastMove:action,phase:won?'finished':'playing',agreement:null,result:won?{reason:'first-capture',winner:s.toPlay}:null});
 return freeze({nextState,event:placement.event});
});}
export function applyPass(input:GameState,color:Color):Result<Trial>{return attempt(()=>{
 const s=stateInput(input);playable(s,color);const move:Move={type:'pass',color};const count=s.consecutivePasses+1;
 const nextState=push(s,move,{toPlay:other(color),consecutivePasses:count,lastMove:move,phase:count===2?(s.mode==='full-game'?'scoring':'finished'):'playing',result:count===2&&s.mode==='capture-first'?{reason:'two-passes',winner:null}:null});
 return freeze({nextState,event:quietEvent(s)});
});}
export function resign(input:GameState,color:Color):Result<Trial>{return attempt(()=>{
 const s=stateInput(input);playable(s,color);const move:Move={type:'resign',color};
 return freeze({nextState:push(s,move,{phase:'finished',lastMove:move,result:{reason:'resign',winner:other(color)}}),event:quietEvent(s)});
});}
export function undo(input:GameState):Result<GameState>{return attempt(()=>{const s=stateInput(input),previous=s.undoStack.at(-1);if(!previous)fail('NOTHING_TO_UNDO');return seal({...s,...previous,undoStack:s.undoStack.slice(0,-1),redoStack:[...s.redoStack,snapshot(s)],revision:revision(s)});});}
export function redo(input:GameState):Result<GameState>{return attempt(()=>{const s=stateInput(input),next=s.redoStack.at(-1);if(!next)fail('NOTHING_TO_REDO');return seal({...s,...next,undoStack:[...s.undoStack,snapshot(s)],redoStack:s.redoStack.slice(0,-1),revision:revision(s)});});}
export function resumePlay(input:GameState,requestedBy:Color):Result<GameState>{return attempt(()=>{
 const s=stateInput(input);checkColor(requestedBy);if(s.mode!=='full-game')fail('WRONG_MODE','/mode');if(s.phase!=='scoring')fail('NOT_SCORING','/phase');
 return push(s,{type:'resume',requestedBy},{consecutivePasses:0,phase:'playing',agreement:null,result:null});
});}
export function confirmScore(input:GameState,agreement:ScoreAgreement):Result<GameState>{return attempt(()=>{
 const s=stateInput(input);if(s.mode!=='full-game')fail('WRONG_MODE','/mode');if(s.phase!=='scoring')fail('NOT_SCORING','/phase');
 const marks=checkedAgreement(s.board,agreement);if(marks.confirmedBy.length!==2)fail('AGREEMENT_REQUIRED','/agreement/confirmedBy');
 const score=computeArea({board:s.board,komi:s.komi,agreement:marks,basis:'confirmed',assumptions:[]},'confirmed');
 return push(s,{type:'confirm-score',agreement:marks},{phase:'finished',agreement:marks,result:{reason:'area',score}});
});}
export function scoreArea(request:ScoreRequest):Result<AreaScore>{return attempt(()=>{
 let basis:AreaScore['basis']='preview';
 if(!['preview','confirmed','teaching-assumption'].includes(request.basis)||!Array.isArray(request.assumptions))fail('INVALID_ARGUMENT','/basis');
 if(request.basis==='teaching-assumption'){
  if(!request.assumptions.length||request.assumptions.some(s=>typeof s!=='string'||!s.trim()))fail('INVALID_ARGUMENT','/assumptions');basis='teaching-assumption';
 }
 if(request.basis==='confirmed'&&request.confirmation){
  const s=stateInput(request.confirmation);
  if(s.mode==='full-game'&&s.consecutivePasses===2&&(s.phase==='scoring'||(s.phase==='finished'&&s.result?.reason==='area'))&&equal(s.board,request.board)&&s.komi===request.komi){
   const marks=checkedAgreement(s.board,request.agreement);
   if(marks.confirmedBy.length===2&&(s.phase==='scoring'||equal(marks,s.agreement)))basis='confirmed';
  }
 }
 return freeze(computeArea(request,basis));
});}
export function setKomi(input:GameState,komi:number):Result<GameState>{return attempt(()=>{const s=stateInput(input);if(komi!==s.komi)fail('KOMI_LOCKED','/komi');return s;});}
function replayEvent(s:GameState,e:GameEvent):GameState {
 switch(e.type){
  case 'place':return unwrap(tryMove(s,e)).nextState;
  case 'pass':return unwrap(applyPass(s,e.color)).nextState;
  case 'resign':return unwrap(resign(s,e.color)).nextState;
  case 'resume':return unwrap(resumePlay(s,e.requestedBy));
  case 'confirm-score':return unwrap(confirmScore(s,e.agreement));
 }
}
function compareSnapshot(expected:GameSnapshot,actual:GameSnapshot,path:string):void {
 for(const key of Object.keys(expected) as (keyof GameSnapshot)[])if(!equal(expected[key],actual[key]))fail('IMPORT_MISMATCH',`${path}/${key}`);
}
export function restoreGame(serialized:unknown):Result<GameState>{return attempt(()=>{
 // JSON normalization rejects cycles/BigInt and separates all externally held references.
 let text:string;try{text=typeof serialized==='string'?serialized:JSON.stringify(serialized);}catch{fail('IMPORT_MISMATCH','/');}
 if(typeof text!=='string')fail('IMPORT_MISMATCH','/');
 const checked=parseContent(text,{maxBytes:MAX_GAME_BYTES});if(!checked.ok)fail('IMPORT_MISMATCH',checked.issues[0].path);
 if(checked.value.kind!=='GameState')fail('IMPORT_MISMATCH','/kind');const given=checked.value;
 if(!Number.isSafeInteger(given.revision))fail('IMPORT_MISMATCH','/revision');
 if(given.undoStack.length!==given.moves.length)fail('IMPORT_MISMATCH','/undoStack');
 const komi=given.undoStack[0]?.komi??given.komi;
 if([given,...given.undoStack,...given.redoStack].some(s=>s.komi!==komi))fail('KOMI_LOCKED','/komi');
 const initial=startGame(given.setup,{mode:given.mode,komi,gameId:given.id});if(!initial.ok)fail('IMPORT_MISMATCH','/setup');let current=initial.value;
 function replay(s:GameState,e:GameEvent,path:string){try{return replayEvent(s,e);}catch{fail('IMPORT_MISMATCH',path);}}
 for(let i=0;i<given.moves.length;i++){
  compareSnapshot(snapshot(current),given.undoStack[i],`/undoStack/${i}`);
  current=replay(current,given.moves[i],`/moves/${i}`);
 }
 compareSnapshot(snapshot(current),snapshot(given),'');
 let future=current;const redoStack:GameSnapshot[]=[];
 for(let i=given.redoStack.length-1;i>=0;i--){const target=given.redoStack[i];
  if(target.moves.length!==future.moves.length+1||!equal(target.moves.slice(0,-1),future.moves))fail('IMPORT_MISMATCH',`/redoStack/${i}/moves`);
  future=replay(future,target.moves.at(-1)!,`/redoStack/${i}/moves`);compareSnapshot(snapshot(future),target,`/redoStack/${i}`);redoStack.unshift(snapshot(future));
 }
 return seal({...current,revision:given.revision,redoStack});
});}
export function serializeGame(input:GameState):Result<string>{return attempt(()=>{
 const s=stateInput(input),text=JSON.stringify(s);if(new TextEncoder().encode(text).length>MAX_GAME_BYTES)fail('EXPORT_TOO_LARGE','/');return text;
});}

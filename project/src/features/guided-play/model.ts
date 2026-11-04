import type {Coord,GameState} from '../../core/content.generated';
import {rulesEngine} from '../../core/rules';
import {createFullGameMatch,restoreFullGame,playAt,passTurn,type FullGameFlowResult} from '../full-game/model';
import {teachingPath,observeMove} from './analyzer';
import {FOCUS,type GuidedOptions,type GuidedSession,type GuidedSummary,type HintUse,type MoveObservation,type TeachingConcept} from './types';

export const GUIDED_GAME_ID='LOCAL-GUIDED-PLAY';
export function validGuidedOptions(value:unknown):value is GuidedOptions {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const v=value as GuidedOptions;
  return Object.keys(v).length===5&&Object.keys(v).every(k=>['size','humanColor','level','goal','opponent'].includes(k))&&[5,9,13,19].includes(v.size)&&['B','W'].includes(v.humanColor)&&[1,2,3].includes(v.level)&&Object.hasOwn(FOCUS,v.goal)&&['local','katago'].includes(v.opponent);
}
export function startGuidedSession(options:GuidedOptions,id:string):GuidedSession {
  if(!validGuidedOptions(options)||!/^GUIDED-[A-Za-z0-9-]{1,110}$/.test(id))throw Error('辅助对局设置无效，请重新选择。');
  const started=rulesEngine.startGame({schemaVersion:1,id:'POS-GUIDED-START',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size:options.size,stones:[],toPlay:'B',historyPolicy:'fresh-setup',history:null},{mode:'full-game',komi:0,gameId:GUIDED_GAME_ID});
  if(!started.ok)throw Error('起点未通过规则检查，未改动现有棋局。');
  const match=createFullGameMatch({size:options.size,komi:0,kind:'empty',handicapStones:[]});
  return {schemaVersion:1,id,revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'GuidedPlaySession',options:{...options},match:{...match,game:started.value},hintUses:[],parentSessionId:null};
}
export function updateGuidedMatch(session:GuidedSession,result:FullGameFlowResult):GuidedSession|null {
  return result.ok?{...session,revision:session.revision+1,match:result.value}:null;
}
export function guidedHumanMove(session:GuidedSession,at:Coord|null):FullGameFlowResult {
  const g=session.match.game;
  if(!g||g.toPlay!==session.options.humanColor)return {ok:false,error:{code:'NOT_YOUR_TURN'}};
  return at?playAt(session.match,at):passTurn(session.match);
}
export function addHintUse(session:GuidedSession,level:1|2|3|4):GuidedSession {
  const g=session.match.game;if(!g||g.phase!=='playing'||g.toPlay!==session.options.humanColor)return session;
  const entry:HintUse={path:teachingPath(g),index:g.moves.length,level};
  return {...session,revision:session.revision+1,hintUses:[...session.hintUses,entry].slice(-500)};
}
/** Retry uses the exact original prefix via engine undo, keeping its repetition history. */
export function retryGuidedMoment(session:GuidedSession,beforeIndex:number,newId:string):GuidedSession {
  let g=session.match.game;
  if(!g||g.phase!=='finished'||!Number.isInteger(beforeIndex)||beforeIndex<0||beforeIndex>=g.moves.length)throw Error('这个局面暂时不能重试，原棋谱保持不变。');
  while(g.moves.length>beforeIndex){const r=rulesEngine.undo(g);if(!r.ok)throw Error('回退未完成，原棋谱保留。');g=r.value;}
  if(g.toPlay!==session.options.humanColor||g.phase!=='playing')throw Error('请从你的落子前开始重试。');
  const restored=restoreFullGame(g);if(!restored.ok)throw Error('历史校验失败，原棋谱保留。');
  // The original completed session is saved separately before this function is committed.
  return {...session,id:newId,revision:1,parentSessionId:session.id,match:restored.value,hintUses:[]};
}
export function guidedSummary(session:GuidedSession):GuidedSummary {
  const game=session.match.game,observations:MoveObservation[]=[];
  if(game)for(let i=session.historyBranch?.startEventCount??0;i<game.moves.length;i++){
    const event=game.moves[i];if(event.type!=='place'||event.color!==session.options.humanColor)continue;
    const observation=observeMove(game.undoStack[i],i+1===game.moves.length?game:game.undoStack[i+1],event,FOCUS[session.options.goal]);
    if(observation)observations.push(observation);
  }
  const sum=(key:'captured'|'connections'|'escapes'|'atariTargets')=>observations.reduce((n,o)=>n+o[key],0);
  const selfAtariMoves=observations.filter(o=>o.selfAtari&&o.captured===0).length;
  const concepts=FOCUS[session.options.goal].map(concept=>({concept,count:observations.filter(o=>o.concept===concept).length}));
  const moments=[...observations.filter(o=>o.kind==='danger'),...observations.filter(o=>o.kind==='good'),...observations.filter(o=>o.kind==='consider')].slice(0,3).sort((a,b)=>a.index-b.index);
  if(!moments.length)moments.push(...observations.slice(0,2));
  return {humanMoves:observations.length,capturingMoves:observations.filter(o=>o.captured>0).length,capturedStones:sum('captured'),connections:sum('connections'),escapes:sum('escapes'),atariMoves:observations.filter(o=>o.atariTargets>0).length,selfAtariMoves,hintRequests:session.hintUses.length,concepts,moments,
    improvement:selfAtariMoves?'下一盘只练一件事：落子前，先数自己落子所在棋块的气。':observations.some(o=>o.kind==='consider')?'进攻前先检查旁边有没有一气棋；决定救它或弃子，再行动。':'下一盘先说一句“我想照顾哪块棋”，再比较两个候选方向。'};
}
export function nextLearningRoute(focus:readonly TeachingConcept[]):{route:string;label:string} {
  if(focus.includes('eyes'))return {route:'#/learn/life',label:'眼与基础死活'};
  if(focus.includes('opening'))return {route:'#/route/STAGE-11',label:'大场与行棋方向'};
  if(focus.includes('connection')&&!focus.includes('atari'))return {route:'#/route/STAGE-04',label:'连接与切断'};
  return {route:'#/learn/liberties',label:'气实验室'};
}

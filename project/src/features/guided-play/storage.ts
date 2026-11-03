import type {Coord,GameState} from '../../core/content.generated';
import type {StoragePort} from '../../core/persistence';
import {rulesEngine} from '../../core/rules';
import {restoreFullGame,type ScoringDraft} from '../full-game/model';
import {GUIDED_GAME_ID,guidedSummary,validGuidedOptions} from './model';
import type {GuidedSession,HintUse,LearningGoal,TeachingConcept} from './types';

export const GUIDED_SESSION_KEY='go-club:full-game:guided-play:v1';
export const GUIDED_PROGRESS_KEY='go-club:learning-progress:guided-play:v1';
export const GUIDED_INTRO_KEY='go-club:settings:guided-play:intro:v1';
export const MAX_GUIDED_BYTES=5_000_000;
type Document=Omit<GuidedSession,'match'>&{game:GameState;scoring:ScoringDraft};
type Read={ok:true;session:GuidedSession|null}|{ok:false;message:string};
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const validId=(s:unknown):s is string=>typeof s==='string'&&/^GUIDED-[A-Za-z0-9-]{1,110}$/.test(s);
export function parseGuidedSession(text:string):Read {
  try{
    if(new TextEncoder().encode(text).length>MAX_GUIDED_BYTES)throw Error();
    const d=JSON.parse(text) as Document;
    if(!plain(d)||Object.keys(d).some(k=>!['schemaVersion','id','revision','rulesetId','kind','options','game','scoring','hintUses','parentSessionId'].includes(k))||d.schemaVersion!==1||!validId(d.id)||d.rulesetId!=='GO-CLUB-AREA-1'||d.kind!=='GuidedPlaySession'||!Number.isSafeInteger(d.revision)||d.revision<1||!validGuidedOptions(d.options)||!(d.parentSessionId===null||validId(d.parentSessionId)))throw Error();
    const r=restoreFullGame(d.game);if(!r.ok||!r.value.game)throw Error();const g=r.value.game;
    if(g.id!==GUIDED_GAME_ID||g.size!==d.options.size||g.komi!==0||g.setup.stones.length||g.setup.toPlay!=='B')throw Error();
    const draft=d.scoring;
    if(!plain(draft)||Object.keys(draft).some(k=>!['deadStones','confirmedBy'].includes(k))||!Array.isArray(draft.deadStones)||!Array.isArray(draft.confirmedBy)||draft.confirmedBy.length>2||draft.confirmedBy.some((c,i)=>c!==(i===0?'B':'W')))throw Error();
    const points=draft.deadStones;
    if(points.some((p:Coord)=>!plain(p)||Object.keys(p).some(k=>k!=='row'&&k!=='col')||!Number.isInteger(p.row)||!Number.isInteger(p.col)||p.row<0||p.col<0||p.row>=g.size||p.col>=g.size))throw Error();
    const keys=new Set(points.map(p=>`${p.row},${p.col}`));if(keys.size!==points.length)throw Error();
    for(const p of points){const group=rulesEngine.getGroup(g.board,p);if(!group.ok||!group.value||group.value.stones.some(q=>!keys.has(`${q.row},${q.col}`)))throw Error();}
    if(g.phase==='scoring'&&draft.confirmedBy.length>1)throw Error();
    if(!Array.isArray(d.hintUses)||d.hintUses.length>500||d.hintUses.some((h:HintUse)=>!plain(h)||Object.keys(h).some(k=>!['index','path','level'].includes(k))||!Number.isInteger(h.index)||h.index<0||h.index>4000||![1,2,3,4].includes(h.level)||typeof h.path!=='string'||h.path.length>32_000))throw Error();
    return {ok:true,session:{schemaVersion:1,id:d.id,revision:d.revision,rulesetId:'GO-CLUB-AREA-1',kind:'GuidedPlaySession',options:{...d.options},match:g.phase==='scoring'?{...r.value,scoring:{deadStones:points,confirmedBy:draft.confirmedBy}}:r.value,hintUses:d.hintUses.map(h=>({...h})),parentSessionId:d.parentSessionId}};
  }catch{return {ok:false,message:'辅助对局记录未通过版本、设置或规则重放校验。原记录保留，可先导出本机备份，或明确另开一局。'};}
}
export function guidedSessionJson(session:GuidedSession):string {
  const game=session.match.game;if(!game)throw Error('尚未开局。');
  const serialized=rulesEngine.serializeGame(game);if(!serialized.ok)throw Error('棋局序列化未完成，原记录保留。');
  const {match,...meta}=session;
  const document:Document={...meta,game:JSON.parse(serialized.value),scoring:match.scoring};
  const text=JSON.stringify(document)+'\n';if(new TextEncoder().encode(text).length>MAX_GUIDED_BYTES)throw Error('这盘棋超过本机备份的5 MB记录上限。请先导出 SGF 主线。');return text;
}
export function createGuidedPlayStore(port:StoragePort){return {
  load():Read{try{const text=port.getItem(GUIDED_SESSION_KEY);return text===null?{ok:true,session:null}:parseGuidedSession(text);}catch{return {ok:false,message:'辅助棋局暂时无法读取，原数据保留。可先到“离线与本机数据”备份。'};}},
  save(session:GuidedSession):{ok:true}|{ok:false;message:string}{try{port.setItem(GUIDED_SESSION_KEY,guidedSessionJson(session));return {ok:true};}catch(e){return {ok:false,message:e instanceof Error?`保存未完成：${e.message} 本页棋局仍在，可导出后重试。`:'保存未完成，请先导出本页棋局。'};}},
  archive(session:GuidedSession):{ok:true}|{ok:false;message:string}{try{if(session.match.game?.phase!=='finished')throw Error('原局尚未结束');port.setItem(`go-club:full-game:guided-archive:${session.id}`,guidedSessionJson(session));return {ok:true};}catch{return {ok:false,message:'原局归档失败，未开始新变化。请先导出原局，再重试。'};}},
  saveVariation(session:GuidedSession):{ok:true}|{ok:false;message:string}{try{port.setItem(`go-club:full-game:guided-archive:${session.id}`,guidedSessionJson(session));return {ok:true};}catch{return {ok:false,message:'当前变化未能保存，未切换回原局。请先导出续玩文件。'};}},
  readArchive(id:string):Read{try{if(!validId(id))throw Error();const text=port.getItem(`go-club:full-game:guided-archive:${id}`);return text?parseGuidedSession(text):{ok:false,message:'本机没有找到原局；可从之前导出的续玩文件恢复。'};}catch{return {ok:false,message:'原局暂时无法读取，当前变化保留。'};}},
};}

export interface CompletedPractice {sessionId:string;goal:LearningGoal;humanMoves:number;hintRequests:number;selfAtariMoves:number;concepts:{concept:TeachingConcept;count:number}[]}
export interface GuidedProgress {schemaVersion:1;id:'LOCAL-GUIDED-PROGRESS';revision:number;rulesetId:'GO-CLUB-AREA-1';completed:CompletedPractice[]}
export function emptyGuidedProgress():GuidedProgress{return {schemaVersion:1,id:'LOCAL-GUIDED-PROGRESS',revision:1,rulesetId:'GO-CLUB-AREA-1',completed:[]};}
export function createGuidedProgressStore(port:StoragePort){return {
  load():{ok:true;value:GuidedProgress}|{ok:false;message:string}{try{
    const raw=port.getItem(GUIDED_PROGRESS_KEY);if(!raw)return {ok:true,value:emptyGuidedProgress()};if(raw.length>200_000)throw Error();
    const d=JSON.parse(raw) as GuidedProgress;
    if(d.schemaVersion!==1||d.id!=='LOCAL-GUIDED-PROGRESS'||d.rulesetId!=='GO-CLUB-AREA-1'||!Number.isInteger(d.revision)||d.revision<1||!Array.isArray(d.completed)||d.completed.length>50||new Set(d.completed.map(x=>x.sessionId)).size!==d.completed.length)throw Error();
    const count=(x:unknown)=>Number.isSafeInteger(x)&&Number(x)>=0;
    for(const c of d.completed)if(!validId(c.sessionId)||!['auto','liberties','connection','life','opening'].includes(c.goal)||![c.humanMoves,c.hintRequests,c.selfAtariMoves].every(count)||!Array.isArray(c.concepts)||c.concepts.length>3||c.concepts.some(x=>!['liberties','atari','capture','connection','escape','eyes','opening'].includes(x.concept)||!count(x.count)))throw Error();
    return {ok:true,value:d};
  }catch{return {ok:false,message:'旧辅助学习记录未通过校验，暂不累计。原记录保留，可先导出本机备份。'};}},
  record(session:GuidedSession):{ok:true;value:GuidedProgress}|{ok:false;message:string}{
    if(session.match.game?.phase!=='finished')return {ok:false,message:'本局尚未结束，不记录成完成。'};
    const previous=this.load();if(!previous.ok)return previous;
    const summary=guidedSummary(session),entry:CompletedPractice={sessionId:session.id,goal:session.options.goal,humanMoves:summary.humanMoves,hintRequests:summary.hintRequests,selfAtariMoves:summary.selfAtariMoves,concepts:summary.concepts};
    const old=previous.value.completed.find(c=>c.sessionId===session.id);
    if(JSON.stringify(old)===JSON.stringify(entry))return previous;
    const value:GuidedProgress={...previous.value,revision:previous.value.revision+1,completed:[...previous.value.completed.filter(c=>c.sessionId!==session.id),entry].slice(-50)};
    try{port.setItem(GUIDED_PROGRESS_KEY,JSON.stringify(value));return {ok:true,value};}catch{return {ok:false,message:'练习记录未能保存；本局报告仍可查看和导出。'};}
  },
};}

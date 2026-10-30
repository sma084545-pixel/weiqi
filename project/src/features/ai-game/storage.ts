import type {GameState,Coord} from '../../core/content.generated';
import type {StoragePort} from '../../core/persistence';
import {getGroup,serializeGame,MAX_GAME_BYTES} from '../../core/rules';
import {restoreFullGame,type FullGameMatch,type ScoringDraft} from '../full-game/model';
import {AI_GAME_ID,validAiOptions,type AiOptions} from './model';

export const AI_SESSION_KEY='go-club:full-game:ai:v1';
export const MAX_AI_SESSION_BYTES=MAX_GAME_BYTES+262144;
export interface AiSessionDocument {schemaVersion:1;id:'LOCAL-AI-SESSION';revision:number;rulesetId:'GO-CLUB-AREA-1';kind:'AiGameSession';options:AiOptions;game:GameState;scoring:ScoringDraft}
export type AiSessionRead={ok:true;match:FullGameMatch|null;options:AiOptions|null}|{ok:false;message:string};
export function parseAiSession(text:string):AiSessionRead {
  try{
    if(new TextEncoder().encode(text).length>MAX_AI_SESSION_BYTES)throw Error();
    const d=JSON.parse(text) as AiSessionDocument;
    if(!d||d.schemaVersion!==1||d.id!=='LOCAL-AI-SESSION'||d.rulesetId!=='GO-CLUB-AREA-1'||d.kind!=='AiGameSession'||!Number.isSafeInteger(d.revision)||d.revision<1||!validAiOptions(d.options))throw Error();
    const restored=restoreFullGame(d.game);if(!restored.ok||!restored.value.game||restored.value.game.id!==AI_GAME_ID)throw Error();
    const g=restored.value.game,draft=d.scoring;
    if(!draft||!Array.isArray(draft.deadStones)||!Array.isArray(draft.confirmedBy)||draft.confirmedBy.length>2||draft.confirmedBy.some((c,i)=>c!==(i===0?'B':'W')))throw Error();
    const valid=(p:Coord)=>p&&Number.isInteger(p.row)&&Number.isInteger(p.col)&&p.row>=0&&p.row<g.size&&p.col>=0&&p.col<g.size;
    if(!draft.deadStones.every(valid))throw Error();
    const keys=new Set(draft.deadStones.map(p=>`${p.row},${p.col}`));if(keys.size!==draft.deadStones.length)throw Error();
    for(const p of draft.deadStones){const group=getGroup(g.board,p);if(!group.ok||!group.value||group.value.stones.some(at=>!keys.has(`${at.row},${at.col}`)))throw Error();}
    if(g.phase==='scoring'&&draft.confirmedBy.length>1)throw Error();
    return {ok:true,match:g.phase==='scoring'?{...restored.value,scoring:draft}:restored.value,options:{...d.options}};
  }catch{return {ok:false,message:'AI 对局记录未通过版本、设置或规则重放校验，现有棋局与原数据均未改变。可先导出备份后重试。'};}
}
export function aiSessionJson(match:FullGameMatch,options:AiOptions,revision=match.game?.revision??1):string {
  if(!match.game||!validAiOptions(options))throw Error('尚无有效 AI 对局');
  const serialized=serializeGame(match.game);if(!serialized.ok)throw Error('棋局无法序列化，原存档保留');
  const d:AiSessionDocument={schemaVersion:1,id:'LOCAL-AI-SESSION',revision,rulesetId:'GO-CLUB-AREA-1',kind:'AiGameSession',options,game:JSON.parse(serialized.value),scoring:match.scoring};
  const text=JSON.stringify(d);if(new TextEncoder().encode(text).length>MAX_AI_SESSION_BYTES)throw Error('记录过大，请导出主线棋谱。');
  return text+'\n';
}
export function createAiSessionStore(port:StoragePort){return {
  load():AiSessionRead {try{const raw=port.getItem(AI_SESSION_KEY);return raw===null?{ok:true,match:null,options:null}:parseAiSession(raw);}catch{return {ok:false,message:'本机 AI 记录无法读取。原记录保留，可在离线与本机数据中导出备份。'};}},
  save(match:FullGameMatch,options:AiOptions):{ok:true}|{ok:false;message:string}{
    try{let revision=0;try{revision=JSON.parse(port.getItem(AI_SESSION_KEY)??'null')?.revision??0;}catch{/* Explicitly saving a new validated game may replace a corrupt local record. */}
      const text=aiSessionJson(match,options,Number.isSafeInteger(revision)&&revision>=0?revision+1:1);const checked=parseAiSession(text);if(!checked.ok)return checked;
      port.setItem(AI_SESSION_KEY,text);return {ok:true};
    }catch{return {ok:false,message:'AI 对局写入失败或空间不足。棋局仍在本页，可先导出续玩文件，或稍后重试保存。'};}
  },
};}

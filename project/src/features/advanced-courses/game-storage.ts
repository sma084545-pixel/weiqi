import type {GameState,Coord} from '../../core/content.generated';
import type {StoragePort} from '../../core/persistence';
import {getGroup,serializeGame,MAX_GAME_BYTES} from '../../core/rules';
import {restoreFullGame,type FullGameMatch,type ScoringDraft} from '../full-game/model';
import {GUIDED_GAME_ID} from './teaching-bot';
export const GUIDED_SESSION_KEY='go-club:full-game:guided13:v1';
interface GuidedSessionDocument {schemaVersion:1;id:'LOCAL-ADVANCED-13-SESSION';revision:number;rulesetId:'GO-CLUB-AREA-1';kind:'GuidedGameSession';game:GameState;scoring:ScoringDraft;seen:string[]}
const allowed=new Set(['opening','weak','tactic','direction']);
export function createGuidedSessionStore(port:StoragePort){
 return {
  load():{ok:true;match:FullGameMatch|null;seen:string[]}|{ok:false;message:string}{
   try{
    const raw=port.getItem(GUIDED_SESSION_KEY);if(raw===null)return {ok:true,match:null,seen:[]};
    if(raw.length>MAX_GAME_BYTES+262144)throw Error('记录过大');const d=JSON.parse(raw) as GuidedSessionDocument;
    if(d.schemaVersion!==1||d.id!=='LOCAL-ADVANCED-13-SESSION'||d.rulesetId!=='GO-CLUB-AREA-1'||d.kind!=='GuidedGameSession'||!Number.isSafeInteger(d.revision)||d.revision<1)throw Error('版本或身份字段不支持');
    const restored=restoreFullGame(d.game);if(!restored.ok||!restored.value.game||restored.value.game.id!==GUIDED_GAME_ID||restored.value.game.size!==13)throw Error('棋局未通过规则重放');
    if(!Array.isArray(d.seen)||d.seen.some(x=>!allowed.has(x))||new Set(d.seen).size!==d.seen.length)throw Error('观察点记录不正确');
    const draft=d.scoring;if(!draft||!Array.isArray(draft.deadStones)||!Array.isArray(draft.confirmedBy)||draft.confirmedBy.length>2||draft.confirmedBy.some((c,i)=>c!==(i===0?'B':'W')))throw Error('确认记录不正确');
    const board=restored.value.game.board,points=draft.deadStones;
    const valid=(p:Coord)=>p&&Number.isInteger(p.row)&&Number.isInteger(p.col)&&p.row>=0&&p.row<13&&p.col>=0&&p.col<13;
    const keys=new Set(points.map(p=>`${p.row},${p.col}`));if(keys.size!==points.length||!points.every(valid))throw Error('死子标记越界或重复');
    for(const at of points){const g=getGroup(board,at);if(!g.ok||!g.value||g.value.stones.some(p=>!keys.has(`${p.row},${p.col}`)))throw Error('死子标记不是完整棋块');}
    if(restored.value.game.phase==='scoring')return {ok:true,match:{...restored.value,scoring:draft},seen:d.seen};
    return {ok:true,match:restored.value,seen:d.seen};
   }catch{return {ok:false,message:'这盘引导棋的本机记录未通过校验，原数据保留。可先在“离线与本机数据”导出备份，或明确另开一局。'};}
  },
  save(match:FullGameMatch,seen:string[]):{ok:true}|{ok:false;message:string}{
   if(!match.game)return {ok:false,message:'尚未开局。'};
   const serialized=serializeGame(match.game);if(!serialized.ok)return {ok:false,message:'棋局未通过规则序列化，原存档未改变。'};
   try{const d:GuidedSessionDocument={schemaVersion:1,id:'LOCAL-ADVANCED-13-SESSION',revision:match.game.revision,rulesetId:'GO-CLUB-AREA-1',kind:'GuidedGameSession',game:JSON.parse(serialized.value),scoring:match.scoring,seen};port.setItem(GUIDED_SESSION_KEY,JSON.stringify(d));return {ok:true};}catch{return {ok:false,message:'本机写入失败或空间不足；本页棋局仍在，可先导出棋局并稍后重试。'};}
  },
 };
}

import type {AreaScore,Color,Coord,GameState,Position,Size} from '../../core/content.generated';
import {rulesEngine,type RuleError} from '../../core/rules';

export const FULL_GAME_SIZES=[5,9,13,19] as const;
export type FullGameSize=Size;
export type SetupKind='empty'|'free-handicap';
export interface FullGameSetup {size:FullGameSize;komi:number;kind:SetupKind;handicapStones:Coord[]}
export interface UndoRequest {confirmations:Color[];requestedAtRevision:number}
export interface ScoringDraft {deadStones:Coord[];confirmedBy:Color[]}
export interface FullGameMatch {
  setup:FullGameSetup;
  game:GameState|null;
  undoRequest:UndoRequest|null;
  scoring:ScoringDraft;
  message:string;
}

export type FullGameFlowErrorCode=
  |'GAME_NOT_STARTED'|'SETTINGS_LOCKED'|'SIZE_CHANGE_REQUIRES_CLEAR'|'NO_HANDICAP_STONES'
  |'NOT_A_STONE'|'UNDO_NOT_REQUESTED'|'UNDO_CONFIRMATION_ORDER'|'NO_MOVE_TO_UNDO'
  |'SCORE_CONFIRMATION_ORDER'|'SAVE_NOT_AVAILABLE';
export type FullGameFlowError={code:FullGameFlowErrorCode;field?:string}|RuleError;
export type FullGameFlowResult={ok:true;value:FullGameMatch}|{ok:false;error:FullGameFlowError};

const key=(at:Coord)=>`${at.row},${at.col}`;
const sort=(points:readonly Coord[])=>points.map(at=>({...at})).sort((a,b)=>a.row-b.row||a.col-b.col);
const positionFromSetup=(setup:FullGameSetup):Position=>({
  schemaVersion:1,id:`LOCAL-T08-START-${setup.size}`,revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',
  size:setup.size,toPlay:setup.kind==='free-handicap'?'W':'B',historyPolicy:'fresh-setup',history:null,
  stones:setup.handicapStones.map(at=>({...at,color:'B' as const})),
});

export function createFullGameMatch(setup:FullGameSetup={size:9,komi:0,kind:'empty',handicapStones:[]}):FullGameMatch{
  return {setup:{...setup,handicapStones:sort(setup.handicapStones)},game:null,undoRequest:null,scoring:{deadStones:[],confirmedBy:[]},message:'先选择空盘或本社团自由放置让子；贴目只可在开局前修改。'};
}

export function setKomi(match:FullGameMatch,komi:number):FullGameFlowResult{
  if(match.game)return {ok:false,error:{code:'SETTINGS_LOCKED'}};
  if(!Number.isFinite(komi))return {ok:false,error:{code:'INVALID_ARGUMENT',field:'/komi'}};
  return {ok:true,value:{...match,setup:{...match.setup,komi},message:`本局贴目设为 ${komi}；开局后将锁定。`}};
}

export function setSetupKind(match:FullGameMatch,kind:SetupKind,allowDiscard=false):FullGameFlowResult{
  if(match.game)return {ok:false,error:{code:'SETTINGS_LOCKED'}};
  if(kind==='empty'&&match.setup.handicapStones.length&&!allowDiscard)return {ok:false,error:{code:'SIZE_CHANGE_REQUIRES_CLEAR',field:'/setup/handicapStones'}};
  return {ok:true,value:{...match,setup:{...match.setup,kind,handicapStones:kind==='empty'?[]:match.setup.handicapStones},message:kind==='empty'?'已选择空盘，黑方先行。':'已选择本社团自由放置让子；至少放一颗黑子，之后白方先行。'}};
}

export function setBoardSize(match:FullGameMatch,size:FullGameSize,allowDiscard=false):FullGameFlowResult{
  if(match.game)return {ok:false,error:{code:'SETTINGS_LOCKED'}};
  if(!FULL_GAME_SIZES.includes(size))return {ok:false,error:{code:'INVALID_ARGUMENT',field:'/setup/size'}};
  if(match.setup.handicapStones.length&&!allowDiscard)return {ok:false,error:{code:'SIZE_CHANGE_REQUIRES_CLEAR',field:'/setup/handicapStones'}};
  return {ok:true,value:{...match,setup:{...match.setup,size,handicapStones:[]},message:`已切换为 ${size} 路；原让子${match.setup.handicapStones.length?'已按确认清除':'为空'}。`}};
}

export function toggleHandicapStone(match:FullGameMatch,at:Coord):FullGameFlowResult{
  if(match.game)return {ok:false,error:{code:'SETTINGS_LOCKED'}};
  if(match.setup.kind!=='free-handicap')return {ok:false,error:{code:'INVALID_ARGUMENT',field:'/setup/kind'}};
  if(at.row<0||at.col<0||at.row>=match.setup.size||at.col>=match.setup.size)return {ok:false,error:{code:'OUT_OF_BOUNDS',at,field:'/setup/handicapStones'}};
  const present=match.setup.handicapStones.some(point=>key(point)===key(at));
  const handicapStones=present?match.setup.handicapStones.filter(point=>key(point)!==key(at)):[...match.setup.handicapStones,{...at}];
  return {ok:true,value:{...match,setup:{...match.setup,handicapStones:sort(handicapStones)},message:present?'已移除这颗起始黑子。':'已放置一颗起始黑子；摆好后将由白方先行。'}};
}

export function validateCurrentSetup(match:FullGameMatch){
  if(match.setup.kind==='free-handicap'&&!match.setup.handicapStones.length)return {ok:false as const,error:{code:'NO_HANDICAP_STONES' as const,field:'/setup/handicapStones'}};
  return rulesEngine.validateSetup(positionFromSetup(match.setup));
}

export function startFullGame(match:FullGameMatch):FullGameFlowResult{
  if(match.game)return {ok:false,error:{code:'SETTINGS_LOCKED'}};
  const checked=validateCurrentSetup(match);if(!checked.ok)return checked;
  const started=rulesEngine.startGame(checked.value.position,{mode:'full-game',komi:match.setup.komi,gameId:'LOCAL-T08-FULL-GAME'});
  if(!started.ok)return started;
  return {ok:true,value:{...match,game:started.value,scoring:{deadStones:[],confirmedBy:[]},message:`对局开始：${started.value.toPlay==='B'?'黑方':'白方'}先行；贴目 ${started.value.komi} 已锁定。`}};
}

const gameOf=(match:FullGameMatch)=>match.game?{ok:true as const,value:match.game}:{ok:false as const,error:{code:'GAME_NOT_STARTED' as const}};
export function playAt(match:FullGameMatch,at:Coord):FullGameFlowResult{
  const ready=gameOf(match);if(!ready.ok)return ready;
  const result=rulesEngine.tryMove(ready.value,{type:'place',color:ready.value.toPlay,at});if(!result.ok)return result;
  return {ok:true,value:{...match,game:result.value.nextState,undoRequest:null,scoring:{deadStones:[],confirmedBy:[]},message:`落子完成，轮到${result.value.nextState.toPlay==='B'?'黑方':'白方'}。`}};
}
export function passTurn(match:FullGameMatch):FullGameFlowResult{
  const ready=gameOf(match);if(!ready.ok)return ready;
  const result=rulesEngine.applyPass(ready.value,ready.value.toPlay);if(!result.ok)return result;
  const scoring=result.value.nextState.phase==='scoring';
  return {ok:true,value:{...match,game:result.value.nextState,undoRequest:null,scoring:{deadStones:[],confirmedBy:[]},message:scoring?'双方连续停手，进入终局确认；原盘面与重复历史保持不变。':`已停一手，轮到${result.value.nextState.toPlay==='B'?'黑方':'白方'}。`}};
}
export function resignGame(match:FullGameMatch):FullGameFlowResult{
  const ready=gameOf(match);if(!ready.ok)return ready;
  const loser=ready.value.toPlay,result=rulesEngine.resign(ready.value,loser);if(!result.ok)return result;
  return {ok:true,value:{...match,game:result.value.nextState,undoRequest:null,message:`${loser==='B'?'黑方':'白方'}认输；本局不生成面积分。`}};
}

export function scorePreview(match:FullGameMatch):{ok:true;value:AreaScore}|{ok:false;error:FullGameFlowError}{
  const ready=gameOf(match);if(!ready.ok)return ready;
  if(ready.value.phase!=='scoring'&&!(ready.value.phase==='finished'&&ready.value.result?.reason==='area'))return {ok:false,error:{code:'NOT_SCORING',field:'/phase'}};
  const deadStones=ready.value.agreement?.deadStones??match.scoring.deadStones;
  return rulesEngine.scoreArea({board:ready.value.board,komi:ready.value.komi,agreement:{deadStones,neutralPoints:[],confirmedBy:[]},basis:'preview',assumptions:[]});
}

export function toggleDeadGroup(match:FullGameMatch,at:Coord):FullGameFlowResult{
  const ready=gameOf(match);if(!ready.ok)return ready;
  if(ready.value.phase!=='scoring')return {ok:false,error:{code:'NOT_SCORING',field:'/phase'}};
  const group=rulesEngine.getGroup(ready.value.board,at);if(!group.ok)return group;if(!group.value)return {ok:false,error:{code:'NOT_A_STONE',field:'/agreement/deadStones'}};
  const current=new Set(match.scoring.deadStones.map(key)),remove=group.value.stones.some(point=>current.has(key(point)));
  for(const point of group.value.stones)remove?current.delete(key(point)):current.add(key(point));
  const deadStones=sort([...current].map(value=>{const [row,col]=value.split(',').map(Number);return {row,col};}));
  return {ok:true,value:{...match,scoring:{deadStones,confirmedBy:[]},message:`已${remove?'取消':'标记'}整块${group.value.color==='B'?'黑棋':'白棋'}；之前的双方确认已清空。`}};
}

export function confirmScoreFor(match:FullGameMatch,color:Color):FullGameFlowResult{
  const ready=gameOf(match);if(!ready.ok)return ready;
  if(ready.value.phase!=='scoring')return {ok:false,error:{code:'NOT_SCORING',field:'/phase'}};
  const expected:Color=match.scoring.confirmedBy.length===0?'B':'W';
  if(color!==expected)return {ok:false,error:{code:'SCORE_CONFIRMATION_ORDER'}};
  const preview=scorePreview(match);if(!preview.ok)return preview;
  if(color==='B')return {ok:true,value:{...match,scoring:{...match.scoring,confirmedBy:['B']},message:'黑方已接受当前死子与中立点清单；请白方确认，或修改标记后重新开始确认。'}};
  const agreement={deadStones:match.scoring.deadStones,neutralPoints:preview.value.neutralPoints,confirmedBy:['B','W'] as Color[]};
  const result=rulesEngine.confirmScore(ready.value,agreement);if(!result.ok)return result;
  return {ok:true,value:{...match,game:result.value,scoring:{deadStones:sort(agreement.deadStones),confirmedBy:['B','W']},message:'双方已确认同一份死子与中立点清单，最终面积计分已形成。'}};
}

export function resumeDisputedPlay(match:FullGameMatch,requestedBy:Color):FullGameFlowResult{
  const ready=gameOf(match);if(!ready.ok)return ready;
  const result=rulesEngine.resumePlay(ready.value,requestedBy);if(!result.ok)return result;
  return {ok:true,value:{...match,game:result.value,scoring:{deadStones:[],confirmedBy:[]},undoRequest:null,message:`${requestedBy==='B'?'黑方':'白方'}提出争议；已恢复原盘继续对弈，连续停手清零，重复历史保留。`}};
}

export function requestUndo(match:FullGameMatch):FullGameFlowResult{
  const ready=gameOf(match);if(!ready.ok)return ready;if(!ready.value.moves.length)return {ok:false,error:{code:'NO_MOVE_TO_UNDO'}};
  return {ok:true,value:{...match,undoRequest:{confirmations:[],requestedAtRevision:ready.value.revision},message:'悔棋申请已提出；请黑方与白方在同一设备依次确认。'}};
}
export function confirmUndo(match:FullGameMatch,color:Color):FullGameFlowResult{
  const ready=gameOf(match);if(!ready.ok)return ready;const request=match.undoRequest;if(!request)return {ok:false,error:{code:'UNDO_NOT_REQUESTED'}};
  const expected:Color=request.confirmations.length===0?'B':'W';if(color!==expected)return {ok:false,error:{code:'UNDO_CONFIRMATION_ORDER'}};
  if(color==='B')return {ok:true,value:{...match,undoRequest:{...request,confirmations:['B']},message:'黑方已确认悔棋；请白方确认或拒绝。'}};
  const previousAgreement=ready.value.result?.reason==='area'?ready.value.agreement:null;
  const undone=rulesEngine.undo(ready.value);if(!undone.ok)return undone;
  return {ok:true,value:{...match,game:undone.value,undoRequest:null,scoring:{deadStones:previousAgreement?.deadStones??[],confirmedBy:[]},message:'双方均已确认，已准确撤回一项对局操作；现在可在当前状态继续。'}};
}
export function refuseUndo(match:FullGameMatch):FullGameMatch{return {...match,undoRequest:null,message:'悔棋未获双方同意；原盘面、轮次与历史保持不变。'};}
export function restartToSetup(match:FullGameMatch):FullGameMatch{return createFullGameMatch(match.setup);}

export function restoreFullGame(game:GameState):FullGameFlowResult{
  const restored=rulesEngine.restoreGame(game);if(!restored.ok)return restored;if(restored.value.mode!=='full-game')return {ok:false,error:{code:'WRONG_MODE',field:'/mode'}};
  const setup:FullGameSetup={size:restored.value.size as FullGameSize,komi:restored.value.komi,kind:restored.value.setup.stones.length?'free-handicap':'empty',handicapStones:restored.value.setup.stones.map(({row,col})=>({row,col}))};
  const agreement=restored.value.agreement;
  return {ok:true,value:{setup,game:restored.value,undoRequest:null,scoring:{deadStones:agreement?.deadStones??[],confirmedBy:agreement?.confirmedBy??[]},message:'已从当前设备读取并按规则重放验证完整对局。'}};
}

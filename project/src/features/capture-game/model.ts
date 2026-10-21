import type {Color,Coord,GameState,Position} from '../../core/content.generated';
import {rulesEngine,type RuleError, type TransitionEvent} from '../../core/rules';

export type CaptureSize=5|9;
export type PartnerSeat='A'|'B';
export interface CaptureSettings {size:CaptureSize;showLiberties:boolean}
export interface UndoRequest {confirmations:Color[];requestedAtRevision:number}
export interface CaptureMatch {
  game:GameState;
  settings:CaptureSettings;
  started:boolean;
  seatAColor:Color;
  undoRequest:UndoRequest|null;
  winningEvent:TransitionEvent|null;
  message:string;
}
export type CaptureFlowErrorCode='ROUND_NOT_STARTED'|'SETTINGS_LOCKED'|'NO_MOVE_TO_UNDO'|'UNDO_NOT_REQUESTED'|'UNDO_CONFIRMATION_ORDER';
export type CaptureFlowError={code:CaptureFlowErrorCode}|RuleError;
export type CaptureFlowResult={ok:true;value:CaptureMatch}|{ok:false;error:CaptureFlowError};

const emptyPosition=(size:CaptureSize):Position=>({schemaVersion:1,id:`LOCAL-T07-START-${size}`,revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size,toPlay:'B',historyPolicy:'fresh-setup',history:null,stones:[]});
const startGame=(size:CaptureSize)=>{
  const result=rulesEngine.startGame(emptyPosition(size),{mode:'capture-first',komi:0,gameId:'LOCAL-T07-CAPTURE-GAME'});
  if(!result.ok)throw new Error(result.error.code);
  return result.value;
};

export function createCaptureMatch(settings:CaptureSettings={size:9,showLiberties:false}):CaptureMatch{
  return {game:startGame(settings.size),settings:{...settings},started:false,seatAColor:'B',undoRequest:null,winningEvent:null,message:'请由两位伙伴共同确认本局设置，再开始轮流落子。'};
}

export function configureMatch(match:CaptureMatch,settings:CaptureSettings):CaptureFlowResult{
  if(match.started||match.game.moves.length)return {ok:false,error:{code:'SETTINGS_LOCKED'}};
  return {ok:true,value:{...match,settings:{...settings},game:settings.size===match.settings.size?match.game:startGame(settings.size),message:`已选择 ${settings.size} 路；显示气辅助${settings.showLiberties?'开启':'关闭'}。`}};
}

export function beginRound(match:CaptureMatch):CaptureFlowResult{
  if(match.started)return {ok:true,value:match};
  return {ok:true,value:{...match,started:true,message:'本局开始：黑方先行，先提到任意棋子者立即获胜。'}};
}

export function playAt(match:CaptureMatch,at:Coord):CaptureFlowResult{
  if(!match.started)return {ok:false,error:{code:'ROUND_NOT_STARTED'}};
  const result=rulesEngine.tryMove(match.game,{type:'place',color:match.game.toPlay,at});
  if(!result.ok)return result;
  const gameResult=result.value.nextState.result;
  const winner=gameResult?.reason==='first-capture'?gameResult.winner:null;
  return {ok:true,value:{...match,game:result.value.nextState,undoRequest:null,winningEvent:winner?result.value.event:null,message:winner?`${winner==='B'?'黑方':'白方'}先提到棋子，本局立即结束。`:`落子完成，轮到${result.value.nextState.toPlay==='B'?'黑方':'白方'}。`}};
}

export function passTurn(match:CaptureMatch):CaptureFlowResult{
  if(!match.started)return {ok:false,error:{code:'ROUND_NOT_STARTED'}};
  const result=rulesEngine.applyPass(match.game,match.game.toPlay);if(!result.ok)return result;
  const draw=result.value.nextState.result?.reason==='two-passes';
  return {ok:true,value:{...match,game:result.value.nextState,undoRequest:null,winningEvent:null,message:draw?'双方连续停手，本轮无胜者。':`已停一手，轮到${result.value.nextState.toPlay==='B'?'黑方':'白方'}。`}};
}

export function requestUndo(match:CaptureMatch):CaptureFlowResult{
  if(!match.game.moves.length)return {ok:false,error:{code:'NO_MOVE_TO_UNDO'}};
  return {ok:true,value:{...match,undoRequest:{confirmations:[],requestedAtRevision:match.game.revision},message:'悔棋申请已提出：请黑方与白方在同一设备上依次确认。'}};
}

export function confirmUndo(match:CaptureMatch,color:Color):CaptureFlowResult{
  const request=match.undoRequest;if(!request)return {ok:false,error:{code:'UNDO_NOT_REQUESTED'}};
  const expected:Color=request.confirmations.length===0?'B':'W';
  if(color!==expected)return {ok:false,error:{code:'UNDO_CONFIRMATION_ORDER'}};
  if(color==='B')return {ok:true,value:{...match,undoRequest:{...request,confirmations:['B']},message:'黑方已确认；请白方确认或拒绝。'}};
  const undone=rulesEngine.undo(match.game);if(!undone.ok)return undone;
  return {ok:true,value:{...match,game:undone.value,undoRequest:null,winningEvent:null,message:'双方均已确认，已准确撤回一手；对局恢复可玩状态。'}};
}

export function refuseUndo(match:CaptureMatch):CaptureMatch{
  return {...match,undoRequest:null,message:'悔棋未获双方同意，原盘面与历史保持不变。'};
}

export function restartRound(match:CaptureMatch,swapColors:boolean):CaptureMatch{
  return {game:startGame(match.settings.size),settings:{...match.settings},started:true,seatAColor:swapColors?(match.seatAColor==='B'?'W':'B'):match.seatAColor,undoRequest:null,winningEvent:null,message:swapColors?'黑白已交换，新一局从空盘开始。':'已从空盘重开一局。'};
}

export const seatForColor=(match:CaptureMatch,color:Color):PartnerSeat=>match.seatAColor===color?'A':'B';

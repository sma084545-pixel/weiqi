import type {Color,Coord,GameState} from '../../core/content.generated';
import {rulesEngine} from '../../core/rules';
import {isAiDifficulty,type AiDifficulty} from '../../core/analysis/ai-contract';
import type {AiMoveResponse} from '../../core/analysis/ai-contract';
import {createFullGameMatch,validateCurrentSetup,restoreFullGame,playAt,passTurn,type FullGameMatch,type FullGameFlowResult} from '../full-game/model';

export const AI_GAME_ID='LOCAL-AI-FULL-GAME';
export interface AiOptions {humanColor:Color;difficulty:AiDifficulty}
export const DEFAULT_AI_OPTIONS:AiOptions={humanColor:'B',difficulty:'standard'};
export const validAiOptions=(v:unknown):v is AiOptions=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>k==='humanColor'||k==='difficulty')&&['B','W'].includes((v as AiOptions).humanColor)&&isAiDifficulty((v as AiOptions).difficulty);
export const validAiKomi=(n:number)=>Number.isFinite(n)&&Math.abs(n)<=100&&Number.isInteger(n*2);
export function startAiGame(match:FullGameMatch):FullGameFlowResult {
  if(match.game)return {ok:false,error:{code:'SETTINGS_LOCKED'}};
  const checked=validateCurrentSetup(match);if(!checked.ok)return checked;
  if(!validAiKomi(match.setup.komi))return {ok:false,error:{code:'INVALID_ARGUMENT',field:'/komi'}};
  const started=rulesEngine.startGame({...checked.value.position,id:'LOCAL-AI-SETUP'},{mode:'full-game',komi:match.setup.komi,gameId:AI_GAME_ID});
  return started.ok?{ok:true,value:{...match,game:started.value,scoring:{deadStones:[],confirmedBy:[]},message:'对局开始，难度、执色、贴目与起始方式已锁定。'}}:started;
}
export function humanMove(match:FullGameMatch,options:AiOptions,at:Coord|null):FullGameFlowResult{
  if(!match.game||match.game.toPlay!==options.humanColor)return {ok:false,error:{code:'NOT_YOUR_TURN'}};
  return at?playAt(match,at):passTurn(match);
}
export function applyAiMove(match:FullGameMatch,options:AiOptions,result:AiMoveResponse):FullGameFlowResult{
  const g=match.game;if(!g||g.phase!=='playing')return {ok:false,error:{code:'GAME_NOT_PLAYING'}};
  if(g.toPlay===options.humanColor||result.aiColor!==g.toPlay||result.difficulty!==options.difficulty)return {ok:false,error:{code:'NOT_YOUR_TURN'}};
  return result.move.type==='pass'?passTurn(match):playAt(match,result.move.at);
}
export function travelAiHistory(match:FullGameMatch,options:AiOptions,direction:'undo'|'redo',round=false):FullGameFlowResult{
  if(!match.game)return {ok:false,error:{code:'GAME_NOT_STARTED'}};
  let game:GameState=match.game,count=0;
  do{
    const next=direction==='undo'?rulesEngine.undo(game):rulesEngine.redo(game);
    if(!next.ok){if(!count)return next;break;}
    game=next.value;count++;
  }while(round&&count<2&&game.phase==='playing'&&game.toPlay!==options.humanColor);
  const restored=restoreFullGame(game);return restored.ok?{ok:true,value:{...restored.value,message:`已${direction==='undo'?'撤回':'重做'} ${count} 项操作；AI 暂停，棋局历史、轮次和提子数已恢复。`}}:restored;
}
export function emptyAiMatch(){return createFullGameMatch();}

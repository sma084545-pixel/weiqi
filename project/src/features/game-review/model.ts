import type {Color,GameState} from '../../core/content.generated';
import {rulesEngine} from '../../core/rules';
import {restoreFullGame,type FullGameMatch} from '../full-game/model';
import {AI_GAME_ID,validAiKomi} from '../ai-game/model';
import {GUIDED_GAME_ID} from '../guided-play/model';
import type {GuidedSession} from '../guided-play/types';

export type BranchMode='free'|'guided';
export interface ReviewBranch {id:string;mode:BranchMode;index:number;humanColor:Color;difficulty:'relaxed'|'standard'|'challenge'|'extreme';floor:number;createdAt:string;}
export interface ReviewRecord {
  schemaVersion:1;id:string;revision:number;rulesetId:'GO-CLUB-AREA-1';kind:'GameReview';
  title:string;game:GameState;humanColor:Color;cursor:number;branches:ReviewBranch[];
}
export function snapshotAt(game:GameState,index:number):GameState {
  if(!Number.isInteger(index)||index<0||index>game.moves.length)throw Error('请先选择有效的复盘步数。');
  if(index===game.moves.length)return game;
  const r=rulesEngine.restoreGame({...game,...game.undoStack[index],undoStack:game.undoStack.slice(0,index),redoStack:[]});
  if(!r.ok)throw Error('历史回退校验失败，原棋谱未改变。');return r.value;
}
/** Retain the real prefix, captures and positional-superko history; never invent setup moves. */
export function continueHistory(game:GameState,index:number,mode:BranchMode):{match:FullGameMatch;floor:number;note:string} {
  if(game.mode!=='full-game')throw Error('请在完整围棋对局中使用续下。');
  let current=snapshotAt(game,index),note='沿用此前真实着法与重复历史。';
  if(current.phase==='finished'){
    const last=current.moves.at(-1);
    if(last?.type!=='resign'&&last?.type!=='confirm-score')throw Error('该终局暂不支持继续，原棋谱保留。');
    const r=rulesEngine.undo(current);if(!r.ok)throw Error('无法撤除分支中的终局操作。');current=r.value;
    note='仅在新分支撤除认输或计分确认；原局结果保留，盘面、轮次、提子与劫历史不变。';
  }
  if(current.phase==='scoring'){
    const r=rulesEngine.resumePlay(current,current.toPlay);if(!r.ok)throw Error('无法从终局确认继续。');current=r.value;
    note+=' 新分支恢复对弈并清零连续停手，保留原盘与超级劫历史。';
  }
  if(mode==='free'&&!validAiKomi(current.komi))throw Error('此贴目超出现有 AI 服务支持范围；可选择辅助下棋的本地伙伴继续。');
  const checked=rulesEngine.restoreGame({...current,id:mode==='free'?AI_GAME_ID:GUIDED_GAME_ID,redoStack:[]});
  if(!checked.ok)throw Error('新分支未通过完整规则重放，原棋谱保持不变。');
  const restored=restoreFullGame(checked.value);if(!restored.ok)throw Error('分支设置校验失败。');
  return {match:restored.value,floor:checked.value.moves.length,note};
}
export function guidedBranch(record:ReviewRecord,branch:ReviewBranch,match:FullGameMatch):GuidedSession {
  return {schemaVersion:1,id:`GUIDED-${branch.id}`,revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'GuidedPlaySession',
    options:{size:record.game.size,humanColor:branch.humanColor,level:2,goal:'auto',opponent:'local'},match,hintUses:[],parentSessionId:null,
    historyBranch:{sourceId:record.id,index:branch.index,startEventCount:branch.floor}};
}
export const forkLabel=(index:number)=>`从第 ${index} 手继续`;

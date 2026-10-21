import type {Color,Coord,GameState} from '../../core/content.generated';
import {rulesEngine,type RuleError} from '../../core/rules';
import {commitSnapshot,copySnapshot,positionFromSnapshot,type SetupEditor} from './model';

export type PracticeMode='full-game'|'capture-first';
export interface RuleSettings {toPlay:Color;komi:number;practiceMode:PracticeMode;confirmedFreshStart:boolean}
export type SwitchError={code:'CONFIRM_FRESH_START'|'INVALID_KOMI'}|RuleError;
export type SwitchResult<T>={ok:true;value:T}|{ok:false;error:SwitchError};
export interface SetupSession {mode:'setup';editor:SetupEditor;message:string}
export interface RulesSession {mode:'rules';game:GameState;sourceEditor:SetupEditor;markers:SetupEditor['current']['markers'];message:string}
export type ExperimentSession=SetupSession|RulesSession;

export const setupSession=(editor:SetupEditor,message='摆棋示意可以保留不符合规则的棋形。'):SetupSession=>({mode:'setup',editor,message});
export function enterRules(editor:SetupEditor,settings:RuleSettings):SwitchResult<RulesSession>{
  if(!settings.confirmedFreshStart)return {ok:false,error:{code:'CONFIRM_FRESH_START'}};
  if(!Number.isFinite(settings.komi))return {ok:false,error:{code:'INVALID_KOMI'}};
  const current=copySnapshot(editor.current);current.toPlay=settings.toPlay;
  const position=positionFromSnapshot(current,'LOCAL-T06-RULE-START',editor.revision);
  const checked=rulesEngine.validateSetup(position);if(!checked.ok)return checked;
  const komi=settings.practiceMode==='capture-first'?0:settings.komi;
  const started=rulesEngine.startGame(position,{mode:settings.practiceMode,komi,gameId:'LOCAL-T06-RULE-SESSION'});if(!started.ok)return started;
  return {ok:true,value:{mode:'rules',game:started.value,sourceEditor:editor,markers:current.markers,message:'已从当前盘面建立全新的规则历史；此前局面历史未知。'}};
}
export function rulePlace(session:RulesSession,at:Coord):SwitchResult<RulesSession>{
  const result=rulesEngine.tryMove(session.game,{type:'place',color:session.game.toPlay,at});
  return result.ok?{ok:true,value:{...session,game:result.value.nextState,message:`已按规则提交一手；当前历史含 ${result.value.nextState.history.layouts.length} 个布局。`}}:result;
}
export function rulePass(session:RulesSession):SwitchResult<RulesSession>{
  const result=rulesEngine.applyPass(session.game,session.game.toPlay);
  return result.ok?{ok:true,value:{...session,game:result.value.nextState,message:result.value.nextState.phase==='scoring'?'双方连续停手，进入终局确认；本页不自动判断死子。':'已停一手；重复历史保持不变。'}}:result;
}
export function ruleUndo(session:RulesSession):SwitchResult<RulesSession>{const result=rulesEngine.undo(session.game);return result.ok?{ok:true,value:{...session,game:result.value,message:'已撤回一项规则操作；摆棋编辑历史未改变。'}}:result;}
export function ruleRedo(session:RulesSession):SwitchResult<RulesSession>{const result=rulesEngine.redo(session.game);return result.ok?{ok:true,value:{...session,game:result.value,message:'已重做一项规则操作；摆棋编辑历史未改变。'}}:result;}
export function ruleResume(session:RulesSession):SwitchResult<RulesSession>{const result=rulesEngine.resumePlay(session.game,session.game.toPlay);return result.ok?{ok:true,value:{...session,game:result.value,message:'已从终局确认恢复试下，连续停手数归零，重复历史保留。'}}:result;}
export function returnToSetup(session:RulesSession):SetupSession{
  const next=copySnapshot(session.sourceEditor.current);next.board=session.game.board.map(row=>[...row]);next.toPlay=session.game.toPlay;next.markers=session.markers.map(marker=>({...marker,at:{...marker.at}}));
  return {mode:'setup',editor:commitSnapshot(session.sourceEditor,next),message:'已把规则试下的当前盘面转为一次可撤回的摆棋编辑；旧落子序列不再声称对编辑后的局面有效。'};
}

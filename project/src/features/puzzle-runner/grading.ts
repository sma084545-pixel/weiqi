import type {Coord,GameState,Move,Puzzle,Response,TreeNode} from '../../core/content.generated';
import {applyPass,RULE_ERROR_ZH,startGame,tryMove,type RuleErrorCode} from '../../core/rules';

export type PuzzleVerdict='success'|'failure'|'illegal'|'unknown'|'discussion'|'invalid'|'continue';
export type GradeResult={verdict:PuzzleVerdict;message:string;detail?:string;state?:GameState;node?:TreeNode;reply?:Extract<Move,{type:'place'|'pass'}>;replyNode?:TreeNode};
const pointKey=(p:Coord)=>`${p.row},${p.col}`;
const moveKey=(move:Move|null)=>move?.type==='place'?`${move.color}:${pointKey(move.at)}`:move?`${move.color}:${move.type}`:'root';
const equalSets=(a:string[],b:string[])=>a.length===b.length&&a.every((value,index)=>value===b[index]);
const sorted=(values:string[])=>[...values].sort();

function transition(state:GameState,move:Extract<Move,{type:'place'|'pass'}>){
  return move.type==='place'?tryMove(state,move):applyPass(state,move.color);
}

export function initialPuzzleState(puzzle:Puzzle){
  return startGame(puzzle.initialPosition,{mode:'full-game',komi:0,gameId:`T10-${puzzle.id}-${puzzle.revision}`});
}

export function gradeStaticAnswer(puzzle:Pick<Puzzle,'answer'>,response:Response):GradeResult{
  const answer=puzzle.answer;
  if(answer.type==='open-text'){
    if(response.type!=='open-text'||!response.text.trim())return {verdict:'invalid',message:'请先写下你的选择和理由。'};
    if(response.text.length>20000)return {verdict:'invalid',message:'回答过长，请保留最重要的依据（最多 20,000 字）。'};
    return {verdict:'discussion',message:'这是一道开放讨论题，不自动判唯一答案。',detail:'请用题目给出的讨论标准和同伴互相核对。'};
  }
  if(answer.type==='number'){
    if(response.type!=='number'||!Number.isFinite(response.value)||!Number.isInteger(response.value)||response.value<0)return {verdict:'invalid',message:'请输入 0 或更大的整数。'};
    return response.value===answer.value?{verdict:'success',message:'回答符合已核查结果。',detail:answer.explanation}:{verdict:'failure',message:`你填写了 ${response.value}，与本题已核查结果不同。`,detail:'按四个正交方向重新数，并检查同一口气是否被重复计算。'};
  }
  if(answer.type==='point-set'){
    if(response.type!=='point-set')return {verdict:'invalid',message:'请在棋盘上选择空点。'};
    const chosen=sorted(response.points.map(pointKey));const expected=sorted(answer.points.map(pointKey));
    if(new Set(chosen).size!==chosen.length)return {verdict:'invalid',message:'同一个点不需要重复选择。'};
    if(equalSets(chosen,expected))return {verdict:'success',message:'所选点集合完整且没有多选。',detail:answer.explanation};
    const missing=expected.filter(key=>!chosen.includes(key)).length,extra=chosen.filter(key=>!expected.includes(key)).length;
    return {verdict:'failure',message:'这个点集合还没有符合本题标准。',detail:`仍有 ${missing} 个应选点未选，另有 ${extra} 个多选点；可查看提示后重试。`};
  }
  if(answer.type==='region-labels'){
    if(response.type!=='region-labels')return {verdict:'invalid',message:'请给空点标记归属。'};
    const chosen=sorted(response.labels.map(item=>`${pointKey(item.at)}:${item.owner}`));const expected=sorted(answer.labels.map(item=>`${pointKey(item.at)}:${item.owner}`));
    if(equalSets(chosen,expected))return {verdict:'success',message:'空点归属与教学假设一致。',detail:answer.explanation};
    const expectedPoints=new Set(answer.labels.map(item=>pointKey(item.at)));const chosenByPoint=new Map(response.labels.map(item=>[pointKey(item.at),item.owner]));
    const missing=[...expectedPoints].filter(key=>!chosenByPoint.has(key)).length;const different=answer.labels.filter(item=>chosenByPoint.has(pointKey(item.at))&&chosenByPoint.get(pointKey(item.at))!==item.owner).length;
    return {verdict:'failure',message:'区域标记还没有符合给定教学假设。',detail:`有 ${missing} 个应标空点未标，${different} 个已标点归属需要再检查。`};
  }
  if(answer.type==='reason-choice'){
    if(response.type!=='reason-choice'||!response.optionIds.length)return {verdict:'invalid',message:'请至少选择一项理由。'};
    const chosen=sorted(response.optionIds),expected=sorted(answer.acceptedOptionIds);
    return equalSets(chosen,expected)?{verdict:'success',message:'选择符合本题已核查理由。',detail:answer.explanation}:{verdict:'failure',message:'这组选项没有符合本题标准。',detail:'回到题干中的计分或棋形关系，逐项排除不符合规则的说法。'};
  }
  return {verdict:'invalid',message:'这道题需要在棋盘上落子。'};
}

export function findTreeNode(puzzle:Puzzle,nodeId:string){
  return puzzle.answer.type==='move-tree'?puzzle.answer.nodes.find(node=>node.nodeId===nodeId):undefined;
}

export function gradeTreeMove(puzzle:Puzzle,state:GameState,nodeId:string,at:Coord):GradeResult{
  if(puzzle.answer.type!=='move-tree')return {verdict:'invalid',message:'这道题不是落子变化题。'};
  const move={type:'place' as const,color:state.toPlay,at};
  const trial=tryMove(state,move);
  if(!trial.ok){const code=trial.error.code as RuleErrorCode;return {verdict:'illegal',message:RULE_ERROR_ZH[code]??`本手不合法：${code}。`,detail:'原局面和轮次保持不变。'};}
  const parent=findTreeNode(puzzle,nodeId);
  const child=parent?.children.map(id=>findTreeNode(puzzle,id)).find(candidate=>candidate&&moveKey(candidate.move)===moveKey(move));
  if(!child)return {verdict:'unknown',message:'这手合法，但当前答案树没有覆盖。',detail:'它不会记作错误；可以保留局面自由试下，或请同伴讨论。',state:trial.value.nextState};
  const replyNode=child.children.map(id=>findTreeNode(puzzle,id)).find((candidate):candidate is TreeNode=>Boolean(candidate?.move&&candidate.move.color===trial.value.nextState.toPlay&&candidate.move.type!=='resign'));
  return {
    verdict:child.outcome,
    message:child.outcome==='success'?'这条变化达到本题已核查标准。':child.outcome==='failure'?'这手已有核查过的反驳。':'这手在已核查变化中，请看对方回应。',
    detail:child.explanation,
    state:trial.value.nextState,node:child,
    reply:replyNode?.move as Extract<Move,{type:'place'|'pass'}>|undefined,replyNode,
  };
}

export function applyAuthoredReply(state:GameState,reply:Extract<Move,{type:'place'|'pass'}>):GradeResult{
  const result=transition(state,reply);
  return result.ok?{verdict:'continue',message:'已播放题目提供的合法回应。',state:result.value.nextState}:{verdict:'invalid',message:'题目提供的回应未通过规则重放，已停止播放。'};
}

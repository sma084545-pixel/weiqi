import type {Coord,GameState} from '../../core/content.generated';
import {getGroup,RULE_ERROR_ZH,startGame,tryMove,applyPass} from '../../core/rules';
import {gradeStaticAnswer} from '../puzzle-runner/grading';
import type {AuthoredLine,CourseScene,SceneFeedback,SceneResponse} from './types';
const key=(p:Coord)=>`${p.row},${p.col}`;
export const samePoint=(a:Coord,b:Coord)=>a.row===b.row&&a.col===b.col;
export function sceneState(scene:CourseScene){return startGame(scene.position,{mode:'full-game',komi:0,gameId:`SESSION-${scene.id}`});}
export function replayLine(scene:CourseScene,line:AuthoredLine){
 const root=sceneState(scene);if(!root.ok)throw new Error(`${scene.id}: invalid setup`);
 const states=[root.value],events=[];
 for(const move of line.moves){const result=move.type==='place'?tryMove(states.at(-1)!,move):applyPass(states.at(-1)!,move.color);if(!result.ok)throw new Error(`${scene.id}/${line.id}: ${result.error.code}`);states.push(result.value.nextState);events.push(result.value.event);}
 return {states,events};
}
export function replayResponse(scene:CourseScene,moves:Coord[]){
 const root=sceneState(scene);if(!root.ok)return root;let state=root.value;
 for(const at of moves){const r=tryMove(state,{type:'place',color:state.toPlay,at});if(!r.ok)return r;state=r.value.nextState;}
 return {ok:true as const,value:state};
}
export function judgeScene(scene:CourseScene,response:SceneResponse):SceneFeedback {
 const root=sceneState(scene);if(!root.ok)return {verdict:'incomplete',message:'本题局面未能通过验证。',detail:'返回学习路线选择其他课；原存档未改变。'};
 if(scene.interaction==='points'){
  if(response.kind!=='points')return {verdict:'incomplete',message:'请先在棋盘上圈出空点。',detail:'相同空点只需选一次。'};
  if(response.points.some(p=>!Number.isInteger(p.row)||!Number.isInteger(p.col)||p.row<0||p.col<0||p.row>=root.value.size||p.col>=root.value.size||root.value.board[p.row][p.col]!==null))return {verdict:'incomplete',message:'请只选择盘内空点。',detail:'棋子本身不是气。'};
  const expected=scene.expectedPoints??[];
  const grade=gradeStaticAnswer({answer:{type:'point-set',points:expected,explanation:scene.explanation}},{type:'point-set',points:response.points});
  const missing=expected.filter(p=>!response.points.some(q=>samePoint(p,q))),extra=response.points.filter(p=>!expected.some(q=>samePoint(p,q)));
  return {verdict:grade.verdict==='success'?'success':grade.verdict==='invalid'?'incomplete':'failure',message:grade.message,detail:grade.verdict==='success'?scene.explanation:`漏选 ${missing.length} 点，误选 ${extra.length} 点。${scene.explanation}`,missing,extra,highlight:[...missing,...extra]};
 }
 if(scene.interaction==='sequence'){
  if(response.kind!=='sequence'||!response.moves.length)return {verdict:'incomplete',message:'按当前执色先走第一手。',detail:'每手都由共同围棋规则检查。'};
  const state=replayResponse(scene,response.moves);if(!state.ok)return {verdict:'illegal',message:RULE_ERROR_ZH[state.error.code],detail:'非法操作不会换手或改变棋盘。'};
  const line=scene.lines.find(l=>response.moves.length<=l.moves.length&&response.moves.every((at,i)=>l.moves[i]?.type==='place'&&samePoint(at,(l.moves[i] as {at:Coord}).at)));
  if(!line)return {verdict:'unknown',message:'这条变化合法，当前内容没有核查它的优劣。',detail:'不会记作错误。可撤回、重试或保留局面与同伴讨论。'};
  if(response.moves.length<line.moves.length)return {verdict:'incomplete',message:`已完成 ${response.moves.length} / ${line.moves.length} 手。`,detail:line.notes[response.moves.length-1]??'继续检查对方的气和回应。'};
  return {verdict:line.verdict,message:line.verdict==='success'?'这条变化达成本题的局部目标。':line.verdict==='suboptimal'?'可以成立，但还可以比较另一种办法。':'这条已核查变化未达到题目目标。',detail:line.outcome};
 }
 let chosen;
 if(response.kind==='choice')chosen=scene.choices.find(x=>x.id===response.id);
 if(response.kind==='point'){
  const trial=tryMove(root.value,{type:'place',color:root.value.toPlay,at:response.at});
  if(!trial.ok)return {verdict:'illegal',message:RULE_ERROR_ZH[trial.error.code],detail:'棋盘、轮次和历史保持不变。'};
  chosen=scene.choices.find(x=>x.at&&samePoint(x.at,response.at));
 }
 if(response.kind==='group'){
  const group=getGroup(root.value.board,response.at);
  if(!group.ok||!group.value)return {verdict:'incomplete',message:'这里是空点，请选一颗目标棋子。',detail:'点击棋块中任意一颗即可选整块。'};
  chosen=scene.choices.find(x=>x.at&&group.value!.stones.some(p=>samePoint(p,x.at!)));
 }
 if(!chosen)return {verdict:'unknown',message:'这个选择未收录为已核查答案。',detail:'不把它直接判错；请比较目标和局面条件，或与同伴讨论。'};
 return {verdict:chosen.verdict,message:chosen.verdict==='success'?'符合本题目标的选择。':chosen.verdict==='suboptimal'?'这手可行，但还有更符合目标的选择。':'在本题明确条件下，这个选择有问题。',detail:chosen.explanation,highlight:chosen.highlight};
}
export function responseBoard(scene:CourseScene,response:SceneResponse|null):GameState|null {
 if(!response)return null;
 if(response.kind==='sequence'){const r=replayResponse(scene,response.moves);return r.ok?r.value:null;}
 if(response.kind==='point'){const r=sceneState(scene);if(!r.ok)return null;const t=tryMove(r.value,{type:'place',color:r.value.toPlay,at:response.at});return t.ok?t.value.nextState:null;}
 return null;
}

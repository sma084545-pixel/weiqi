/** Pure T09 reference adapter. Uses schemaVersion 1 Response and T01 rules. */
import { startGame, tryMove, applyPass } from '../../dist-engine/go-club-rules.mjs';
const key=p=>`${p.row},${p.col}`;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const moveKey=m=>m.type==='place'?`${m.color}:${key(m.at)}`:`${m.color}:${m.type}`;
const transition=(s,m)=>m?.type==='pass'?applyPass(s,m.color):tryMove(s,m);
export function gradePuzzle(puzzle,response,playedMoves=[]){
 const out=(verdict,explanation)=>({verdict,explanation});
 if(!puzzle||puzzle.kind!=='Puzzle'||puzzle.developmentOnly||!['structure','moveLegality','solutionChecked'].every(k=>puzzle.validation?.[k]?.status==='passed'))return out('unknown','这份题目未通过发布检查，请先核查。');
 const a=puzzle.answer,n=puzzle.initialPosition.size;
 if(!response||typeof response!=='object')return out('invalid','回答格式无效。');
 if(a.type==='open-text')return response.type==='open-text'&&typeof response.text==='string'&&response.text.length<=20000?out('discussion','按依据、对方回应与倾听量规交流；不判唯一最佳手。'):out('invalid','请输入讨论文本。');
 const pts=ps=>Array.isArray(ps)&&ps.every(p=>p&&Number.isInteger(p.row)&&Number.isInteger(p.col)&&p.row>=0&&p.col>=0&&p.row<n&&p.col<n)&&new Set(ps.map(key)).size===ps.length;
 const finish=v=>out(v?'success':'failure',v?'符合本题已核查的成功标准。':'本次回答未达到本题的明确标准；可查看提示后重试。');
 if(a.type==='number')return response.type==='number'&&typeof response.value==='number'&&Number.isFinite(response.value)?finish(response.value===a.value):out('invalid','请输入有限数值。');
 if(a.type==='point-set')return response.type==='point-set'&&pts(response.points)?finish(same(response.points.map(key).sort(),a.points.map(key).sort())):out('invalid','点集合存在重复或无效坐标。');
 if(a.type==='region-labels')return response.type==='region-labels'&&Array.isArray(response.labels)&&pts(response.labels.map(x=>x?.at))&&response.labels.every(x=>['B','W','neutral','unknown'].includes(x.owner))?finish(same(response.labels.map(x=>`${key(x.at)}:${x.owner}`).sort(),a.labels.map(x=>`${key(x.at)}:${x.owner}`).sort())):out('invalid','区域标记格式无效。');
 if(a.type==='reason-choice')return response.type==='reason-choice'&&Array.isArray(response.optionIds)&&new Set(response.optionIds).size===response.optionIds.length&&response.optionIds.every(x=>a.options.some(o=>o.optionId===x))?finish(same([...response.optionIds].sort(),[...a.acceptedOptionIds].sort())):out('invalid','选项编号无效或重复。');
 if(a.type==='move-tree'){
  if(response.type!=='move'||!Array.isArray(playedMoves))return out('invalid','请提供着法回答与已走着法。');
  const r=startGame(puzzle.initialPosition,{mode:'full-game',komi:0,gameId:'GRADE-'+puzzle.id});if(!r.ok)return out('invalid','题目起点不能用于规则重放。');
  let state=r.value;const nodes=new Map(a.nodes.map(x=>[x.nodeId,x]));let node=nodes.get(a.rootNodeId);
  for(const m of [...playedMoves,response.move]){
   if(!m||!['place','pass'].includes(m.type)||!['B','W'].includes(m.color)||(m.type==='place'&&!pts([m.at])))return out('invalid','着法格式不符或坐标越界。');
   const next=transition(state,m);if(!next.ok)return out('invalid',`本手不合法：${next.error.code}。原回答历史保持不变。`);state=next.value.nextState;
   node=node?node.children.map(id=>nodes.get(id)).find(x=>moveKey(x.move)===moveKey(m)):undefined;
  }
  return node?out(node.outcome,node.explanation):out('unknown','这手合法，但当前着法树未覆盖。请试下或与同伴讨论，不自动判错。');
 }
 return out('unknown','此答案类型尚未接入。');
}

import type {Color,Coord,GameEvent,GameSnapshot,GameState} from '../../core/content.generated';
import {displayCoord} from '../../core/coordinates';
import {rulesEngine,type BoardMatrix,type GroupStatus} from '../../core/rules';
import type {MoveObservation,PositionAnalyzer,TeachingAnalysis,TeachingCandidate,TeachingConcept} from './types';

export const pointKey=(p:Coord)=>`${p.row},${p.col}`;
export const samePoint=(a:Coord,b:Coord)=>a.row===b.row&&a.col===b.col;
export const otherColor=(c:Color):Color=>c==='B'?'W':'B';
/** Exact, compact action-path identity; undo + a new branch can never share stale hints. */
export function teachingPath(game:Pick<GameState,'moves'>):string {
  return game.moves.map(m=>m.type==='place'?`${m.color}${m.at.row},${m.at.col}`:m.type==='pass'?`p${m.color}`:m.type==='resign'?`x${m.color}`:m.type==='resume'?`r${m.requestedBy}`:'s').join(';');
}
export function boardGroups(board:BoardMatrix):GroupStatus[]{
  const seen=new Set<string>(),groups:GroupStatus[]=[];
  for(let row=0;row<board.length;row++)for(let col=0;col<board.length;col++){
    const at={row,col};if(!board[row][col]||seen.has(pointKey(at)))continue;
    const g=rulesEngine.getGroup(board,at),l=rulesEngine.getLiberties(board,at);
    if(!g.ok||!g.value||!l.ok)continue;
    g.value.stones.forEach(p=>seen.add(pointKey(p)));groups.push({...g.value,liberties:l.value,isAtari:l.value.length===1});
  }
  return groups;
}
const neighbors=(p:Coord,size:number)=>[{row:p.row-1,col:p.col},{row:p.row+1,col:p.col},{row:p.row,col:p.col-1},{row:p.row,col:p.col+1}].filter(q=>q.row>=0&&q.col>=0&&q.row<size&&q.col<size);
const adjacentGroups=(groups:GroupStatus[],at:Coord,size:number,color:Color)=>groups.filter(g=>g.color===color&&g.stones.some(p=>neighbors(at,size).some(q=>samePoint(p,q))));
const zone=(p:Coord,size:number)=>`${p.row<size/3?'上':p.row>size*2/3?'下':''}${p.col<size/3?'左':p.col>size*2/3?'右':''}`||'中央';
const loc=(g:GroupStatus,size:number)=>`${zone(g.stones[0],size)}${g.color==='B'?'黑':'白'}棋`;

/** Factual before/after observations, not move-value or global life/death judgements. */
export function observeMove(before:GameSnapshot|GameState,after:GameSnapshot|GameState,event:GameEvent,focus:readonly TeachingConcept[]):MoveObservation|null {
  if(event.type!=='place')return null;
  const actor=event.color,beforeGroups=boardGroups(before.board),afterGroups=boardGroups(after.board);
  const own=afterGroups.find(g=>g.color===actor&&g.stones.some(p=>samePoint(p,event.at)));
  if(!own)return null;
  const captured=after.captures[actor]-before.captures[actor];
  const connections=Math.max(0,adjacentGroups(beforeGroups,event.at,before.size,actor).length-1);
  const escapes=beforeGroups.filter(g=>g.color===actor&&g.isAtari&&g.stones.some(p=>own.stones.some(q=>samePoint(p,q)))&&own.liberties.length>1).length;
  const newAtari=afterGroups.filter(g=>g.color!==actor&&g.isAtari&&!beforeGroups.some(old=>old.color===g.color&&old.isAtari&&old.stones.some(p=>g.stones.some(q=>samePoint(p,q)))));
  const selfAtari=own.isAtari;
  const base={index:after.moves.length,actor,captured,connections,escapes,atariTargets:newAtari.length,selfAtari};
  if(selfAtari&&captured===0)return {...base,kind:'danger',concept:'liberties',title:'这里有一个需要检查的危险',text:`这手之后，落子所在的 ${own.stones.length} 颗棋只剩一口气。对手可能马上攻击；这不等于已经判死。`,question:'能不能先增加气，或连接旁边的棋？',points:own.stones};
  if(escapes)return {...base,kind:'good',concept:'escape',title:'你让被打吃的棋多了气',text:`原来的一气棋与这手连成一块，现在有 ${own.liberties.length} 口气。暂时解除了这次打吃，接下来仍要看对方回应。`,question:'增加的气在哪里？',points:own.stones};
  if(captured)return {...base,kind:'good',concept:'capture',title:`这手实际提走了 ${captured} 颗棋`,text:`对方相邻棋块最后的气被占，棋子才被移走。${selfAtari?'提子后自己的棋仍只剩一口气，留意回击。':'再看看留下的空点给了谁更多气。'}`,question:'为什么这些棋能提走，而其他棋还留在盘上？',points:[event.at]};
  if(connections)return {...base,kind:'good',concept:'connection',title:'两边的棋现在直接连在一起了',text:`这一步合并了 ${connections+1} 块同色棋，共用 ${own.liberties.length} 口去重后的气；这是连接事实，不代表整盘最佳选择。`,question:'有没有哪口气原来被两边同时用到？',points:own.stones};
  if(newAtari.length)return {...base,kind:'good',concept:'atari',title:'对方有棋只剩一口气了',text:`这一步使 ${newAtari.length} 块对方棋成为一气棋。打吃不一定必须追吃，也要检查自己的安全。`,question:'对方如果逃跑，你自己的棋还安全吗？',points:newAtari.flatMap(g=>g.stones)};
  const threatened=afterGroups.find(g=>g.color===actor&&g.isAtari);
  if(threatened)return {...base,kind:'consider',concept:'liberties',title:'可以这样下，不过别忘了旁边的棋',text:`${loc(threatened,before.size)}仍只剩一口气。你可以决定救它，也可以有意弃子；程序不会把所有不救棋都判为错误。`,question:'继续进攻前，先看看那块棋有没有出路？',points:threatened.stones};
  return {...base,kind:'ordinary',concept:focus.includes('opening')?'opening':'liberties',title:'落子完成',text:'这手合法。先观察对手的回应，不需要每一步都评好坏。',question:'对手接下来最可能关心哪一块棋？',points:[]};
}

interface RankedCandidate extends TeachingCandidate {priority:number;safe:boolean}
/** Bounded candidate trials all use the single rules engine, including its full superko path. */
export function rankedTeachingMoves(game:GameState,focus:readonly TeachingConcept[]):RankedCandidate[]{
  if(game.phase!=='playing')return [];
  const groups=boardGroups(game.board),own=groups.filter(g=>g.color===game.toPlay),enemy=groups.filter(g=>g.color!==game.toPlay);
  const raw:Coord[]=[],add=(p:Coord)=>{if(p.row>=0&&p.col>=0&&p.row<game.size&&p.col<game.size&&game.board[p.row][p.col]===null&&!raw.some(q=>samePoint(p,q)))raw.push(p);};
  own.filter(g=>g.isAtari).forEach(g=>g.liberties.forEach(add));enemy.filter(g=>g.isAtari).forEach(g=>g.liberties.forEach(add));
  own.filter(g=>g.liberties.length===2).forEach(g=>g.liberties.forEach(add));
  const connectionPoints=new Map<string,{at:Coord;count:number}>();
  for(const g of own)for(const at of g.liberties){const old=connectionPoints.get(pointKey(at));connectionPoints.set(pointKey(at),{at,count:(old?.count??0)+1});}
  for(const {at,count} of connectionPoints.values())if(count>1)add(at);
  const d=game.size===9?2:3,far=game.size-1-d,mid=Math.floor(game.size/2);
  for(const [row,col] of [[d,d],[far,far],[d,far],[far,d],[d,mid],[far,mid],[mid,d],[mid,far],[mid,mid]])add({row,col});
  for(const g of own)for(const at of g.liberties)add(at);
  // Fill the bounded set by distance from existing friendly stones, rather than always top-left.
  const empty:Coord[]=[];for(let row=0;row<game.size;row++)for(let col=0;col<game.size;col++)if(game.board[row][col]===null)empty.push({row,col});
  const nearest=(p:Coord)=>own.length?Math.min(...own.flatMap(g=>g.stones).map(q=>Math.abs(p.row-q.row)+Math.abs(p.col-q.col))):3;
  empty.sort((a,b)=>Math.abs(nearest(a)-2)-Math.abs(nearest(b)-2)||a.row-b.row||a.col-b.col);
  empty.forEach(add);
  const results:RankedCandidate[]=[];
  for(const at of raw.slice(0,48)){
    const r=rulesEngine.tryMove(game,{type:'place',color:game.toPlay,at});if(!r.ok)continue;
    const ownAfter=r.value.event.groupsAfter?.find(g=>g.color===game.toPlay&&g.stones.some(p=>samePoint(p,at)));
    const liberties=ownAfter?.liberties??r.value.event.libertiesAfter;
    const joined=adjacentGroups(groups,at,game.size,game.toPlay);
    const rescue=joined.filter(g=>g.isAtari).length>0&&liberties.length>1;
    const captured=r.value.event.captured.length;
    const connect=joined.length>1;
    const edge=Math.min(at.row,at.col,game.size-1-at.row,game.size-1-at.col);
    // None of these priorities are exposed as a score, rank or proof of best play.
    const priority=(rescue?120:0)+(captured?100+Math.min(20,captured):0)+(connect?focus.includes('connection')?55:35:0)+(liberties.length>1?20:-150)-Math.abs(edge-d)*2-Math.abs(nearest(at)-2)+(focus.includes('opening')&&game.moves.length<12&&edge===d?12:0);
    const concept:TeachingConcept=rescue?'escape':captured?'capture':connect?'connection':focus.includes('opening')||game.moves.length<8?'opening':'liberties';
    const reason=rescue?`这一步能让原来的一气棋增加到 ${liberties.length} 口气。`:captured?`按当前规则与历史，这一步能提走 ${captured} 颗棋；也要看提子后自己的气。`:connect?`这一步把 ${joined.length} 块棋直接连在一起，共用气。`:concept==='opening'?'这里借角边发展，先与已有棋保持距离；它只是一个可比较的方向。':'这里落子后还有多口气；比较它能否照顾附近的棋。';
    results.push({at,priority,safe:liberties.length>1,reason,concept});
  }
  return results.sort((a,b)=>b.priority-a.priority||a.at.row-b.at.row||a.at.col-b.at.col);
}

export function analyzeTeachingPosition(game:GameState,focus:readonly TeachingConcept[]):TeachingAnalysis {
  const path=teachingPath(game),groups=boardGroups(game.board),urgent=groups.filter(g=>g.color===game.toPlay&&g.isAtari);
  const ranked=rankedTeachingMoves(game,focus),useful=ranked.filter(c=>c.safe||c.concept==='capture'),candidates=(useful.length?useful:ranked).slice(0,3).map(({at,reason,concept})=>({at,reason,concept}));
  const recommended=candidates[0]??null,center=recommended?.at;
  const region:Coord[]=[];if(center)for(let row=Math.max(0,center.row-1);row<=Math.min(game.size-1,center.row+1);row++)for(let col=Math.max(0,center.col-1);col<=Math.min(game.size-1,center.col+1);col++)region.push({row,col});
  const eyeFocus=focus.includes('eyes');
  const question=urgent.length?`${loc(urgent[0],game.size)}只剩一口气。你想怎样处理？`:eyeFocus?'这些空点是连成一片，还是被保护的独立眼？先检查外面的气。':game.moves.length<6?'先看看角与边：在哪里发展，能让自己的棋不挤在一起？':'这两块同色棋直接连在一起了吗？先检查气，再考虑往哪里发展。';
  const hint1=urgent.length?`先找出${loc(urgent[0],game.size)}仅剩的气，再比较增加气、连接或反击。`:eyeFocus?'两个空点不等于两个独立真眼。先数目标棋块的气；这里不会自动判活或判死。':focus.includes('opening')||game.moves.length<6?'先比较角、边与中央的空间，并检查有没有需要先照顾的一气棋。':'先数附近棋块的气，再看看能不能让两块棋互相照应。';
  return {source:'local-rules',positionKey:path,question,hint1,region,candidates,recommended,urgentGroups:urgent,concept:recommended?.concept??'liberties',boundary:'提示依据已核实的气、提子和连接；候选不是全盘最佳手证明，也不自动判死活。'};
}

/** Async seam keeps cancellation uniform with a future remote teaching provider. No remote analysis is requested. */
export const localPositionAnalyzer:PositionAnalyzer={async analyzePosition(game,focus,signal){
  if(signal.aborted)throw new DOMException('Aborted','AbortError');
  const result=analyzeTeachingPosition(game,focus);
  if(signal.aborted)throw new DOMException('Aborted','AbortError');return result;
}};
export const candidateCoordinate=(candidate:TeachingCandidate,game:GameState)=>displayCoord(candidate.at,game.size);

import type {Color,GameState} from '../../core/content.generated';
import {rulesEngine} from '../../core/rules';
import {makeReviewRequest,type ReviewAnalysisResponse} from '../../core/analysis/contract';
import {observeMove,boardGroups} from '../guided-play/analyzer';
import {requestReviewAnalysis} from '../katago-review/client';
import {snapshotAt} from './model';

export interface ReviewMoment {index:number;beforeIndex:number;actor:Color;kind:'positive'|'risk'|'question';title:string;text:string;refutation?:{at:{row:number;col:number};captured:number};}
export interface TacticalReport {source:'local-rules';checkedPlacements:number;moments:ReviewMoment[];positives:number;risks:number;summary:string;next:string;}
export interface EngineSample {index:number;result:ReviewAnalysisResponse}
export interface ReviewAnalyzer {analyze(game:GameState,index:number,signal:AbortSignal):Promise<ReviewAnalysisResponse>}
export const kataGoReviewAnalyzer=(origin:string):ReviewAnalyzer=>({analyze(game,index,signal){const frame=index===game.moves.length?game:game.undoStack[index];return requestReviewAnalysis(origin,makeReviewRequest(game,index,`whole-review-${crypto.randomUUID()}`),frame.toPlay,signal);}});
export async function inspectTactics(game:GameState,humanColor:Color,signal:AbortSignal):Promise<TacticalReport> {
  const moments:ReviewMoment[]=[];let checkedPlacements=0,positives=0,risks=0;
  for(let i=0;i<game.moves.length;i++){
    if(signal.aborted)throw new DOMException('Aborted','AbortError');
    if(i%8===0)await new Promise<void>(resolve=>setTimeout(resolve,0));
    const event=game.moves[i];if(event.type!=='place')continue;checkedPlacements++;
    if(event.color!==humanColor)continue;
    const before=game.undoStack[i],after=i+1===game.moves.length?game:game.undoStack[i+1];
    const observation=observeMove(before,after,event,['liberties','atari','connection']);if(!observation||observation.kind==='ordinary')continue;
    const moment:ReviewMoment={index:i+1,beforeIndex:i,actor:event.color,kind:observation.kind==='good'?'positive':observation.kind==='danger'?'risk':'question',title:observation.title,text:observation.text};
    if(observation.kind==='danger'){
      const target=boardGroups(after.board).find(g=>g.color===event.color&&g.stones.some(p=>p.row===event.at.row&&p.col===event.at.col));
      // Only call a local risk immediately capturable after checking a legal opponent reply.
      if(target?.liberties.length===1){
        const state=snapshotAt(game,i+1);
        const at=target.liberties[0],r=rulesEngine.tryMove(state,{type:'place',color:state.toPlay,at});
        if(r.ok&&target.stones.every(p=>r.value.event.captured.some(q=>q.row===p.row&&q.col===p.col))){moment.refutation={at,captured:target.stones.length};moment.title='这块棋可被下一手合法提走';moment.text=`你这手后，落子所在的 ${target.stones.length} 颗棋只剩一口气。已按本局劫历史验证：对手占住最后一口气可以提走它们。若是有意弃子，还需比较后续收益。`;}
        else {moment.kind='question';moment.title='一气棋，先核对能否被提';moment.text+=' 立即提取未获合法性证据，不能只凭一口气判定这手错误。';}
      }
    }
    if(moment.kind==='positive')positives++;if(moment.kind==='risk')risks++;moments.push(moment);
  }
  const selected=[...moments.filter(m=>m.kind==='risk').slice(0,3),...moments.filter(m=>m.kind==='positive').slice(0,3),...moments.filter(m=>m.kind==='question').slice(0,2)].sort((a,b)=>a.index-b.index);
  return {source:'local-rules',checkedPlacements,moments:selected,positives,risks,
    summary:checkedPlacements===0?'本局没有棋盘落子；没有足够局面评价下法。':`已核查全盘 ${checkedPlacements} 次棋盘落子；你的棋中记录到 ${positives} 次提子、连接、增气或打吃变化，${risks} 处需要留意的一气危险。它们是局部事实，不是整盘棋力评分。`,
    next:risks?'下一盘先练一件事：落子前数自己的气，再想对方能不能占最后一口气。':'下一盘比较两个候选：它们分别照顾了哪块棋？提子和连接有用，但不必每手都追吃。'};
}
/** Up to two actual moves, at most four unique requests; never an unbounded whole-game search. */
export function samplePlan(game:GameState,report:TacticalReport):number[]{
  const chosen=[report.moments.find(m=>m.kind==='risk'),report.moments.find(m=>m.kind==='positive')].filter((m):m is ReviewMoment=>!!m);
  if(!chosen.length){const index=game.moves.findIndex(m=>m.type==='place');if(index>=0)return [index,index+1];return [];}
  return [...new Set(chosen.flatMap(m=>[m.beforeIndex,m.index]))].slice(0,4);
}
export function sampleComment(moment:ReviewMoment,samples:EngineSample[]):string|null {
  const before=samples.find(s=>s.index===moment.beforeIndex)?.result,after=samples.find(s=>s.index===moment.index)?.result;
  if(!before||!after||before.engine.model!==after.engine.model)return null;
  const change=(after.blackScoreLead-before.blackScoreLead)*(moment.actor==='B'?1:-1);
  return change< -3?`真实引擎的前后局面估计相差约 ${Math.abs(change).toFixed(1)} 目，对你不利，值得重新比较。少量搜索不能证明一定是失误，先检查局部危险。`:change>3?'真实引擎的前后估计朝有利方向变化；同时看看这一步实际做到了什么。估计会随搜索量变化。':'真实引擎在这两个局面的估计接近。可以把注意力放在气、连接和对手回应上。';
}

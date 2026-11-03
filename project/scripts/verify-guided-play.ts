/** Bounded local smoke/performance evidence; this is not a playing-strength benchmark. */
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {rulesEngine} from '../src/core/rules';
import {analyzeTeachingPosition,boardGroups} from '../src/features/guided-play/analyzer';
import {localTeachingReply} from '../src/features/guided-play/opponent';
import {startGuidedSession} from '../src/features/guided-play/model';
import {DEFAULT_GUIDED_OPTIONS,FOCUS} from '../src/features/guided-play/types';
const measurements=[];
for(const size of [9,13] as const){
  let game=startGuidedSession({...DEFAULT_GUIDED_OPTIONS,size},`GUIDED-capacity-${size}`).match.game!;
  const times:number[]=[];
  for(let turn=0;turn<60&&game.phase==='playing';turn++){
    const before=JSON.stringify(game),start=performance.now(),analysis=analyzeTeachingPosition(game,FOCUS.auto);times.push(performance.now()-start);
    assert.equal(JSON.stringify(game),before);
    for(const c of analysis.candidates)assert.ok(rulesEngine.tryMove(game,{type:'place',color:game.toPlay,at:c.at}).ok);
    const reply=localTeachingReply(game,{...DEFAULT_GUIDED_OPTIONS,size,humanColor:game.toPlay==='B'?'W':'B'});
    const next=reply.at?rulesEngine.tryMove(game,{type:'place',color:game.toPlay,at:reply.at}):rulesEngine.applyPass(game,game.toPlay);
    assert.ok(next.ok);if(!next.ok)throw Error();game=next.value.nextState;
    assert.ok(boardGroups(game.board).every(g=>g.liberties.length>0));
  }
  times.sort((a,b)=>a-b);measurements.push({size,moves:game.moves.length,samples:times.length,medianMs:Number(times[Math.floor(times.length/2)].toFixed(2)),p95Ms:Number(times[Math.floor(times.length*.95)].toFixed(2)),maxMs:Number(times.at(-1)!.toFixed(2)),inputUnchanged:true,legality:'shared engine, actual effective path; no injected layouts'});
}
const report={schemaVersion:1,id:'GUIDED-LOCAL-CAPACITY',revision:1,rulesetId:'GO-CLUB-AREA-1',status:'passed',measuredAt:new Date().toISOString(),runtime:process.version,platform:`${process.platform}/${process.arch}`,measurements,limits:'Native local CPU measurements; no claim about low-end phones, best-move accuracy or human playing rank.',humanReviewed:null};
writeFileSync('docs/guided-play/checks/local-capacity.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

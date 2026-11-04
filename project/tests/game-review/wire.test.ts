import {it,expect} from 'vitest';
import {rulesEngine} from '../../src/core/rules';
import {makeReviewRequest,analysisRequestBody} from '../../src/core/analysis/contract';
import {makeAiMoveRequest} from '../../src/core/analysis/ai-contract';
import {prepareAnalysis} from '../../server/analysis/position';
import fixture from '../../docs/game-review/fixtures/development-40.json';
const forty=()=>{const r=rulesEngine.restoreGame(fixture.game);if(!r.ok)throw Error('fixture');const e=rulesEngine.resign(r.value,r.value.toPlay);if(!e.ok)throw Error('fixture end');return e.value.nextState;};
const v=<T,>(r:{ok:true;value:T}|{ok:false;error:unknown})=>{if(!r.ok)throw Error(JSON.stringify(r));return r.value;};
it('wire sends only real actions, keeps setup and every historical action; existing server accepts it',()=>{
 const game=forty(),text=JSON.stringify(game),request=makeReviewRequest(game,40,'wire-unit'),body=JSON.parse(analysisRequestBody(request));
 expect(body.game.events).toHaveLength(46);expect(Object.keys(body.game.events[0]).sort()).toEqual(['at','color','type']);expect(body.game.events.at(-1)).toEqual({type:'resign',color:'W'});
 const prepared=prepareAnalysis(body);expect(prepared.state.moves).toHaveLength(40);expect(prepared.state.toPlay).toBe('B');expect(prepared.state.captures).toEqual({B:0,W:0});expect(prepared.query.boardXSize).toBe(13);expect(JSON.stringify(game)).toBe(text);expect(analysisRequestBody(request).length).toBeLessThan(5000);
});
it('long repeated passes keep positional history, compact body stays below existing limit, and scoring/resume survives',()=>{
 let g=forty();g=v(rulesEngine.undo(g));
 // Complete real accepted pass/resume cycles, no fabricated layout or move order.
 for(let i=0;i<80;i++){g=v(rulesEngine.applyPass(g,g.toPlay)).nextState;g=v(rulesEngine.applyPass(g,g.toPlay)).nextState;g=v(rulesEngine.resumePlay(g,g.toPlay));}
 const request=makeAiMoveRequest(g,'B','standard','wire-long'),body=JSON.parse(analysisRequestBody(request));
 expect(body.game.events).toHaveLength(285);expect(new TextEncoder().encode(analysisRequestBody(request)).length).toBeLessThan(256000);
 const prepared=prepareAnalysis({schemaVersion:1,positionId:body.positionId,game:body.game,reviewIndex:body.game.events.length},24,'ai-move');expect(prepared.state.history).toEqual(g.history);expect(prepared.state.toPlay).toBe('W');expect(prepared.state.consecutivePasses).toBe(0);
 const ended=v(rulesEngine.resign(g,g.toPlay)).nextState;const checked=prepareAnalysis(JSON.parse(analysisRequestBody(makeReviewRequest(ended,200,'wire-long-review'))));expect(checked.state.moves).toHaveLength(200);
});

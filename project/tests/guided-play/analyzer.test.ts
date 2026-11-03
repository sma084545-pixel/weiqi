import {describe,it,expect} from 'vitest';
import vectors from './fixtures/observations.json';
import type {Color,Coord,GameState,Position} from '../../src/core/content.generated';
import {rulesEngine} from '../../src/core/rules';
import {analyzeTeachingPosition,boardGroups,observeMove,rankedTeachingMoves,teachingPath} from '../../src/features/guided-play/analyzer';
import {teachingOverlay} from '../../src/features/guided-play/TeachingOverlay';
import {FOCUS,DEFAULT_GUIDED_OPTIONS} from '../../src/features/guided-play/types';
import {localTeachingReply} from '../../src/features/guided-play/opponent';
const value=<T,>(r:{ok:true;value:T}|{ok:false;error:unknown}):T=>{if(!r.ok)throw Error(JSON.stringify(r));return r.value;};
const coord=([row,col]:number[]):Coord=>({row,col});
function setup(stones:(string|number)[][]=[],toPlay:Color='B',size:9|13=9):GameState {
  const position:Position={schemaVersion:1,id:'DEV-GUIDED-TEST-POSITION',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size,stones:stones.map(([color,row,col])=>({color:color as Color,row:Number(row),col:Number(col)})),toPlay,historyPolicy:'fresh-setup',history:null};
  return value(rulesEngine.startGame(position,{mode:'full-game',komi:0,gameId:'DEV-GUIDED-TEST-GAME'}));
}
const sorted=(ps:Coord[])=>ps.map(p=>`${p.row},${p.col}`).sort();
describe('independently specified local teaching facts',()=>{
  it.each(vectors.cases)('$id matches the written orthogonal facts without changing the input',f=>{
    const before=setup(f.stones),text=JSON.stringify(before),trial=value(rulesEngine.tryMove(before,{type:'place',color:'B',at:coord(f.at)}));
    const result=observeMove(before,trial.nextState,trial.nextState.moves.at(-1)!,FOCUS.auto)!;
    expect(result.kind).toBe(f.kind);expect(result.concept).toBe(f.concept);
    for(const key of ['captured','connections','escapes','atariTargets','selfAtari'] as const)if(key in f)expect(result[key]).toBe(f[key as keyof typeof f]);
    if('liberties' in f)expect(sorted(value(rulesEngine.getLiberties(trial.nextState.board,coord(f.at))))).toEqual(sorted(f.liberties!.map(coord)));
    expect(JSON.stringify(before)).toBe(text);
  });
  it('diagonal neighbours never become a reported direct connection; shared liberties are unique',()=>{
    const g=setup([['B',1,1],['B',2,2]]);expect(boardGroups(g.board)).toHaveLength(2);
    const t=value(rulesEngine.tryMove(g,{type:'place',color:'B',at:{row:1,col:2}}));
    expect(observeMove(g,t.nextState,t.nextState.moves.at(-1)!,FOCUS.connection)).toMatchObject({connections:1});
    expect(new Set(t.event.libertiesAfter.map(p=>`${p.row},${p.col}`)).size).toBe(t.event.libertiesAfter.length);
  });
  it('capture-first legality is preserved; true suicide is not a teaching candidate',()=>{
    const suicide=setup([['W',0,1],['W',1,0]]),at={row:0,col:0};
    expect(rulesEngine.tryMove(suicide,{type:'place',color:'B',at})).toMatchObject({ok:false,error:{code:'SUICIDE'}});
    expect(rankedTeachingMoves(suicide,FOCUS.auto).some(c=>c.at.row===0&&c.at.col===0)).toBe(false);
    const capture=setup([['W',0,1],['W',1,0],['B',0,2],['B',1,1],['B',2,0]]);
    const t=value(rulesEngine.tryMove(capture,{type:'place',color:'B',at}));expect(sorted(t.event.captured)).toEqual(['0,1','1,0']);expect(t.event.libertiesAfter).toHaveLength(2);
  });
  it.each([9,13] as const)('%s road candidates are all actually legal, and tiers do not silently apply a move',size=>{
    const g=setup([], 'B',size),before=JSON.stringify(g),analysis=analyzeTeachingPosition(g,FOCUS.auto);
    expect(analysis.candidates.length).toBeGreaterThan(1);for(const c of analysis.candidates)expect(rulesEngine.tryMove(g,{type:'place',color:'B',at:c.at}).ok).toBe(true);
    expect(teachingOverlay(analysis,0).markers).toEqual([]);expect(teachingOverlay(analysis,1).markers).toEqual([]);
    expect(teachingOverlay(analysis,2).markers).toHaveLength(9);
    expect(teachingOverlay(analysis,3).markers.map(m=>m.text)).toEqual(['A','B','C']);
    expect(teachingOverlay(analysis,4).markers.map(m=>m.text)).toEqual(['试']);expect(JSON.stringify(g)).toBe(before);
  });
  it('life focus gives conditional observations rather than asserting two empty points or no two eyes determine death',()=>{
    const a=analyzeTeachingPosition(setup(),FOCUS.life);expect(a.hint1).toContain('两个空点不等于两个独立真眼');expect(a.hint1).toContain('不会自动判活或判死');
  });
  it('path identity distinguishes undo branches and passes even when layout is unchanged',()=>{
    const g=setup(),a=value(rulesEngine.applyPass(g,'B')).nextState;
    expect(teachingPath(a)).not.toBe(teachingPath(g));expect(a.history).toEqual(g.history);
    const b=value(rulesEngine.tryMove(g,{type:'place',color:'B',at:{row:2,col:2}})).nextState;
    const c=value(rulesEngine.tryMove(value(rulesEngine.undo(b)),{type:'place',color:'B',at:{row:2,col:3}})).nextState;expect(teachingPath(b)).not.toBe(teachingPath(c));
  });
});
describe('transparent local opponent',()=>{
  it.each([1,2,3] as const)('level %s replies for either colour and follows an actual pass without claiming death',level=>{
    for(const humanColor of ['B','W'] as const){let g=setup();if(humanColor==='B')g=value(rulesEngine.tryMove(g,{type:'place',color:'B',at:{row:4,col:4}})).nextState;
      const options={...DEFAULT_GUIDED_OPTIONS,humanColor,level};const reply=localTeachingReply(g,options);expect(reply.source).toBe('local');expect(reply.at&&rulesEngine.tryMove(g,{type:'place',color:g.toPlay,at:reply.at}).ok).toBe(true);
    }
    const passed=value(rulesEngine.applyPass(setup(),'B')).nextState,reply=localTeachingReply(passed,{...DEFAULT_GUIDED_OPTIONS,level});expect(reply.at).toBeNull();expect(reply.reason).toContain('不是自动判活');
  });
  it('never replies after game end or on the human turn',()=>{
    const g=setup();expect(()=>localTeachingReply(g,DEFAULT_GUIDED_OPTIONS)).toThrow();const done=value(rulesEngine.resign(g,'B')).nextState;expect(()=>localTeachingReply(done,DEFAULT_GUIDED_OPTIONS)).toThrow();
  });
});

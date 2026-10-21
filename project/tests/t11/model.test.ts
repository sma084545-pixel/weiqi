import {describe,expect,it} from 'vitest';
import {getLiberties,startGame,tryMove,validateSetup} from '../../src/core/rules';
import {LIFE_BY_ID,LIFE_REFERENCES,LIFE_SCENARIOS,OUTER_LIBERTY_FRAMES,connectedEmptyPair,positionWithTurn,runLifeScenario} from '../../src/features/life-lab/model';

const keys=(points:readonly {row:number;col:number}[])=>points.map(point=>`${point.row},${point.col}`).sort();

describe('T11 verified eye and life comparisons',()=>{
  it('references the five unchanged formal LIFE revisions',()=>{
    expect(LIFE_REFERENCES).toEqual([1,2,3,4,5].map(index=>({id:`LIFE-${String(index).padStart(3,'0')}`,revision:1})));
    for(const reference of LIFE_REFERENCES)expect(LIFE_BY_ID.get(reference.id)?.validation.humanReviewed).toBeNull();
  });

  it('distinguishes the legal false-eye capture from a two-eye suicide',()=>{
    const falseEye=runLifeScenario(LIFE_SCENARIOS['false-eye']);
    expect(falseEye.ok).toBe(true);
    if(falseEye.ok)expect(keys(falseEye.trial.event.captured)).toEqual(keys(LIFE_SCENARIOS['false-eye'].expectedCaptured));
    const twoEyes=runLifeScenario(LIFE_SCENARIOS['two-eyes']);
    expect(twoEyes).toEqual(expect.objectContaining({ok:false,error:expect.objectContaining({code:'SUICIDE',at:{row:1,col:1}})}));
  });

  it('revalidates the same vital point with Black and White to play',()=>{
    const black=runLifeScenario(LIFE_SCENARIOS['key-black']);
    const white=runLifeScenario(LIFE_SCENARIOS['key-white']);
    expect(black.ok).toBe(true);expect(white.ok).toBe(true);
    if(black.ok&&white.ok){expect(black.trial.nextState.board[0][1]).toBe('B');expect(white.trial.nextState.board[0][1]).toBe('W');}
  });

  it('keeps two adjacent empty points distinct from two separated eyes',()=>{
    expect(connectedEmptyPair('LIFE-005',{row:0,col:1},{row:0,col:2})).toBe(true);
    expect(connectedEmptyPair('LIFE-001',{row:1,col:1},{row:1,col:3})).toBe(false);
  });

  it('validates every outer-liberty frame and reaches one shared final liberty',()=>{
    expect(OUTER_LIBERTY_FRAMES).toHaveLength(4);
    for(const frame of OUTER_LIBERTY_FRAMES)expect(validateSetup(frame.position).ok,frame.title).toBe(true);
    expect(keys(OUTER_LIBERTY_FRAMES[0].targetLiberties)).toEqual(['0,2','2,0','2,2','2,4']);
    expect(keys(OUTER_LIBERTY_FRAMES[3].targetLiberties)).toEqual(['2,2']);
    const final=OUTER_LIBERTY_FRAMES[3],puzzle=LIFE_BY_ID.get('LIFE-002')!;
    for(const at of puzzle.targetMarkers.map(marker=>marker.points[0])){
      const liberties=getLiberties(final.position.stones.reduce<(('B'|'W'|null)[])[]>((board,stone)=>{board[stone.row][stone.col]=stone.color;return board;},Array.from({length:5},()=>Array(5).fill(null))),at);
      expect(liberties.ok&&keys(liberties.value)).toContain('2,2');
    }
  });

  it('replays both LIFE-005 verified-dead terminal branches without a general solver',()=>{
    const puzzle=LIFE_BY_ID.get('LIFE-005')!;
    for(const sequence of [[{row:0,col:1},{row:0,col:2},{row:0,col:1}],[{row:0,col:2},{row:0,col:1},{row:0,col:2}]]){
      const started=startGame(positionWithTurn(puzzle,'W','T11-LIFE-005-REPLAY'),{mode:'full-game',komi:0,gameId:'T11-LIFE-005'});
      expect(started.ok).toBe(true);if(!started.ok)continue;
      let state=started.value;
      for(const at of sequence){const moved=tryMove(state,{type:'place',color:state.toPlay,at});expect(moved.ok).toBe(true);if(!moved.ok)break;state=moved.value.nextState;}
      for(const marker of puzzle.targetMarkers)for(const at of marker.points)expect(state.board[at.row][at.col]).toBeNull();
    }
    const terminals=puzzle.answer.type==='move-tree'?puzzle.answer.nodes.filter(node=>node.terminalStatus==='verified-dead'):[];
    expect(terminals).toHaveLength(2);
  });
});

import {describe,expect,it} from 'vitest';
import {createGameHistory} from '../../src/core/game-history';
import {applyPass,confirmScore,redo,resign,resumePlay,undo} from '../../src/core/rules';
import {game,place,rows,value} from '../t01/helpers';

// Expectations are hand-written: B A4, W A5, B B5 captures the corner white.
const captured=()=>place(place(place(game(5),1,0),0,0),0,1);
describe('shared game history projection',()=>{
  it('keeps every exact pre/post-capture board and turn without mutating state',()=>{
    const state=captured(),serialized=JSON.stringify(state),frames=createGameHistory(state);
    expect(frames).toHaveLength(4);
    expect(frames.map(frame=>rows(frame.board as typeof state.board))).toEqual([
      ['.....','.....','.....','.....','.....'],
      ['.....','B....','.....','.....','.....'],
      ['W....','B....','.....','.....','.....'],
      ['.B...','B....','.....','.....','.....'],
    ]);
    expect(frames.map(frame=>frame.toPlay)).toEqual(['B','W','B','W']);
    expect(frames.map(frame=>frame.captures.B)).toEqual([0,0,0,1]);
    expect(frames.map(frame=>frame.current)).toEqual([false,false,false,true]);
    expect(frames[2].markers[0].at).toEqual({row:0,col:0});
    expect(frames[3].markers[0].at).toEqual({row:0,col:1});
    expect(JSON.stringify(state)).toBe(serialized);
  });
  it('includes passes, scoring and dispute resumption without inventing stones',()=>{
    const first=value(applyPass(captured(),'W')).nextState;
    const scoring=value(applyPass(first,'B')).nextState;
    const state=value(resumePlay(scoring,'W')),frames=createGameHistory(state);
    expect(frames.slice(3).map(frame=>frame.consecutivePasses)).toEqual([0,1,2,0]);
    expect(frames.slice(3).map(frame=>frame.phase)).toEqual(['playing','playing','scoring','playing']);
    expect(frames[5].board).toEqual(frames[6].board);
    expect(frames[4].markers).toEqual([]);
    expect(frames[6].title).toContain('提出争议并恢复对弈');
    expect(state.history.layouts).toHaveLength(4);
  });
  it('shows original stones at final confirmation, not scoring-preview removals',()=>{
    const scoring=value(applyPass(value(applyPass(captured(),'W')).nextState,'B')).nextState;
    const final=value(confirmScore(scoring,{deadStones:[{row:0,col:1},{row:1,col:0}],neutralPoints:Array.from({length:25},(_,i)=>({row:Math.floor(i/5),col:i%5})),confirmedBy:['B','W']}));
    const frames=createGameHistory(final);
    expect(frames.at(-1)?.title).toContain('双方确认最终计分');
    expect(frames.at(-1)?.board[0][1]).toBe('B');
    expect(frames.at(-2)?.phase).toBe('scoring');
    expect(frames.at(-1)?.phase).toBe('finished');
  });
  it('projects only the effective branch after undo, redo and a new branch',()=>{
    const end=captured(),back=value(undo(end));
    expect(createGameHistory(back)).toHaveLength(3);
    expect(createGameHistory(back).at(-1)?.board[0][0]).toBe('W');
    expect(createGameHistory(value(redo(back)))).toEqual(createGameHistory(end));
    const branch=place(back,4,4),frames=createGameHistory(branch);
    expect(branch.redoStack).toHaveLength(0);
    expect(frames.at(-1)?.board[0][0]).toBe('W');
    expect(frames.at(-1)?.board[4][4]).toBe('B');
    expect(frames.at(-1)?.captures.B).toBe(0);
  });
  it('preserves a nonempty fresh setup, all four sizes, and resignation as an event',()=>{
    for(const size of [5,9,13,19] as const){
      const state=value(resign(place(game(size),size-1,size-1),'W')).nextState;
      const frames=createGameHistory(state);
      expect(frames[0].board).toHaveLength(size);
      expect(frames[1].board[size-1][size-1]).toBe('B');
      expect(frames[2].title).toContain('白方认输');
      expect(frames[2].phase).toBe('finished');
    }
    const setup=game(['.....','..B..','.....','.....','.....'],'full-game',0,'W');
    const frames=createGameHistory(place(setup,4,4));
    expect(frames[0].board[1][2]).toBe('B');expect(frames[0].toPlay).toBe('W');
    expect(frames[0].description).toContain('更早历史未知');
  });
});

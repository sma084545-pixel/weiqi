import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import type {Coord} from '../../src/core/content.generated';
import {beginRound,configureMatch,confirmUndo,createCaptureMatch,passTurn,playAt,refuseUndo,requestUndo,restartRound,seatForColor,type CaptureMatch} from '../../src/features/capture-game/model';
import {createMoveReview,winningExplanation} from '../../src/features/capture-game/review';

type Vector={id:string;size:5|9;moves:[number,number][];winner:'B'|'W';captured:[number,number][]};
const vectors=(JSON.parse(readFileSync(new URL('../fixtures/t07-capture-game-expected.json',import.meta.url),'utf8')) as {cases:Vector[]}).cases;
const coord=([row,col]:[number,number]):Coord=>({row,col});
const value=<T>(result:{ok:true;value:T}|{ok:false;error:unknown}):T=>{expect(result.ok).toBe(true);if(!result.ok)throw new Error(JSON.stringify(result.error));return result.value;};
const started=(size:5|9=5)=>value(beginRound(value(configureMatch(createCaptureMatch(),{size,showLiberties:false}))));
const playSequence=(vector:Vector)=>vector.moves.reduce((match,at)=>value(playAt(match,coord(at))),started(vector.size));

describe('T07 capture-first match controller',()=>{
  it.each(vectors)('$id reaches the independently expected immediate result',vector=>{
    let match=started(vector.size);
    for(let index=0;index<vector.moves.length;index++){
      const before=match.game;
      match=value(playAt(match,coord(vector.moves[index])));
      if(index<vector.moves.length-1)expect(match.game.phase).toBe('playing');
      expect(before).not.toBe(match.game);
    }
    expect(match.game.result).toEqual({reason:'first-capture',winner:vector.winner});
    expect(match.game.phase).toBe('finished');
    expect(match.winningEvent?.captured.map(at=>[at.row,at.col])).toEqual(vector.captured);
    expect(match.game.captures[vector.winner]).toBe(vector.captured.length);
    const frozen=match.game;
    const rejected=playAt(match,{row:4,col:4});
    expect(rejected).toEqual({ok:false,error:{code:'GAME_NOT_PLAYING',field:'/phase'}});
    expect(match.game).toBe(frozen);
  });

  it('defaults to 9路, allows a joint pre-start setting, then locks it',()=>{
    const initial=createCaptureMatch();
    expect(initial.settings).toEqual({size:9,showLiberties:false});
    const configured=value(configureMatch(initial,{size:5,showLiberties:true}));
    expect(configured.game.size).toBe(5);expect(configured.settings.showLiberties).toBe(true);
    const live=value(beginRound(configured));
    expect(configureMatch(live,{size:9,showLiberties:false})).toEqual({ok:false,error:{code:'SETTINGS_LOCKED'}});
  });

  it('keeps the whole state and turn unchanged after an invalid move',()=>{
    const once=value(playAt(started(),{row:0,col:0}));
    const before=once.game;
    const invalid=playAt(once,{row:0,col:0});
    expect(invalid).toEqual({ok:false,error:{code:'OCCUPIED',at:{row:0,col:0},field:'/move/at'}});
    expect(once.game).toBe(before);expect(once.game.toPlay).toBe('W');expect(once.game.moves).toHaveLength(1);
  });

  it('declares no winner immediately after two passes',()=>{
    const one=value(passTurn(started()));
    expect(one.game.phase).toBe('playing');expect(one.game.toPlay).toBe('W');
    const two=value(passTurn(one));
    expect(two.game.phase).toBe('finished');expect(two.game.result).toEqual({reason:'two-passes',winner:null});
  });

  it('requires black then white confirmation and preserves state on refusal',()=>{
    const played=value(playAt(started(),{row:2,col:2}));
    const requested=value(requestUndo(played));
    expect(requested.game).toBe(played.game);
    expect(confirmUndo(requested,'W')).toEqual({ok:false,error:{code:'UNDO_CONFIRMATION_ORDER'}});
    const refused=refuseUndo(requested);
    expect(refused.game).toBe(played.game);expect(refused.game.moves).toHaveLength(1);
    const black=value(confirmUndo(value(requestUndo(refused)),'B'));
    expect(black.game).toBe(played.game);
    const undone=value(confirmUndo(black,'W'));
    expect(undone.game.moves).toHaveLength(0);expect(undone.game.toPlay).toBe('B');expect(undone.game.phase).toBe('playing');
  });

  it('undoes a winning move only after both confirmations and resumes play',()=>{
    const won=playSequence(vectors[0]);
    const first=value(confirmUndo(value(requestUndo(won)),'B'));
    const undone=value(confirmUndo(first,'W'));
    expect(undone.game.phase).toBe('playing');expect(undone.game.result).toBeNull();expect(undone.winningEvent).toBeNull();
    expect(undone.game.moves).toHaveLength(2);expect(undone.game.toPlay).toBe('B');expect(undone.game.board[0][0]).toBe('W');
  });

  it('swaps partner colors and starts with a completely fresh round',()=>{
    const won=playSequence(vectors[2]);
    const next=restartRound(won,true);
    expect(seatForColor(next,'B')).toBe('B');expect(seatForColor(next,'W')).toBe('A');
    expect(next.game.moves).toEqual([]);expect(next.game.captures).toEqual({B:0,W:0});expect(next.game.result).toBeNull();
    expect(next.game.history.layouts).toHaveLength(1);expect(next.game.undoStack).toEqual([]);expect(next.game.board.flat().every(point=>point===null)).toBe(true);
  });

  it('builds at most five saved review frames and explains the verified final liberty',()=>{
    const won=playSequence(vectors[2]);
    const review=createMoveReview(won.game,5);
    expect(review).toHaveLength(5);expect(review.at(-1)?.board).toEqual(won.game.board);
    const result=won.game.result;
    expect(result?.reason).toBe('first-capture');
    if(!result||result.reason!=='first-capture')throw new Error('expected first-capture result');
    const explanation=winningExplanation(won.winningEvent!,result.winner,won.game.size);
    expect(explanation.text).toContain('只剩 1 口气');expect(explanation.text).toContain('C5');
    expect(explanation.markers.filter(marker=>marker.kind==='target')).toHaveLength(2);
  });
});

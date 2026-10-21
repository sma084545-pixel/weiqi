import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import type {GameState,TerminalFixture} from '../../src/core/content.generated';
import {rulesEngine} from '../../src/core/rules';
import {
  confirmScoreFor,confirmUndo,createFullGameMatch,passTurn,playAt,requestUndo,resignGame,restoreFullGame,
  resumeDisputedPlay,scorePreview,setBoardSize,setKomi,setSetupKind,startFullGame,toggleDeadGroup,toggleHandicapStone,
} from '../../src/features/full-game/model';
import {createFullGameReview} from '../../src/features/full-game/review';
import {createFullGameStore} from '../../src/features/full-game/storage';

const value=<T>(result:{ok:true;value:T}|{ok:false;error:unknown}):T=>{expect(result.ok).toBe(true);if(!result.ok)throw new Error(JSON.stringify(result.error));return result.value;};
const started=()=>value(startFullGame(createFullGameMatch()));
const twoStones=()=>value(playAt(value(playAt(started(),{row:0,col:0})),{row:8,col:8}));
const scoring=()=>value(passTurn(value(passTurn(twoStones()))));

describe('T08 full game controller',()=>{
  it('defaults to 9路 and 0 komi, supports 13/19, and locks settings after start',()=>{
    const initial=createFullGameMatch();expect(initial.setup).toEqual({size:9,komi:0,kind:'empty',handicapStones:[]});
    const thirteen=value(setBoardSize(initial,13));expect(thirteen.setup.size).toBe(13);
    const nineteen=value(setBoardSize(thirteen,19));expect(nineteen.setup.size).toBe(19);
    const live=value(startFullGame(value(setKomi(nineteen,6.5))));expect(live.game?.komi).toBe(6.5);
    expect(setKomi(live,0)).toEqual({ok:false,error:{code:'SETTINGS_LOCKED'}});
  });

  it('requires an explicit free handicap, validates it, and starts with white',()=>{
    const mode=value(setSetupKind(createFullGameMatch(),'free-handicap'));
    expect(startFullGame(mode)).toEqual({ok:false,error:{code:'NO_HANDICAP_STONES',field:'/setup/handicapStones'}});
    const placed=value(toggleHandicapStone(mode,{row:4,col:4}));const live=value(startFullGame(placed));
    expect(live.game?.toPlay).toBe('W');expect(live.game?.setup.stones).toEqual([{row:4,col:4,color:'B'}]);expect(live.game?.history.layouts).toHaveLength(1);
  });

  it('does not silently discard handicap stones when size or setup kind changes',()=>{
    const placed=value(toggleHandicapStone(value(setSetupKind(createFullGameMatch(),'free-handicap')),{row:2,col:2}));
    expect(setBoardSize(placed,13)).toEqual({ok:false,error:{code:'SIZE_CHANGE_REQUIRES_CLEAR',field:'/setup/handicapStones'}});
    expect(setSetupKind(placed,'empty')).toEqual({ok:false,error:{code:'SIZE_CHANGE_REQUIRES_CLEAR',field:'/setup/handicapStones'}});
    expect(value(setBoardSize(placed,13,true)).setup.handicapStones).toEqual([]);
  });

  it('plays, passes twice into scoring, marks whole groups, and invalid clicks preserve state',()=>{
    const terminal=scoring();expect(terminal.game?.phase).toBe('scoring');expect(terminal.game?.consecutivePasses).toBe(2);
    const before=terminal;expect(toggleDeadGroup(terminal,{row:4,col:4})).toEqual({ok:false,error:{code:'NOT_A_STONE',field:'/agreement/deadStones'}});expect(terminal).toBe(before);
    const marked=value(toggleDeadGroup(terminal,{row:0,col:0}));expect(marked.scoring.deadStones).toEqual([{row:0,col:0}]);
    const black=value(confirmScoreFor(marked,'B'));expect(black.scoring.confirmedBy).toEqual(['B']);
    const changed=value(toggleDeadGroup(black,{row:0,col:0}));expect(changed.scoring.confirmedBy).toEqual([]);
  });

  it('creates only a preview before both confirmations and a final result afterward',()=>{
    const terminal=scoring(),preview=value(scorePreview(terminal));
    expect(preview.basis).toBe('preview');expect(preview.neutralPoints).toHaveLength(79);expect(preview.winner).toBe('draw');
    const black=value(confirmScoreFor(terminal,'B'));expect(black.game?.phase).toBe('scoring');expect(black.game?.result).toBeNull();
    const final=value(confirmScoreFor(black,'W'));expect(final.game?.phase).toBe('finished');expect(final.game?.result?.reason).toBe('area');
    if(final.game?.result?.reason==='area')expect(final.game.result.score).toMatchObject({basis:'confirmed',blackTotal:1,whiteTotal:1,winner:'draw'});
  });

  it('resets prior confirmation when marking dead and scores the resulting board',()=>{
    const marked=value(toggleDeadGroup(scoring(),{row:0,col:0}));const black=value(confirmScoreFor(marked,'B'));const final=value(confirmScoreFor(black,'W'));
    if(final.game?.result?.reason!=='area')throw new Error('expected area');
    expect(final.game.result.score).toMatchObject({blackStones:0,whiteStones:1,whiteTotal:81,difference:-81,winner:'W'});
    expect(final.game.board[0][0]).toBe('B');expect(final.game.agreement?.deadStones).toEqual([{row:0,col:0}]);
  });

  it('resumes disputed play on the original board while preserving superko history',()=>{
    const terminal=scoring(),layouts=terminal.game!.history.layouts.slice(),board=terminal.game!.board;
    const resumed=value(resumeDisputedPlay(terminal,'W'));
    expect(resumed.game?.phase).toBe('playing');expect(resumed.game?.consecutivePasses).toBe(0);expect(resumed.game?.board).toBe(board);expect(resumed.game?.history.layouts).toEqual(layouts);
    expect(resumed.game?.moves.at(-1)).toEqual({type:'resume',requestedBy:'W'});
  });

  it('mutually undoes the second pass and can continue from the restored live state',()=>{
    const terminal=scoring();const requested=value(requestUndo(terminal));const black=value(confirmUndo(requested,'B'));const undone=value(confirmUndo(black,'W'));
    expect(undone.game?.phase).toBe('playing');expect(undone.game?.consecutivePasses).toBe(1);expect(undone.game?.moves).toHaveLength(3);
    expect(value(playAt(undone,{row:4,col:4})).game?.moves).toHaveLength(4);
  });

  it('resignation records a winner without inventing area score',()=>{
    const result=value(resignGame(started())).game?.result;expect(result).toEqual({reason:'resign',winner:'W'});expect('score' in result!).toBe(false);
  });

  it('builds read-only history frames without mutating the game',()=>{
    const live=twoStones(),before=live.game;const frames=createFullGameReview(live.game!);
    expect(frames).toHaveLength(3);expect(frames[0].title).toBe('开局设置');expect(frames.at(-1)?.board).toEqual(live.game?.board);expect(live.game).toBe(before);
  });
});

describe('T08 independent terminal and replayable persistence',()=>{
  it('matches the independently hand-counted 9路 terminal and ignores capture counters',()=>{
    const fixture=JSON.parse(readFileSync(new URL('../../content/t08/development-terminal.json',import.meta.url),'utf8')) as TerminalFixture;
    const manual=JSON.parse(readFileSync(new URL('../fixtures/t08-full-game-expected.json',import.meta.url),'utf8')).manualCount;
    const board=Array.from({length:9},()=>Array<'B'|'W'|null>(9).fill(null));for(const stone of fixture.position.stones)board[stone.row][stone.col]=stone.color;
    expect(rulesEngine.validateSetup(fixture.position).ok).toBe(true);
    const score=value(rulesEngine.scoreArea({board,komi:fixture.komi,agreement:fixture.agreement,basis:'teaching-assumption',assumptions:fixture.assumptions}));
    expect({...score,blackTerritory:score.blackTerritory.map(p=>[p.row,p.col]),whiteTerritory:score.whiteTerritory.map(p=>[p.row,p.col]),neutralPoints:score.neutralPoints.map(p=>[p.row,p.col]),basis:undefined}).toMatchObject(manual);
  });

  it('saves and loads only after rule replay, rejecting forged state',()=>{
    const memory=new Map<string,string>(),port={getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v);},removeItem:(k:string)=>{memory.delete(k);}};
    const store=createFullGameStore(port),live=twoStones().game!;expect(store.save(live).ok).toBe(true);
    const loaded=store.load();expect(loaded.ok&&loaded.value?.board).toEqual(live.board);
    const forged=JSON.parse(JSON.stringify(live)) as GameState;forged.captures.B=99;memory.set(`go-club:v1:${forged.id}`,JSON.stringify(forged));
    const rejected=store.load();expect(rejected.ok).toBe(false);if(!rejected.ok)expect(rejected.issues[0].path).toContain('/captures');
    expect(restoreFullGame(forged).ok).toBe(false);
  });
});

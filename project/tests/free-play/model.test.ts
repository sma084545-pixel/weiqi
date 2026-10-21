import {describe,expect,it} from 'vitest';
import {moduleRegistry,FREE_PLAY_ROUTE} from '../../src/features/learning-hub/registry';
import {
  createFullGameMatch,setBoardSize,startFullGame,playAt,passTurn,confirmScoreFor,setKomi,
  scorePreview,restoreFullGame,FULL_GAME_SIZES,type FullGameMatch,
} from '../../src/features/full-game/model';
import {createFullGameStore} from '../../src/features/full-game/storage';
const v=<T>(r:{ok:true;value:T}|{ok:false;error:unknown})=>{if(!r.ok)throw new Error(JSON.stringify(r.error));return r.value;};
const finish=(m:FullGameMatch)=>v(confirmScoreFor(v(confirmScoreFor(v(passTurn(v(passTurn(m)))),'B')),'W'));
describe('free local two-player game using the shared full-game engine',()=>{
 it('exposes a real, installed free-play entry and preserves the existing full-game address',()=>{
  expect(moduleRegistry.resolve(FREE_PLAY_ROUTE)).toMatchObject({ok:true,module:{id:'free-play',returnRoute:'#/home'}});
  expect(moduleRegistry.resolve('#/play/full-game')).toMatchObject({ok:true,module:{id:'full-game'}});
 });
 for(const size of FULL_GAME_SIZES)it(`${size}x${size}: alternate moves, agree terminal, score a manually counted draw, and replay save`,()=>{
  let m=v(startFullGame(v(setBoardSize(createFullGameMatch(),size))));
  m=v(playAt(m,{row:0,col:0}));expect(m.game?.toPlay).toBe('W');
  m=v(playAt(m,{row:size-1,col:size-1}));expect(m.game?.toPlay).toBe('B');
  const scoring=v(passTurn(v(passTurn(m))));expect(scoring.game?.result).toBeNull();
  // One stone each; the single connected empty region borders both colors.
  expect(v(scorePreview(scoring))).toMatchObject({blackTotal:1,whiteTotal:1});
  expect(v(scorePreview(scoring)).neutralPoints).toHaveLength(size*size-2);
  const ended=finish(m);expect(ended.game?.result).toMatchObject({reason:'area',score:{winner:'draw',blackStones:1,whiteStones:1,blackTotal:1,whiteTotal:1}});
  const memory=new Map<string,string>();const store=createFullGameStore({getItem:k=>memory.get(k)??null,setItem:(k,x)=>{memory.set(k,x);},removeItem:k=>{memory.delete(k);}});
  expect(store.save(ended.game!).ok).toBe(true);const saved=store.load();if(!saved.ok||!saved.value)throw Error('save');
  expect(v(restoreFullGame(saved.value)).game?.size).toBe(size);
 });
 it('continues after a capture and rejects occupied/suicide without changing the turn or state',()=>{
  let m=v(startFullGame(v(setBoardSize(createFullGameMatch(),5))));
  for(const [row,col] of [[1,0],[0,0],[0,1]])m=v(playAt(m,{row,col}));
  expect(m.game?.captures.B).toBe(1);expect(m.game?.board[0][0]).toBeNull();
  expect(m.game?.phase).toBe('playing');expect(m.game?.toPlay).toBe('W');
  const before=JSON.stringify(m);
  expect(playAt(m,{row:0,col:1})).toMatchObject({ok:false,error:{code:'OCCUPIED'}});
  expect(playAt(m,{row:0,col:0})).toMatchObject({ok:false,error:{code:'SUICIDE'}});
  expect(JSON.stringify(m)).toBe(before);
 });
 it('determines both winners and a draw from area plus opening komi, without second capture points',()=>{
  // Adjacent B stones at upper-left, W lower-right: B2, W1; all 22 empty points neutral.
  for(const [komi,winner,totalW] of [[0,'B',1],[1,'draw',2],[1.5,'W',2.5]] as const){
   let m=v(startFullGame(v(setKomi(v(setBoardSize(createFullGameMatch(),5)),komi))));
   for(const [row,col] of [[0,0],[4,4],[0,1]])m=v(playAt(m,{row,col}));
   const ended=finish(m);
   expect(ended.game?.result).toMatchObject({reason:'area',score:{winner,blackTotal:2,whiteTotal:totalW,difference:2-totalW}});
   expect(setKomi(ended,99)).toMatchObject({ok:false,error:{code:'SETTINGS_LOCKED'}});
  }
 });
 it('rejects unsupported sizes rather than silently changing dimensions',()=>{
  const m=createFullGameMatch();expect(setBoardSize(m,7 as never)).toMatchObject({ok:false,error:{code:'INVALID_ARGUMENT',field:'/setup/size'}});expect(m.setup.size).toBe(9);
 });
});

import {describe,it,expect} from 'vitest';
import {newGuidedGame,teachingBotMove,teachingPause,GUIDED_GAME_ID} from '../../src/features/advanced-courses/teaching-bot';
import {applyPass,startGame,tryMove,undo,restoreGame} from '../../src/core/rules';
import {sceneById} from '../../src/features/advanced-courses/data';
describe('complete 13-road teaching partner with shared rules',()=>{
 it('starts a separate empty 13-road game, uses real turn-taking and a fixed history root',()=>{
  const r=newGuidedGame();expect(r.ok).toBe(true);if(!r.ok||!r.value.game)return;const g=r.value.game;expect(g.id).toBe(GUIDED_GAME_ID);expect(g.size).toBe(13);expect(g.history.layouts).toHaveLength(1);expect(teachingBotMove(g).ok).toBe(false);
  const black=tryMove(g,{type:'place',color:'B',at:{row:3,col:3}});if(!black.ok)throw Error('black');const white=teachingBotMove(black.value.nextState);expect(white.ok).toBe(true);if(white.ok){expect(white.state.toPlay).toBe('B');expect(white.state.moves).toHaveLength(2);expect(restoreGame(white.state).ok).toBe(true);expect(undo(white.state)).toMatchObject({ok:true,value:{toPlay:'W'}});}
 });
 it('follows a human pass into real scoring, without declaring arbitrary groups alive',()=>{
  const r=newGuidedGame();if(!r.ok||!r.value.game)throw Error('setup');const p=applyPass(r.value.game,'B');if(!p.ok)throw Error('pass');const bot=teachingBotMove(p.value.nextState);expect(bot.ok).toBe(true);if(bot.ok){expect(bot.state.phase).toBe('scoring');expect(bot.state.result).toBeNull();expect(bot.state.history.layouts).toHaveLength(1);expect(bot.reason).toContain('人工确认');}
 });
 it('captures a real one-liberty enemy before an opening point',()=>{
  const p=structuredClone(sceneById('ADV-10-01')!.position);p.toPlay='W';p.stones=p.stones.map(s=>({...s,color:s.color==='B'?'W':'B'}));
  const r=startGame(p,{mode:'full-game',komi:0,gameId:'DEV-BOT'});if(!r.ok)throw Error('setup');const bot=teachingBotMove(r.value);expect(bot.ok).toBe(true);if(bot.ok){expect(bot.state.board[6][6]).toBe(null);expect(bot.state.captures.W).toBe(1);}
 });
 it('only creates weakness and tactic pauses when the actual board supports them',()=>{
  const r=newGuidedGame();if(!r.ok||!r.value.game)throw Error('setup');expect(teachingPause(r.value.game,[])?.id).toBe('opening');expect(teachingPause(r.value.game,['opening'])).toBeNull();
  const weak=sceneById('ADV-11-03')!.position;const w=startGame(weak,{mode:'full-game',komi:0,gameId:'DEV-WEAK'});if(!w.ok)throw Error('weak');expect(teachingPause(w.value,['opening'])?.id).toBe('weak');
  const t=startGame(sceneById('ADV-10-01')!.position,{mode:'full-game',komi:0,gameId:'DEV-TACTIC'});if(!t.ok)throw Error('t');expect(teachingPause(t.value,['opening'])?.id).toBe('tactic');
 });
 it('keeps bot output deterministic and replayable through ten actual turns',()=>{
  const r=newGuidedGame();if(!r.ok||!r.value.game)throw Error('setup');let g=r.value.game;
  for(const at of [{row:3,col:3},{row:9,col:3},{row:5,col:3},{row:7,col:3},{row:5,col:5},{row:7,col:5},{row:4,col:3},{row:8,col:3},{row:4,col:5},{row:8,col:5}]){
   const black=tryMove(g,{type:'place',color:'B',at});if(!black.ok)continue;const a=teachingBotMove(black.value.nextState),b=teachingBotMove(black.value.nextState);expect(a).toEqual(b);if(!a.ok)throw Error('bot');g=a.state;
  }
  expect(g.moves.length).toBeGreaterThanOrEqual(10);expect(restoreGame(g).ok).toBe(true);
 });
});

import {createGuidedSessionStore,GUIDED_SESSION_KEY} from '../../src/features/advanced-courses/game-storage';
import {passTurn,toggleDeadGroup,confirmScoreFor,playAt} from '../../src/features/full-game/model';
it('restores pending scoring annotations and one-side confirmation, isolated from the normal game',()=>{
 const data=new Map<string,string>([['go-club:v1:LOCAL-T08-FULL-GAME','unrelated']]);const port={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};
 const store=createGuidedSessionStore(port),newGame=newGuidedGame();if(!newGame.ok)throw Error('setup');let m=newGame.value;
 const moves=[()=>playAt(m,{row:3,col:3}),()=>passTurn(m),()=>passTurn(m)];for(const move of moves){const r=move();if(!r.ok)throw Error('move');m=r.value;}
 const mark=toggleDeadGroup(m,{row:3,col:3});if(!mark.ok)throw Error('mark');m=mark.value;const agree=confirmScoreFor(m,'B');if(!agree.ok)throw Error('agree');m=agree.value;
 expect(store.save(m,['opening']).ok).toBe(true);const restored=store.load();expect(restored).toMatchObject({ok:true,match:{scoring:{deadStones:[{row:3,col:3}],confirmedBy:['B']}}});expect(data.get('go-club:v1:LOCAL-T08-FULL-GAME')).toBe('unrelated');
 const raw=data.get(GUIDED_SESSION_KEY)!;const corrupt=JSON.parse(raw);corrupt.game.captures.B=99;data.set(GUIDED_SESSION_KEY,JSON.stringify(corrupt));expect(store.load().ok).toBe(false);expect(data.get(GUIDED_SESSION_KEY)).toBe(JSON.stringify(corrupt));
});

import {describe,it,expect} from 'vitest';
import Ajv from 'ajv';
import contentSchema from '../../schemas/content.schema.json';
import guidedSchema from '../../schemas/guided-session.schema.json';
import koVector from '../fixtures/rules-vectors.json';
import {rulesEngine} from '../../src/core/rules';
import {createGameHistory} from '../../src/core/game-history';
import {namespaceForKey} from '../../src/core/unified-persistence';
import {playAt,passTurn,resignGame,confirmScoreFor,resumeDisputedPlay,toggleDeadGroup,restoreFullGame} from '../../src/features/full-game/model';
import {travelAiHistory} from '../../src/features/ai-game/model';
import {startGuidedSession,guidedHumanMove,addHintUse,guidedSummary,retryGuidedMoment,updateGuidedMatch,nextLearningRoute} from '../../src/features/guided-play/model';
import {createGuidedPlayStore,createGuidedProgressStore,guidedSessionJson,parseGuidedSession,GUIDED_SESSION_KEY,GUIDED_PROGRESS_KEY} from '../../src/features/guided-play/storage';
import {DEFAULT_GUIDED_OPTIONS,FOCUS,type GuidedSession} from '../../src/features/guided-play/types';
import {moduleRegistry,GUIDED_PLAY_ROUTE} from '../../src/features/learning-hub/registry';
const value=<T,>(r:{ok:true;value:T}|{ok:false;error:unknown}):T=>{if(!r.ok)throw Error(JSON.stringify(r));return r.value;};
const start=()=>startGuidedSession(DEFAULT_GUIDED_OPTIONS,'GUIDED-unit-test');
const apply=(s:GuidedSession,r:ReturnType<typeof playAt>)=>{const next=updateGuidedMatch(s,r);if(!next)throw Error(JSON.stringify(r));return next;};
function move(s:GuidedSession,row:number,col:number){return apply(s,playAt(s.match,{row,col}));}
function finish(s=start()){s=apply(s,passTurn(s.match));s=apply(s,passTurn(s.match));s=apply(s,confirmScoreFor(s.match,'B'));return apply(s,confirmScoreFor(s.match,'W'));}
const memory=()=>{const map=new Map<string,string>([['go-club:full-game:ai:v1','ordinary-AI-sentinel'],['go-club:full-game:guided13:v1','lesson12-sentinel']]);return {map,port:{getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);}}};};
describe('Guided Play is a shared-engine client',()=>{
  it.each([9,13] as const)('starts %s with locked focus <=3 and black-first regardless of human colour',size=>{
    const s=startGuidedSession({...DEFAULT_GUIDED_OPTIONS,size,humanColor:'W'},'GUIDED-white');expect(s.match.game).toMatchObject({size,toPlay:'B',phase:'playing',komi:0});expect(FOCUS[s.options.goal].length).toBeLessThanOrEqual(3);expect(guidedHumanMove(s,{row:0,col:0})).toMatchObject({ok:false,error:{code:'NOT_YOUR_TURN'}});
  });
  it('failed human moves do not change colour, board, captures or history',()=>{
    const s=move(move(start(),0,0),8,8),text=JSON.stringify(s);
    expect(guidedHumanMove(s,{row:0,col:0})).toMatchObject({ok:false,error:{code:'OCCUPIED'}});expect(guidedHumanMove(s,{row:9,col:0})).toMatchObject({ok:false,error:{code:'OUT_OF_BOUNDS'}});expect(JSON.stringify(s)).toBe(text);
  });
  it('end-to-end ko from legal moves also excludes immediate retake in the new mode',()=>{
    let s=start();for(const [row,col] of koVector.ko.sequence)s=move(s,row,col);
    s=move(s,1,2);const original=JSON.stringify(s);
    expect(playAt(s.match,{row:1,col:1})).toMatchObject({ok:false,error:{code:'SUPERKO'}});expect(JSON.stringify(s)).toBe(original);
    const passed=finish(s);expect(passed.match.game!.history).toEqual(s.match.game!.history);
    let dispute=apply(s,passTurn(s.match));dispute=apply(dispute,passTurn(dispute.match));
    dispute=apply(dispute,resumeDisputedPlay(dispute.match,'W'));
    expect(playAt(dispute.match,{row:1,col:1})).toMatchObject({ok:false,error:{code:'SUPERKO'}});
  });
  it('pass/confirmation/undo and new branches retain exact rule histories and readonly timeline',()=>{
    let s=move(move(start(),0,1),0,0);s=move(s,1,0);expect(s.match.game!.captures.B).toBe(1);
    const original=s.match.game!,h=createGameHistory(original);expect(h[2].board[0][0]).toBe('W');expect(original.board[0][0]).toBeNull();expect(original.moves).toHaveLength(3);
    const undone=apply(s,travelAiHistory(s.match,{humanColor:'B',difficulty:'relaxed'},'undo'));expect(undone.match.game!.captures.B).toBe(0);
    const branched=move(undone,2,2);expect(branched.match.game!.redoStack).toHaveLength(0);expect(branched.match.game!.history.layouts).not.toContain(original.history.layouts.at(-1));
  });
  it('dead-group preview never changes original stones; changed marks cancel consent, dispute preserves history',()=>{
    let s=move(move(start(),2,2),8,8);s=apply(s,passTurn(s.match));s=apply(s,passTurn(s.match));const before=s.match.game!;
    s=apply(s,confirmScoreFor(s.match,'B'));s=apply(s,toggleDeadGroup(s.match,{row:2,col:2}));expect(s.match.scoring.confirmedBy).toEqual([]);expect(s.match.game!.board).toEqual(before.board);
    s=apply(s,resumeDisputedPlay(s.match,'B'));expect(s.match.game!.board).toEqual(before.board);expect(s.match.game!.history).toEqual(before.history);expect(s.match.game!.consecutivePasses).toBe(0);
  });
  it('empty two-pass finish is a draw and reports no invented accomplishments',()=>{
    const s=finish(),summary=guidedSummary(s);expect(s.match.game!.result).toMatchObject({reason:'area',score:{winner:'draw',blackTotal:0,whiteTotal:0}});expect(summary).toMatchObject({humanMoves:0,capturingMoves:0,connections:0,escapes:0,hintRequests:0,moments:[]});expect(guidedHumanMove(s,{row:4,col:4})).toMatchObject({ok:false,error:{code:'GAME_NOT_PLAYING'}});
  });
  it('summary counts actual effects, not claimed thought or students; resign has no fabricated score',()=>{
    let s=start();s=addHintUse(s,1);s=addHintUse(s,2);s=move(move(s,0,1),0,0);s=move(s,1,0);s=move(s,8,8);s=apply(s,resignGame(s.match));
    const summary=guidedSummary(s);expect(summary).toMatchObject({humanMoves:2,capturingMoves:1,capturedStones:1,connections:0,hintRequests:2});expect(s.match.game!.result).toEqual({reason:'resign',winner:'W'});
    const before=JSON.stringify(s),retry=retryGuidedMoment(s,2,'GUIDED-retry');expect(retry.parentSessionId).toBe(s.id);expect(retry.match.game!.moves).toHaveLength(2);expect(retry.match.game!.board[0][0]).toBe('W');expect(retry.match.game!.history).toEqual(s.match.game!.undoStack[2].history);expect(JSON.stringify(s)).toBe(before);
  });
  it('all next recommendations and the independent route are actually registered',()=>{
    expect(moduleRegistry.resolve(GUIDED_PLAY_ROUTE)).toMatchObject({ok:true,module:{id:'guided-play'}});expect(moduleRegistry.getById('guided-play')?.requiresNetwork).not.toBe(true);
    for(const focus of Object.values(FOCUS))expect(moduleRegistry.resolve(nextLearningRoute(focus).route).ok).toBe(true);
  });
});
describe('isolated, replayed local records',()=>{
  it('schemaVersion1 exports validate and roundtrip size, colour, hints, redo and pending dead annotations',()=>{
    const ajv=new Ajv({strict:false});ajv.addSchema(contentSchema);const valid=ajv.compile(guidedSchema);
    let s=move(move(start(),2,2),8,8);s=apply(s,passTurn(s.match));s=apply(s,passTurn(s.match));s=apply(s,toggleDeadGroup(s.match,{row:2,col:2}));s=apply(s,confirmScoreFor(s.match,'B'));
    const text=guidedSessionJson(s);expect(valid(JSON.parse(text)),JSON.stringify(valid.errors)).toBe(true);const loaded=parseGuidedSession(text);expect(loaded.ok&&loaded.session?.match.scoring).toEqual(s.match.scoring);expect(loaded.ok&&loaded.session?.match.game!.history).toEqual(s.match.game!.history);
  });
  it.each(['captures','revision','size','extra','hint','partial-dead','game-id','options'])('forged %s fails without replacing the original',field=>{
    const s=move(move(move(start(),2,2),8,8),2,3),d=JSON.parse(guidedSessionJson(s));
    if(field==='captures')d.game.captures.B=20;if(field==='revision')d.schemaVersion=2;if(field==='size')d.options.size=13;if(field==='extra')d.secret='no';if(field==='hint')d.hintUses=[{level:99,index:0,path:''}];if(field==='partial-dead')d.scoring.deadStones=[{row:2,col:2}];if(field==='game-id')d.game.id='LOCAL-AI-FULL-GAME';if(field==='options')d.options.rank='pro';
    expect(parseGuidedSession(JSON.stringify(d)).ok).toBe(false);
  });
  it('stores use the public adapter without touching ordinary AI or course12 saves',()=>{
    const {port,map}=memory(),store=createGuidedPlayStore(port);const s=start();expect(store.save(s)).toEqual({ok:true});expect(store.load()).toMatchObject({ok:true,session:{id:s.id}});
    expect(map.get('go-club:full-game:ai:v1')).toBe('ordinary-AI-sentinel');expect(map.get('go-club:full-game:guided13:v1')).toBe('lesson12-sentinel');expect(namespaceForKey(GUIDED_SESSION_KEY)).toBe('games');expect(namespaceForKey(GUIDED_PROGRESS_KEY)).toBe('progress');
  });
  it('completed statistics are idempotent, unfinished games do not become complete; original is archived for retry',()=>{
    const {port,map}=memory(),progress=createGuidedProgressStore(port),store=createGuidedPlayStore(port);expect(progress.record(start()).ok).toBe(false);
    const s=finish();expect(progress.record(s)).toMatchObject({ok:true,value:{completed:[{sessionId:s.id}]}});progress.record(s);expect(progress.load()).toMatchObject({ok:true,value:{completed:[{sessionId:s.id}]}});expect(store.archive(s)).toEqual({ok:true});expect(map.has(`go-club:full-game:guided-archive:${s.id}`)).toBe(true);
  });
  it('quota and corrupt data preserve a usable export and report a recoverable error',()=>{
    const store=createGuidedPlayStore({getItem:()=>'{broken',setItem:()=>{throw Error('quota');},removeItem:()=>{}});expect(store.load().ok).toBe(false);expect(store.save(start()).ok).toBe(false);expect(parseGuidedSession(guidedSessionJson(start())).ok).toBe(true);
  });
});

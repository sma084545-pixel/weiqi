import {describe,it,expect} from 'vitest';
import Ajv from 'ajv';
import aiSchema from '../../schemas/ai-session.schema.json';
import contentSchema from '../../schemas/content.schema.json';
import {rulesEngine} from '../../src/core/rules';
import {startAiGame,emptyAiMatch,humanMove,applyAiMove,travelAiHistory,DEFAULT_AI_OPTIONS,AI_GAME_ID} from '../../src/features/ai-game/model';
import {confirmScoreFor,resumeDisputedPlay,restoreFullGame,toggleDeadGroup} from '../../src/features/full-game/model';
import {createAiSessionStore,parseAiSession,aiSessionJson,AI_SESSION_KEY} from '../../src/features/ai-game/storage';
import {namespaceForKey} from '../../src/core/unified-persistence';
import {makeAiMoveRequest,AI_DIFFICULTIES} from '../../src/core/analysis/ai-contract';
import type {AiMoveResponse} from '../../src/core/analysis/ai-contract';

const unwrap=<T,>(r:{ok:true;value:T}|{ok:false;error:unknown}):T=>{if(!r.ok)throw Error(JSON.stringify(r.error));return r.value;};
const start=(size:5|9|13|19=5)=>unwrap(startAiGame({...emptyAiMatch(),setup:{size,komi:0,kind:'empty',handicapStones:[]}}));
const move=(at:{row:number;col:number}|null,color:'B'|'W'='W'):AiMoveResponse=>({schemaVersion:1,positionId:'unit',requestId:'unit-move',aiColor:color,difficulty:'standard',move:at?{type:'place',at}:{type:'pass'},visits:24,elapsedMs:10,engine:{name:'KataGo',version:'1.18.1',model:'test-double',backend:'Eigen CPU',maxVisits:24}});
describe('AI full-game model uses the shared rule/history implementation',()=>{
  it.each([5,9,13,19] as const)('%s road starts isolated from the human and guided game saves',size=>{
    const s=start(size);expect(s.game).toMatchObject({id:AI_GAME_ID,size,toPlay:'B',phase:'playing'});expect(s.game!.history.layouts).toHaveLength(1);
  });
  it('locks settings, validates komi and supports free handicap with actual white-first turn',()=>{
    expect(startAiGame(start()).ok).toBe(false);
    for(const komi of [101,1.1])expect(startAiGame({...emptyAiMatch(),setup:{...emptyAiMatch().setup,komi}}).ok).toBe(false);
    const m=unwrap(startAiGame({...emptyAiMatch(),setup:{size:9,komi:6.5,kind:'free-handicap',handicapStones:[{row:2,col:2},{row:6,col:6}]}}));expect(m.game!.toPlay).toBe('W');expect(m.game!.setup.stones).toHaveLength(2);
  });
  it('human and AI alternate; occupied, wrong colour and repeated response leave input unchanged',()=>{
    const initial=start(),s=unwrap(humanMove(initial,DEFAULT_AI_OPTIONS,{row:0,col:0}));
    expect(humanMove(s,DEFAULT_AI_OPTIONS,{row:0,col:1})).toMatchObject({ok:false,error:{code:'NOT_YOUR_TURN'}});
    const before=JSON.stringify(s);expect(applyAiMove(s,DEFAULT_AI_OPTIONS,move({row:0,col:0})).ok).toBe(false);expect(JSON.stringify(s)).toBe(before);
    const next=unwrap(applyAiMove(s,DEFAULT_AI_OPTIONS,move({row:4,col:4})));expect(next.game!.toPlay).toBe('B');expect(next.game!.moves).toHaveLength(2);expect(applyAiMove(next,DEFAULT_AI_OPTIONS,move({row:3,col:3})).ok).toBe(false);
  });
  it('human may choose white; AI black first uses the real initial turn',()=>{
    const options={...DEFAULT_AI_OPTIONS,humanColor:'W' as const};const s=start();expect(humanMove(s,options,{row:1,col:1}).ok).toBe(false);
    expect(makeAiMoveRequest(s.game!,'W','challenge','white-user').aiColor).toBe('B');const next=unwrap(applyAiMove(s,options,move({row:0,col:0},'B')));expect(next.game!.toPlay).toBe('W');
  });
  it('capture, one-step and round undo/redo restore prisoners, ko history and branch truncation',()=>{
    let game=start().game!;
    // Independently specified corner capture: W A5 has B B5 and B A4 on its only two liberties.
    for(const m of [{color:'B' as const,at:{row:0,col:1}},{color:'W' as const,at:{row:0,col:0}},{color:'B' as const,at:{row:1,col:0}}])game=unwrap(rulesEngine.tryMove(game,{type:'place',...m})).nextState;
    let match=unwrap(restoreFullGame(game));expect(game.captures.B).toBe(1);match=unwrap(applyAiMove(match,DEFAULT_AI_OPTIONS,move(null)));
    const undone=unwrap(travelAiHistory(match,DEFAULT_AI_OPTIONS,'undo',true));expect(undone.game!.moves).toHaveLength(2);expect(undone.game!.captures.B).toBe(0);expect(undone.game!.board[0][0]).toBe('W');expect(undone.game!.history.layouts).toHaveLength(3);
    const redone=unwrap(travelAiHistory(undone,DEFAULT_AI_OPTIONS,'redo',true));expect(redone.game!.board).toEqual(match.game!.board);expect(redone.game!.history).toEqual(match.game!.history);expect(redone.game!.captures.B).toBe(1);
    const branch=unwrap(humanMove(undone,DEFAULT_AI_OPTIONS,{row:2,col:2}));expect(branch.game!.redoStack).toHaveLength(0);
  });
  it('two actual passes enter manual confirmation; changes reset consent; dispute keeps original board and history',()=>{
    let m=unwrap(humanMove(start(),DEFAULT_AI_OPTIONS,{row:2,col:2}));m=unwrap(applyAiMove(m,DEFAULT_AI_OPTIONS,move({row:4,col:4})));m=unwrap(humanMove(m,DEFAULT_AI_OPTIONS,null));m=unwrap(applyAiMove(m,DEFAULT_AI_OPTIONS,move(null)));
    const original=m.game!;expect(original.phase).toBe('scoring');expect(applyAiMove(m,DEFAULT_AI_OPTIONS,move(null)).ok).toBe(false);
    m=unwrap(confirmScoreFor(m,'B'));m=unwrap(toggleDeadGroup(m,{row:2,col:2}));expect(m.scoring.confirmedBy).toEqual([]);expect(m.game!.board).toEqual(original.board);
    const resumed=unwrap(resumeDisputedPlay(m,'B'));expect(resumed.game!.board).toEqual(original.board);expect(resumed.game!.history).toEqual(original.history);expect(resumed.game!.consecutivePasses).toBe(0);
  });
  it('confirmed empty board is a draw; undo restores scoring; ordinary review remains postgame-only',()=>{
    let m=unwrap(humanMove(start(),DEFAULT_AI_OPTIONS,null));m=unwrap(applyAiMove(m,DEFAULT_AI_OPTIONS,move(null)));m=unwrap(confirmScoreFor(unwrap(confirmScoreFor(m,'B')),'W'));
    expect(m.game!.result).toMatchObject({reason:'area',score:{winner:'draw',blackTotal:0,whiteTotal:0}});expect(unwrap(travelAiHistory(m,DEFAULT_AI_OPTIONS,'undo')).game!.phase).toBe('scoring');
  });
  it('three documented budgets are distinct and capped',()=>{expect(Object.values(AI_DIFFICULTIES).map(p=>p.visits)).toEqual([8,24,64]);});
});

describe('independent AI session persistence and safe import',()=>{
  it('published additive schema accepts playing and confirmed exports and rejects malformed identities',()=>{
    const ajv=new Ajv({allErrors:true,strict:false});ajv.addSchema(contentSchema);const valid=ajv.compile(aiSchema);
    let m=start();expect(valid(JSON.parse(aiSessionJson(m,DEFAULT_AI_OPTIONS)))).toBe(true);
    m=unwrap(humanMove(m,DEFAULT_AI_OPTIONS,null));m=unwrap(applyAiMove(m,DEFAULT_AI_OPTIONS,move(null)));m=unwrap(confirmScoreFor(unwrap(confirmScoreFor(m,'B')),'W'));
    const d=JSON.parse(aiSessionJson(m,DEFAULT_AI_OPTIONS));expect(valid(d),JSON.stringify(valid.errors)).toBe(true);expect(valid({...d,rulesetId:'other-rules'})).toBe(false);
  });
  const memory=()=>{const data=new Map<string,string>([['go-club:v1:LOCAL-T08-FULL-GAME','human-save-sentinel']]);return {data,port:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}}};};
  it('saves selected colour/difficulty, undo/redo and pending annotations without touching the human save',()=>{
    const {data,port}=memory(),store=createAiSessionStore(port);let match=unwrap(humanMove(start(),DEFAULT_AI_OPTIONS,{row:2,col:2}));match=unwrap(applyAiMove(match,DEFAULT_AI_OPTIONS,move(null)));match=unwrap(humanMove(match,DEFAULT_AI_OPTIONS,null));match=unwrap(toggleDeadGroup(match,{row:2,col:2}));match=unwrap(confirmScoreFor(match,'B'));
    expect(store.save(match,DEFAULT_AI_OPTIONS)).toEqual({ok:true});const loaded=store.load();expect(loaded.ok&&loaded.match?.scoring).toEqual(match.scoring);expect(loaded.ok&&loaded.match?.game?.history).toEqual(match.game!.history);expect(data.get('go-club:v1:LOCAL-T08-FULL-GAME')).toBe('human-save-sentinel');expect(namespaceForKey(AI_SESSION_KEY)).toBe('games');
  });
  it('roundtrips all board sizes and revisions with a valid top-level identity',()=>{
    for(const size of [5,9,13,19] as const){const text=aiSessionJson(start(size),{humanColor:'W',difficulty:'relaxed'}),read=parseAiSession(text);expect(read.ok&&read.match?.game?.size).toBe(size);expect(read.ok&&read.options).toEqual({humanColor:'W',difficulty:'relaxed'});}
  });
  it.each(['revision','difficulty','captures','partial-group','coordinates'])('rejects forged %s without replacing existing records',kind=>{
    let m=unwrap(humanMove(start(),DEFAULT_AI_OPTIONS,{row:2,col:2}));m=unwrap(applyAiMove(m,DEFAULT_AI_OPTIONS,move({row:0,col:0})));m=unwrap(humanMove(m,DEFAULT_AI_OPTIONS,{row:2,col:3}));const d=JSON.parse(aiSessionJson(m,DEFAULT_AI_OPTIONS));
    if(kind==='revision')d.schemaVersion=2;if(kind==='difficulty')d.options.difficulty='9dan';if(kind==='captures')d.game.captures.B=99;if(kind==='partial-group')d.scoring.deadStones=[{row:2,col:2}];if(kind==='coordinates')d.scoring.deadStones=[{row:-1,col:0}];
    expect(parseAiSession(JSON.stringify(d)).ok).toBe(false);
  });
  it('write failure remains recoverable through a valid export',()=>{
    const match=start(),store=createAiSessionStore({getItem:()=>null,setItem:()=>{throw Error('quota');},removeItem:()=>{}});expect(store.save(match,DEFAULT_AI_OPTIONS).ok).toBe(false);expect(parseAiSession(aiSessionJson(match,DEFAULT_AI_OPTIONS)).ok).toBe(true);
  });
});

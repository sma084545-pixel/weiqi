import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {startGame,tryMove,undo,applyPass,resumePlay,serializeGame,restoreGame,createVerifiedGameStore,MAX_GAME_BYTES} from '../dist-engine/go-club-rules.mjs';
const value=r=>{if(!r.ok)assert.fail(JSON.stringify(r));return r.value;};
const started=performance.now();
const setup={schemaVersion:1,id:'DEV-T01-CAPACITY-POS',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size:19,stones:[],toPlay:'B',historyPolicy:'fresh-setup',history:null};
const start=()=>value(startGame(setup,{mode:'full-game',komi:0,gameId:'DEV-T01-CAPACITY-GAME'}));
let state=start(),seed=190019,accepted=0;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(let attempt=0;attempt<5000&&accepted<240;attempt++){const r=tryMove(state,{type:'place',color:state.toPlay,at:{row:Math.floor(random()*19),col:Math.floor(random()*19)}});if(r.ok){state=r.value.nextState;accepted++;}}
assert.equal(accepted,240);state=value(undo(value(undo(state))));const serialized=value(serializeGame(state));const bytes=Buffer.byteLength(serialized);assert(bytes>2_000_000&&bytes<MAX_GAME_BYTES);
assert.deepEqual(value(restoreGame(serialized)),state);
const map=new Map(),store=createVerifiedGameStore({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});
assert.equal(store.save(state).ok,true);assert.deepEqual(store.load(state.id),{ok:true,value:state});const original=map.get(`go-club:v1:${state.id}`);
// 700 cycles of two passes + resume are legal events and retain full snapshots.
// This is a capacity stress vector, not an actual club game or a long ko cycle.
let oversized=start();for(let i=0;i<700;i++){oversized=value(applyPass(oversized,'B')).nextState;oversized=value(applyPass(oversized,'W')).nextState;oversized=value(resumePlay(oversized,'B'));}
const exportResult=serializeGame(oversized);assert.deepEqual(exportResult,{ok:false,error:{code:'EXPORT_TOO_LARGE',field:'/'}});
const saveResult=store.save(oversized);assert.equal(saveResult.ok,false);assert.equal(saveResult.issues[0].code,'EXPORT_TOO_LARGE');assert.equal(map.get(`go-club:v1:${state.id}`),original);
const report={schemaVersion:1,id:'REPORT-T01-CAPACITY',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'DeveloperValidationReport',checkedAt:new Date().toISOString(),method:'Built standalone ESM; seeded legal path and legal pass/resume capacity stress',humanReviewed:null,legalPlacements:240,currentMoves:state.moves.length,redoSnapshots:state.redoStack.length,serializedBytes:bytes,limitBytes:MAX_GAME_BYTES,roundTrip:'passed',verifiedStoreRoundTrip:'passed',oversizedEventCount:oversized.moves.length,oversizedExportCode:exportResult.error.code,oversizedSaveKeepsOldRecord:'passed',elapsedMilliseconds:Math.round(performance.now()-started),storage:'in-memory atomic StoragePort; not a browser quota measurement'};
mkdirSync('output/validation/T01',{recursive:true});writeFileSync('output/validation/T01/capacity-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));

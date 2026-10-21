import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as E from '../../../dist-engine/go-club-rules.mjs';
const root=new URL('../',import.meta.url);const meta=id=>({schemaVersion:1,id,revision:1,rulesetId:'GO-CLUB-AREA-1'});
const out=(p,x)=>fs.writeFileSync(new URL(p,root),JSON.stringify(x,null,2)+'\n');
const ok=r=>{assert.equal(r.ok,true,JSON.stringify(r));return r.value};
const logs=[];const check=(name,fn)=>{fn();logs.push({name,status:'PASS'})};
const demos={};
function pos(id,rows,toPlay='B'){const p={...meta(id),kind:'Position',size:rows.length,stones:rows.flatMap((s,row)=>[...s].flatMap((color,col)=>color==='.'?[]:[{row,col,color}])),toPlay,historyPolicy:'fresh-setup',history:null};ok(E.validateSetup(p));out('data/'+id+'.json',p);demos[id]={position:p,rows};return p}
function state(p,mode='full-game'){return ok(E.startGame(p,{mode,komi:0,gameId:p.id+'-GAME'}))}
function move(s,row,col){return E.tryMove(s,{type:'place',color:s.toPlay,at:{row,col}})}
function after(id,s){return pos(id,s.board.map(r=>r.map(x=>x??'.').join('')),s.toPlay)}
let p=pos('RULE-DEMO-T20-CONNECT',['.....','.BB..','...B.','.....','.....']);
check('正交两子相连，斜邻第三子不相连',()=>{assert.equal(ok(E.getGroup(state(p).board,{row:1,col:1})).stones.length,2);assert.equal(ok(E.getGroup(state(p).board,{row:2,col:3})).stones.length,1)});
p=pos('RULE-DEMO-T20-LIBERTY',['.....','.BB..','.B...','.....','.....']);
const libs=ok(E.getLiberties(state(p).board,{row:1,col:1}));demos[p.id].liberties=libs;check('L形三子7气，共享C3只计一次',()=>{assert.equal(libs.length,7);assert.equal(libs.filter(x=>x.row===2&&x.col===2).length,1)});
p=pos('RULE-DEMO-T20-CAPTURE-BEFORE',['.....','..B..','.BW..','..B..','.....']);
let s=state(p);check('白C3恰好一气D3',()=>assert.deepEqual(ok(E.getLiberties(s.board,{row:2,col:2})),[{row:2,col:3}]));
let t=ok(move(s,2,3));after('RULE-DEMO-T20-CAPTURE-AFTER',t.nextState);check('黑D3提白C3，输入不变',()=>{assert.deepEqual(t.event.captured,[{row:2,col:2}]);assert.equal(s.board[2][2],'W')});
p=pos('RULE-DEMO-T20-LEGAL-BEFORE',['.WB..','WB...','B....','.....','.....']);s=state(p);t=ok(move(s,0,0));after('RULE-DEMO-T20-LEGAL-AFTER',t.nextState);check('黑A5先提两白获得两气，合法',()=>{assert.equal(t.event.captured.length,2);assert.equal(ok(E.getLiberties(t.nextState.board,{row:0,col:0})).length,2)});
p=pos('RULE-DEMO-T20-KO-BEFORE',['.....','..BW.','.BW.W','..BW.','.....']);s=state(p);t=ok(move(s,2,3));after('RULE-DEMO-T20-KO-AFTER',t.nextState);
check('黑D3提白C3；白C3立即回提返回SUPERKO',()=>{assert.equal(t.event.captured.length,1);assert.equal(move(t.nextState,2,2).error.code,'SUPERKO')});
check('两停与争议恢复不清劫史，保持轮次',()=>{const a=ok(E.applyPass(t.nextState,'W')).nextState;const b=ok(E.applyPass(a,'B')).nextState;const c=ok(E.resumePlay(b,'W'));assert.deepEqual(c.history,t.nextState.history);assert.equal(c.toPlay,'W');assert.equal(c.consecutivePasses,0);assert.equal(move(c,2,2).error.code,'SUPERKO')});
p=pos('RULE-DEMO-T20-SCORE',['BB.BB','BBBBB','.....','WWWWW','WW.WW']);
const neutral=Array.from({length:5},(_,col)=>({row:2,col}));
const score=k=>ok(E.scoreArea({board:state(p).board,komi:k,agreement:{deadStones:[],neutralPoints:neutral,confirmedBy:[]},basis:'teaching-assumption',assumptions:['完整5路教学假设：所有盘上棋子按活子计，无死子，A3-E3中立；不证明此形自然终局或无条件活。']}));
check('手算9+1对9+1+0，5中立，25点完整覆盖',()=>{let r=score(0);assert.equal(r.blackStones,9);assert.equal(r.whiteStones,9);assert.deepEqual(r.blackTerritory,[{row:0,col:2}]);assert.deepEqual(r.whiteTerritory,[{row:4,col:2}]);assert.equal(r.neutralPoints.length,5);assert.equal(r.blackTotal,10);assert.equal(r.whiteTotal,10);assert.equal(r.winner,'draw');assert.equal(score(.5).whiteTotal,10.5)});demos[p.id].score=score(0);
check('吃子小游戏首提结束，连续两停无胜者',()=>{let cap=state(demos['RULE-DEMO-T20-CAPTURE-BEFORE'].position,'capture-first');let won=ok(move(cap,2,3)).nextState;assert.equal(won.phase,'finished');assert.equal(won.result.winner,'B');let a=ok(E.applyPass(cap,'B')).nextState;let b=ok(E.applyPass(a,'W')).nextState;assert.equal(b.phase,'finished');assert.equal(b.result.winner,null)});
out('data/diagram-index.json',{...meta('RULE-DEMO-T20-INDEX'),kind:'T20DiagramIndex',extensionScope:'materials-only; not ContentBundle',demos});
out('validation/engine-checks.json',{...meta('T20-ENGINE-CHECKS'),engineVersion:'0.2.0',checks:logs});console.log(JSON.stringify(logs,null,2));

import {afterEach,describe,expect,it} from 'vitest';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import WebSocket from 'ws';
import {createOnlineServer} from '../../server/http';
import {fileRoomRepository,type RoomRepository} from '../../server/rooms';
import {compactGame,readClientMessage,replayOnlineGame,type PublicRoom,type ServerMessage} from '../../src/features/online-game/protocol';
import {game,place} from '../t01/helpers';

let sequence=0;
const disposals:(()=>Promise<unknown>)[]=[];
afterEach(async()=>{for(const dispose of disposals.reverse())await dispose();disposals.length=0;});
async function setup(repository?:RoomRepository,filename?:string){
  const dir=await mkdtemp(join(tmpdir(),'go-online-test-'));disposals.push(()=>rm(dir,{recursive:true,force:true}));
  const repo=repository??fileRoomRepository(filename??join(dir,'rooms.json'));
  const app=await createOnlineServer({distDir:dir,repository:repo}),port=await app.listen(0);disposals.push(()=>app.close());
  return {app,url:`http://127.0.0.1:${port}`,file:filename??join(dir,'rooms.json'),repo};
}
async function peer(url:string){
  const socket=new WebSocket(url.replace('http:','ws:')+'/api/online/ws',{origin:url}),messages:ServerMessage[]=[],waiters:{test:(message:ServerMessage)=>boolean;resolve:(message:ServerMessage)=>void}[]=[];
  let room:PublicRoom|null=null;
  socket.on('error',()=>{});
  socket.on('message',data=>{const message=JSON.parse(data.toString()) as ServerMessage;if('room' in message&&message.room)room=message.room;const i=waiters.findIndex(waiter=>waiter.test(message));if(i>=0)waiters.splice(i,1)[0].resolve(message);else messages.push(message);});
  const wait=(test:(message:ServerMessage)=>boolean):Promise<any>=>{const i=messages.findIndex(test);if(i>=0)return Promise.resolve(messages.splice(i,1)[0]);return new Promise((accept,reject)=>{const timer=setTimeout(()=>reject(Error('Expected server packet did not arrive')),10000);waiters.push({test,resolve:message=>{clearTimeout(timer);accept(message);}});});};
  const send=(intent:Record<string,unknown>)=>{const requestId=`test-${++sequence}`;socket.send(JSON.stringify({protocolVersion:1,requestId,...intent}));return requestId;};
  const request=async(intent:Record<string,unknown>)=>{const id=send(intent);return wait(message=>'requestId' in message&&message.requestId===id);};
  const act=(action:Record<string,unknown>)=>request({type:'act',version:room!.revision,action});
  await wait(message=>message.type==='hello');disposals.push(async()=>{socket.terminate();});
  return {socket,wait,send,request,act,get room(){return room!;}};
}
async function pair(url:string){const black=await peer(url),created=await black.request({type:'create',nickname:'TEST 黑',size:5,komi:0});expect(created.type).toBe('joined');const white=await peer(url),joined=await white.request({type:'join',nickname:'TEST 白',code:created.room.code});expect(joined.type).toBe('joined');await black.wait(message=>message.type==='state'&&message.room.players.W?.connected===true);return {black,white,blackSeat:created.membership,whiteSeat:joined.membership,code:created.room.code};}
const point=(row:number,col:number)=>({type:'place',at:{row,col}});

describe('online protocol and independent replay',()=>{
  it('rejects extra board/color claims and unknown versions before handling',()=>{
    for(const packet of [{protocolVersion:2,type:'sync',requestId:'x'},{protocolVersion:1,type:'act',requestId:'x',version:1,action:{type:'place',at:{row:0,col:0},color:'W'}},{protocolVersion:1,type:'create',requestId:'x',nickname:'x',size:7,komi:0}])expect(()=>readClientMessage(packet)).toThrow();
  });
  it('replays captures and undo branches; external declared winner/counters do not become facts',()=>{
    const initial=game(5),one=place(initial,1,0),two=place(one,0,0),three=place(two,0,1);
    const first=replayOnlineGame(compactGame(one));const final=replayOnlineGame({...compactGame(three),winner:'W',captures:{B:900,W:900}},first);
    expect(final.board[0][0]).toBeNull();expect(final.captures).toEqual({B:1,W:0});expect(final.result).toBeNull();
    const back=replayOnlineGame(compactGame(two),final);expect(back.board[0][0]).toBe('W');expect(back.captures.B).toBe(0);
    const branch=replayOnlineGame(compactGame(place(two,4,4)),back);expect(branch.board[0][1]).toBeNull();expect(branch.board[4][4]).toBe('B');expect(branch.redoStack).toHaveLength(0);
    expect(()=>replayOnlineGame({...compactGame(initial),events:[{type:'place',color:'W',at:{row:0,col:0}}]})).toThrow();
  });
});

it('two seats alternate, capture once, reject suicide/wrong role/stale/duplicate packets, and keep a third party out',async()=>{
  const {url,file}=await setup(),{black,white,blackSeat,whiteSeat,code}=await pair(url);
  expect((await white.act(point(0,0))).code).toBe('NOT_YOUR_TURN');
  expect((await black.act(point(1,0))).type).toBe('state');await white.wait(message=>message.type==='state'&&message.room.record.events.length===1);
  await white.act(point(0,0));await black.wait(message=>message.type==='state'&&message.room.record.events.length===2);
  const before=black.room.revision,id=black.send({type:'act',version:before,action:point(0,1)});const captured=await black.wait(message=>'requestId' in message&&message.requestId===id);await white.wait(message=>message.type==='state'&&message.room.record.events.length===3);
  const state=replayOnlineGame(captured.room.record);expect(state.captures.B).toBe(1);expect(state.board[0][0]).toBeNull();expect(state.phase).toBe('playing');
  black.socket.send(JSON.stringify({protocolVersion:1,type:'act',requestId:id,version:before,action:point(0,1)}));const duplicate=await black.wait(message=>'requestId' in message&&message.requestId===id);expect(duplicate.room.revision).toBe(captured.room.revision);expect(duplicate.room.record.events).toHaveLength(3);
  expect((await white.act(point(0,0))).code).toBe('SUICIDE');expect((await black.act(point(4,4))).code).toBe('NOT_YOUR_TURN');
  expect((await white.request({type:'act',version:before,action:point(4,4)})).code).toBe('STALE_STATE');
  const outsider=await peer(url);const denied=await outsider.request({type:'join',nickname:'TEST 第三人',code});expect(denied.code).toBe('ROOM_FULL');expect(denied.room).toBeUndefined();
  expect((await outsider.request({type:'resume',code,token:'x'.repeat(43)})).code).toBe('ROOM_AUTH_FAILED');
  const saved=await readFile(file,'utf8');expect(saved).not.toContain(blackSeat.token);expect(saved).not.toContain(whiteSeat.token);expect(saved).toContain('tokenHash');
},60000);

it('mutual undo preserves refusal, blocks intervening play, restores captured stones and branches cleanly',async()=>{
  const {url}=await setup(),{black,white}=await pair(url);
  await black.act(point(1,0));await white.wait(message=>message.type==='state'&&message.room.record.events.length===1);await white.act(point(0,0));await black.wait(message=>message.type==='state'&&message.room.record.events.length===2);await black.act(point(0,1));await white.wait(message=>message.type==='state'&&message.room.record.events.length===3);
  await black.act({type:'request-undo'});await white.wait(message=>message.type==='state'&&message.room.undoRequest!==null);expect((await white.act(point(4,4))).code).toBe('UNDO_PENDING');
  await white.act({type:'reject-undo'});await black.wait(message=>message.type==='state'&&message.room.undoRequest===null&&message.room.record.events.length===3);expect(replayOnlineGame(black.room.record).board[0][0]).toBeNull();
  await white.act({type:'request-undo'});await black.wait(message=>message.type==='state'&&message.room.undoRequest!==null);await black.act({type:'confirm-undo'});await white.wait(message=>message.type==='state'&&message.room.undoRequest?.confirmations.length===1);await white.act({type:'confirm-undo'});await black.wait(message=>message.type==='state'&&message.room.record.events.length===2&&message.room.undoRequest===null);
  const restored=replayOnlineGame(black.room.record);expect(restored.board[0][0]).toBe('W');expect(restored.toPlay).toBe('B');expect(restored.captures.B).toBe(0);
  await black.act(point(4,4));const branch=replayOnlineGame(black.room.record);expect(branch.board[0][1]).toBeNull();expect(branch.board[4][4]).toBe('B');expect(branch.redoStack).toHaveLength(0);
},60000);

it('two passes, changed dead marks, ordered role confirmations and dispute restoration use the shared full-game model',async()=>{
  const {url}=await setup(),{black,white}=await pair(url);
  await black.act(point(0,0));await white.wait(message=>message.type==='state'&&message.room.record.events.length===1);await white.act(point(4,4));await black.wait(message=>message.type==='state'&&message.room.record.events.length===2);
  await black.act({type:'pass'});await white.wait(message=>message.type==='state'&&message.room.record.events.length===3);await white.act({type:'pass'});await black.wait(message=>message.type==='state'&&message.room.record.events.length===4);
  expect(replayOnlineGame(black.room.record).phase).toBe('scoring');expect((await white.act({type:'confirm-score'})).code).toBe('SCORE_CONFIRMATION_ORDER');
  await black.act({type:'confirm-score'});await white.wait(message=>message.type==='state'&&message.room.scoring.confirmedBy.length===1);await white.act({type:'toggle-dead',at:{row:0,col:0}});await black.wait(message=>message.type==='state'&&message.room.scoring.deadStones.length===1);expect(black.room.scoring.confirmedBy).toEqual([]);
  await white.act({type:'resume-play'});await black.wait(message=>message.type==='state'&&message.room.record.events.length===5);const resumed=replayOnlineGame(black.room.record);expect(resumed.phase).toBe('playing');expect(resumed.consecutivePasses).toBe(0);expect(resumed.history.layouts).toHaveLength(3);expect(resumed.board[0][0]).toBe('B');
  await black.act({type:'pass'});await white.wait(message=>message.type==='state'&&message.room.record.events.length===6);await white.act({type:'pass'});await black.wait(message=>message.type==='state'&&message.room.record.events.length===7);
  await black.act({type:'toggle-dead',at:{row:0,col:0}});await white.wait(message=>message.type==='state'&&message.room.scoring.deadStones.length===1);await black.act({type:'confirm-score'});await white.wait(message=>message.type==='state'&&message.room.scoring.confirmedBy.length===1);await white.act({type:'confirm-score'});await black.wait(message=>message.type==='state'&&message.room.record.events.length===8);
  const final=replayOnlineGame(black.room.record);expect(final.result?.reason).toBe('area');if(final.result?.reason==='area')expect(final.result.score).toMatchObject({blackTotal:0,whiteTotal:25,winner:'W'});expect(final.board[0][0]).toBe('B');expect((await black.act(point(2,2))).code).toBe('GAME_NOT_PLAYING');
},60000);

it('reconnect survives server restart and disconnect never manufactures a win',async()=>{
  const {app,url,file,repo}=await setup(),{black,white,blackSeat,whiteSeat}=await pair(url);
  await black.act(point(0,0));await white.wait(message=>message.type==='state'&&message.room.record.events.length===1);white.socket.close();await black.wait(message=>message.type==='state'&&message.room.players.W?.connected===false);
  expect((await black.act(point(0,1))).code).toBe('PEER_OFFLINE');expect(replayOnlineGame(black.room.record).result).toBeNull();
  await app.close();const restarted=await createOnlineServer({distDir:join(file,'..'),repository:repo}),port=await restarted.listen(0);disposals.push(()=>restarted.close());
  const b=await peer(`http://127.0.0.1:${port}`),w=await peer(`http://127.0.0.1:${port}`);await b.request({type:'resume',code:blackSeat.code,token:blackSeat.token});const recovered=await w.request({type:'resume',code:whiteSeat.code,token:whiteSeat.token});
  expect(recovered.membership.color).toBe('W');expect(replayOnlineGame(recovered.room.record).board[0][0]).toBe('B');expect(replayOnlineGame(recovered.room.record).toPlay).toBe('W');
  await b.wait(message=>message.type==='state'&&message.room.players.W?.connected===true);await w.act(point(4,4));expect(replayOnlineGame(w.room.record).board[4][4]).toBe('W');
},60000);

it('failed writes leave the authoritative game unchanged and a damaged store is not deleted',async()=>{
  let saved:unknown[]=[],fail=false;const repo:RoomRepository={load:async()=>saved,save:async value=>{if(fail)throw Error('injected write failure');saved=structuredClone(value);}};
  const {url}=await setup(repo),{black,white}=await pair(url),revision=black.room.revision;fail=true;expect((await black.act(point(0,0))).code).toBe('SAVE_FAILED');expect(black.room.revision).toBe(revision);expect(replayOnlineGame(black.room.record).moves).toHaveLength(0);fail=false;
  await black.act(point(0,0));await white.wait(message=>message.type==='state'&&message.room.record.events.length===1);
  const dir=await mkdtemp(join(tmpdir(),'go-bad-store-'));disposals.push(()=>rm(dir,{recursive:true,force:true}));const filename=join(dir,'rooms.json');await writeFile(filename,'{"schemaVersion":999}');await expect(fileRoomRepository(filename).load()).rejects.toThrow();expect(await readFile(filename,'utf8')).toBe('{"schemaVersion":999}');
},60000);

it('rejects cross-origin upgrades and keeps private files outside the static root',async()=>{
  const {url}=await setup();const status=await new Promise<number>((accept,reject)=>{const socket=new WebSocket(url.replace('http:','ws:')+'/api/online/ws',{origin:'https://other.example'});socket.on('error',()=>{});socket.on('unexpected-response',(_,response)=>{accept(response.statusCode!);response.resume();socket.terminate();});socket.on('open',()=>{socket.terminate();reject(Error('cross-origin upgrade was accepted'));});});expect(status).toBe(403);
  const response=await fetch(url+'/.env');expect(response.status).toBe(404);
},60000);

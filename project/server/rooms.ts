import {APP_VERSION} from '../src/core/version';
import {randomBytes,randomInt,createHash,timingSafeEqual} from 'node:crypto';
import {readFile,mkdir,writeFile,rename,unlink} from 'node:fs/promises';
import {dirname} from 'node:path';
import WebSocket from 'ws';
import type {Color,GameState,Size} from '../src/core/content.generated';
import {RULE_ERROR_ZH,rulesEngine} from '../src/core/rules';
import {createFullGameMatch,playAt,passTurn,resignGame,toggleDeadGroup,confirmScoreFor,resumeDisputedPlay,requestUndo,confirmUndo,refuseUndo,type FullGameMatch,type FullGameFlowResult} from '../src/features/full-game/model';
import {compactGame,replayOnlineGame,readClientMessage,validatePublicRoom,ROOM_CODE,CHAT_HISTORY_LIMIT,type RoomChatSnapshot,type ClientMessage,type PublicRoom,type ServerMessage} from '../src/features/online-game/protocol';

interface Seat {nickname:string;tokenHash:string;recentRequests:string[]}
interface Room {code:string;version:number;match:FullGameMatch;players:Record<Color,Seat|null>;lastActive:number}
type SavedRoom=Omit<PublicRoom,'players'>&{players:Record<Color,Seat|null>;lastActive:number};
export interface RoomRepository {load():Promise<unknown[]>;save(rooms:unknown[]):Promise<void>}
const hash=(token:string)=>createHash('sha256').update(token).digest('hex');
const sameHash=(left:string,right:string)=>/^[a-f0-9]{64}$/.test(left)&&/^[a-f0-9]{64}$/.test(right)&&timingSafeEqual(Buffer.from(left,'hex'),Buffer.from(right,'hex'));
const label=(color:Color)=>color==='B'?'黑方':'白方';
const messages:Record<string,string>={BAD_MESSAGE:'消息格式不受支持，请更新页面后重试。',BAD_NICKNAME:'昵称最多32字，请勿填写真实姓名或联系方式。',BAD_SETTINGS:'请选择5、9、13或19路，并填写有效贴目。',BAD_ROOM_CODE:'请输入完整的8位房间码。',ROOM_NOT_FOUND:'没有找到这个房间；请核对房间码，或重新创建。',ROOM_FULL:'这个房间已有两位伙伴，不能再占用座位。',ROOM_AUTH_FAILED:'无法恢复这个座位，请使用原来的页面或重新创建房间。',ALREADY_IN_ROOM:'请先返回大厅，再创建或加入其他房间。',NOT_IN_ROOM:'请先创建或加入房间。',WAIT_FOR_PARTNER:'等待另一位伙伴加入并连接后再操作。',PEER_OFFLINE:'对方暂时断线，棋局已保留；重新连接后继续，不判负。',STALE_STATE:'棋局刚刚更新，已同步当前局面，请重新确认操作。',UNDO_PENDING:'正在等待双方确认悔棋，请先确认或拒绝。',ROOM_CAPACITY:'本局记录达到服务容量，请先导出对局，再创建新房间。',SERVER_CAPACITY:'当前房间较多，请稍后再试。',SAVE_FAILED:'服务器暂时无法保存，本次操作没有提交。请先导出当前棋局并稍后重试。',NOT_A_STONE:'这里是空点；请点一颗棋子来标记整块。',SCORE_CONFIRMATION_ORDER:'请先由黑方确认，再由白方确认同一份清单。',UNDO_CONFIRMATION_ORDER:'请先由黑方确认悔棋，再由白方确认。',NO_MOVE_TO_UNDO:'当前还没有可以撤回的操作。',UNDO_NOT_REQUESTED:'目前没有待确认的悔棋申请。',RATE_LIMIT:'操作过于密集，已暂停连接；请稍后重连。'};

export function fileRoomRepository(filename:string):RoomRepository {
  let revision=0;
  return {
    async load(){
      let text:string;try{text=await readFile(filename,'utf8');}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return [];throw error;}
      const data=JSON.parse(text);if(data.schemaVersion!==1||data.kind!=='OnlineRoomStore'||data.rulesetId!=='GO-CLUB-AREA-1'||data.id!=='LOCAL-ONLINE-ROOMS'||!Array.isArray(data.rooms)||!Number.isSafeInteger(data.revision)||data.revision<1)throw Error('ROOM_STORE_INVALID: preserve the original file and restore a backup.');
      revision=data.revision;return data.rooms;
    },
    async save(rooms){
      await mkdir(dirname(filename),{recursive:true,mode:0o700});
      const temp=`${filename}.${randomBytes(6).toString('hex')}.tmp`;
      try{await writeFile(temp,JSON.stringify({schemaVersion:1,id:'LOCAL-ONLINE-ROOMS',revision:revision+1,rulesetId:'GO-CLUB-AREA-1',kind:'OnlineRoomStore',rooms}),{encoding:'utf8',mode:0o600,flush:true});await rename(temp,filename);revision++;}
      catch(error){await unlink(temp).catch(()=>{});throw error;}
    },
  };
}

/** One serialized transaction queue, one authoritative shared T01/T08 match per room. */
export class RoomHub {
  private rooms=new Map<string,Room>();
  private sockets=new Map<string,Map<Color,WebSocket>>();
  private memberships=new Map<WebSocket,{code:string;color:Color;token:string}>();
  private chats=new Map<string,{snapshot:RoomChatSnapshot;seen:Record<Color,string[]>;sent:Record<Color,number[]>}>();
  private chatSubscribers=new WeakSet<WebSocket>();
  private queue:Promise<void>=Promise.resolve();
  constructor(private repository:RoomRepository,private maxRooms=100,private idleMs=24*60*60*1000,private shareUrl?:string){}
  async load(){
    for(const item of await this.repository.load()){
      const saved=item as SavedRoom;
      if(!saved||typeof saved.code!=='string'||!ROOM_CODE.test(saved.code)||!Number.isFinite(saved.lastActive)||!saved.players?.B)throw Error('ROOM_STORE_INVALID');
      for(const color of ['B','W'] as const){const seat=saved.players[color];if(seat&&(!/^[a-f0-9]{64}$/.test(seat.tokenHash)||typeof seat.nickname!=='string'||seat.nickname.length>32||!Array.isArray(seat.recentRequests)||seat.recentRequests.length>64||seat.recentRequests.some(id=>typeof id!=='string'||id.length>80)))throw Error('ROOM_STORE_INVALID');}
      const pub=validatePublicRoom({...saved,players:{B:{nickname:saved.players.B.nickname,connected:false},W:saved.players.W?{nickname:saved.players.W.nickname,connected:false}:null}});
      const replayed=replayOnlineGame(pub.record),restored=rulesEngine.restoreGame({...replayed,revision:pub.record.revision});if(!restored.ok)throw Error('ROOM_STORE_INVALID');const game=restored.value,dead=new Set(pub.scoring.deadStones.map(at=>`${at.row},${at.col}`));
      if(dead.size!==pub.scoring.deadStones.length)throw Error('ROOM_STORE_INVALID');
      for(const at of pub.scoring.deadStones){const group=rulesEngine.getGroup(game.board,at);if(!group.ok||!group.value||group.value.stones.some(point=>!dead.has(`${point.row},${point.col}`)))throw Error('ROOM_STORE_INVALID');}
      if(game.phase==='playing'&&(dead.size||pub.scoring.confirmedBy.length))throw Error('ROOM_STORE_INVALID');
      if(game.phase==='scoring'&&pub.scoring.confirmedBy.length>1)throw Error('ROOM_STORE_INVALID');
      if(pub.undoRequest&&(!game.moves.length||pub.undoRequest.confirmations.length>1))throw Error('ROOM_STORE_INVALID');
      const match:FullGameMatch={...createFullGameMatch({size:game.size,komi:game.komi,kind:'empty',handicapStones:[]}),game,scoring:pub.scoring,undoRequest:pub.undoRequest?{...pub.undoRequest,requestedAtRevision:game.revision}:null,message:'棋局已从服务器保存的合法记录恢复，等待双方重新连接。'};
      if(this.rooms.has(saved.code)||this.rooms.size>=this.maxRooms)throw Error('ROOM_STORE_INVALID');
      this.rooms.set(saved.code,{code:saved.code,version:saved.revision,match,players:saved.players,lastActive:saved.lastActive});
    }
  }
  private send(socket:WebSocket,message:ServerMessage){if(socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify(message));}
  private present(room:Room,color:Color){return this.sockets.get(room.code)?.get(color)?.readyState===WebSocket.OPEN;}
  private publicRoom(room:Room):PublicRoom{return {schemaVersion:1,id:`ONLINE-ROOM-${room.code}`,revision:room.version,rulesetId:'GO-CLUB-AREA-1',kind:'OnlineRoomSnapshot',protocolVersion:1,code:room.code,record:compactGame(room.match.game!),scoring:room.match.scoring,undoRequest:room.match.undoRequest,players:{B:room.players.B?{nickname:room.players.B.nickname,connected:this.present(room,'B')}:null,W:room.players.W?{nickname:room.players.W.nickname,connected:this.present(room,'W')}:null},message:room.match.message};}
  private saved(room:Room):SavedRoom{return {...this.publicRoom(room),players:room.players,lastActive:room.lastActive};}
  private async commit(next:Room){const all=[...this.rooms.values()].filter(room=>room.code!==next.code);await this.repository.save([...all,next].map(room=>this.saved(room)));this.rooms.set(next.code,next);}
  private state(socket:WebSocket,room:Room,requestId?:string){this.send(socket,{protocolVersion:1,type:'state',room:this.publicRoom(room),requestId});}
  private broadcast(room:Room,requestId?:string){for(const socket of this.sockets.get(room.code)?.values()??[])this.state(socket,room,requestId);}
  private error(socket:WebSocket,code:string,requestId?:string,room?:Room){this.send(socket,{protocolVersion:1,type:'error',requestId,code,message:messages[code]??RULE_ERROR_ZH[code as keyof typeof RULE_ERROR_ZH]??'本次操作未完成，原棋局已保留。',room:room?this.publicRoom(room):undefined});}
  private bind(socket:WebSocket,room:Room,color:Color,token:string){
    const connections=this.sockets.get(room.code)??new Map<Color,WebSocket>(),old=connections.get(color);connections.set(color,socket);this.sockets.set(room.code,connections);this.memberships.set(socket,{code:room.code,color,token});room.lastActive=Date.now();
    if(old&&old!==socket){this.memberships.delete(old);old.close(4009,'SEAT_RECONNECTED');}
  }
  private detach(socket:WebSocket){this.chatSubscribers.delete(socket);const member=this.memberships.get(socket);if(!member)return;this.memberships.delete(socket);if(this.sockets.get(member.code)?.get(member.color)===socket)this.sockets.get(member.code)?.delete(member.color);const room=this.rooms.get(member.code);if(room){room.lastActive=Date.now();this.broadcast(room);}}
  attach(socket:WebSocket){
    this.send(socket,{protocolVersion:1,type:'hello',version:APP_VERSION,rulesetId:'GO-CLUB-AREA-1',shareUrl:this.shareUrl,capabilities:{roomChat:1}});
    let count=0,windowStart=Date.now();
    socket.on('error',()=>{});
    socket.on('message',(data,binary)=>{
      if(Date.now()-windowStart>1000){windowStart=Date.now();count=0;}
      if(++count>40){this.error(socket,'RATE_LIMIT');socket.close(1008,'RATE_LIMIT');return;}
      let message:ClientMessage;try{if(binary)throw Error('BAD_MESSAGE');message=readClientMessage(JSON.parse(data.toString()));}catch(error){if(this.chatSubscribers.has(socket))this.chatError(socket,(error as Error).message);else this.error(socket,(error as Error).message);return;}
      this.queue=this.queue.then(async()=>{if(socket.readyState===WebSocket.OPEN)await this.handle(socket,message);}).catch(()=>this.error(socket,'SAVE_FAILED',message.requestId));
    });
    socket.on('close',()=>{this.detach(socket);});
  }
  private chat(room:Room){
    let chat=this.chats.get(room.code);
    if(!chat){chat={snapshot:{schemaVersion:1,id:`ONLINE-CHAT-${room.code}`,revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'OnlineRoomChat',code:room.code,messages:[]},seen:{B:[],W:[]},sent:{B:[],W:[]}};this.chats.set(room.code,chat);}
    return chat;
  }
  private chatError(socket:WebSocket,code:string,requestId?:string){
    const text:Record<string,string>={CHAT_BAD_TEXT:'请输入1至500字的文字，请勿包含控制字符。',CHAT_NOT_ENABLED:'聊天尚未就绪，请重新连接房间。',CHAT_RATE_LIMIT:'消息发得有点快，请等几秒再发送。'};
    this.send(socket,{protocolVersion:1,type:'chat-error',requestId,code,message:text[code]??'聊天消息没有发送，请稍后重试；棋局不受影响。'});
  }
  private async handle(socket:WebSocket,message:ClientMessage){
    const member=this.memberships.get(socket);
    if(message.type==='create'||message.type==='join'||message.type==='resume'){
      if(member){this.error(socket,'ALREADY_IN_ROOM',message.requestId);return;}
      if(message.type==='create'){
        await this.expire();if(this.rooms.size>=this.maxRooms){this.error(socket,'SERVER_CAPACITY',message.requestId);return;}
        const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let code:string;do{code=Array.from({length:8},()=>alphabet[randomInt(alphabet.length)]).join('');}while(this.rooms.has(code));
        const token=randomBytes(32).toString('base64url');
        const start=rulesEngine.startGame({schemaVersion:1,id:`ONLINE-SETUP-${code}`,revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size:message.size as Size,toPlay:'B',stones:[],historyPolicy:'fresh-setup',history:null},{mode:'full-game',komi:message.komi,gameId:`ONLINE-GAME-${code}`});
        if(!start.ok){this.error(socket,start.error.code,message.requestId);return;}
        const room:Room={code,version:1,match:{...createFullGameMatch({size:message.size as Size,komi:message.komi,kind:'empty',handicapStones:[]}),game:start.value,message:'房间已创建，等待另一位伙伴加入。'},players:{B:{nickname:message.nickname.trim()||'伙伴 A',tokenHash:hash(token),recentRequests:[]},W:null},lastActive:Date.now()};
        await this.commit(room);this.bind(socket,room,'B',token);this.send(socket,{protocolVersion:1,type:'joined',requestId:message.requestId,membership:{code,token,color:'B'},room:this.publicRoom(room)});return;
      }
      const room=this.rooms.get(message.code);if(!room){this.error(socket,'ROOM_NOT_FOUND',message.requestId);return;}
      if(message.type==='join'){
        if(room.players.W){this.error(socket,'ROOM_FULL',message.requestId);return;}
        const token=randomBytes(32).toString('base64url'),next={...room,version:room.version+1,players:{...room.players,W:{nickname:message.nickname.trim()||'伙伴 B',tokenHash:hash(token),recentRequests:[]}},lastActive:Date.now(),match:{...room.match,message:'双方已连接，黑方先行。'}};
        await this.commit(next);this.bind(socket,next,'W',token);this.send(socket,{protocolVersion:1,type:'joined',requestId:message.requestId,membership:{code:room.code,token,color:'W'},room:this.publicRoom(next)});this.broadcast(next);return;
      }
      const color=(['B','W'] as Color[]).find(color=>room.players[color]&&sameHash(room.players[color]!.tokenHash,hash(message.token)));
      if(!color){this.error(socket,'ROOM_AUTH_FAILED',message.requestId);return;}
      this.bind(socket,room,color,message.token);this.send(socket,{protocolVersion:1,type:'joined',requestId:message.requestId,membership:{code:room.code,token:message.token,color},room:this.publicRoom(room)});this.broadcast(room);return;
    }
    if(!member){this.error(socket,'NOT_IN_ROOM',message.requestId);return;}
    const room=this.rooms.get(member.code);if(!room){this.error(socket,'ROOM_NOT_FOUND',message.requestId);return;}
    if(message.type==='enable-chat'){
      this.chatSubscribers.add(socket);this.send(socket,{protocolVersion:1,type:'chat-state',requestId:message.requestId,chat:this.chat(room).snapshot});return;
    }
    if(message.type==='chat-send'){
      if(!this.chatSubscribers.has(socket)){this.chatError(socket,'CHAT_NOT_ENABLED',message.requestId);return;}
      const chat=this.chat(room),now=Date.now();
      if(chat.seen[member.color].includes(message.requestId)){this.send(socket,{protocolVersion:1,type:'chat-state',requestId:message.requestId,chat:chat.snapshot});return;}
      const recent=chat.sent[member.color].filter(at=>now-at<3000);
      if(recent.length>=3){this.chatError(socket,'CHAT_RATE_LIMIT',message.requestId);return;}
      chat.sent[member.color]=[...recent,now];chat.seen[member.color]=[...chat.seen[member.color].slice(-63),message.requestId];
      const sequence=chat.snapshot.revision;
      chat.snapshot={...chat.snapshot,revision:sequence+1,messages:[...chat.snapshot.messages,{id:`${room.code}-${sequence}`,sequence,color:member.color,nickname:room.players[member.color]!.nickname,text:message.text.replace(/\r\n/g,'\n').trim(),sentAt:new Date(now).toISOString()}].slice(-CHAT_HISTORY_LIMIT)};
      room.lastActive=now;
      for(const peer of this.sockets.get(room.code)?.values()??[])if(this.chatSubscribers.has(peer))this.send(peer,{protocolVersion:1,type:'chat-state',requestId:peer===socket?message.requestId:undefined,chat:chat.snapshot});
      return;
    }
    if(message.type==='leave'){this.detach(socket);this.send(socket,{protocolVersion:1,type:'left',requestId:message.requestId});return;}
    if(message.type==='sync'){this.state(socket,room,message.requestId);return;}
    if(message.type!=='act')return;
    const seat=room.players[member.color]!;
    if(seat.recentRequests.includes(message.requestId)){this.state(socket,room,message.requestId);return;}
    if(message.version!==room.version){this.error(socket,'STALE_STATE',message.requestId,room);return;}
    if(!room.players.W){this.error(socket,'WAIT_FOR_PARTNER',message.requestId,room);return;}
    if(!this.present(room,'B')||!this.present(room,'W')){this.error(socket,'PEER_OFFLINE',message.requestId,room);return;}
    const action=message.action,match=room.match,game=match.game!;
    if(match.undoRequest&&!['confirm-undo','reject-undo'].includes(action.type)){this.error(socket,'UNDO_PENDING',message.requestId,room);return;}
    if(['place','pass','resign'].includes(action.type)&&game.toPlay!==member.color){this.error(socket,'NOT_YOUR_TURN',message.requestId,room);return;}
    if(game.moves.length>=2000&&!['request-undo','confirm-undo','reject-undo'].includes(action.type)){this.error(socket,'ROOM_CAPACITY',message.requestId,room);return;}
    let result:FullGameFlowResult;
    switch(action.type){
      case 'place':result=playAt(match,action.at);break;
      case 'pass':result=passTurn(match);break;
      case 'resign':result=resignGame(match);break;
      case 'toggle-dead':result=toggleDeadGroup(match,action.at);break;
      case 'confirm-score':result=confirmScoreFor(match,member.color);break;
      case 'resume-play':result=resumeDisputedPlay(match,member.color);break;
      case 'request-undo':result=requestUndo(match);if(result.ok)result.value.message=`${label(member.color)}申请悔棋，请黑白双方分别确认。`;break;
      case 'confirm-undo':result=confirmUndo(match,member.color);break;
      case 'reject-undo':result=match.undoRequest?{ok:true,value:refuseUndo(match)}:{ok:false,error:{code:'UNDO_NOT_REQUESTED'}};break;
      default:this.error(socket,'BAD_MESSAGE',message.requestId,room);return;
    }
    if(!result.ok){this.error(socket,result.error.code,message.requestId,room);return;}
    const next:Room={...room,version:room.version+1,match:result.value,lastActive:Date.now(),players:{...room.players,[member.color]:{...seat,recentRequests:[...seat.recentRequests.slice(-63),message.requestId]}}};
    await this.commit(next);this.broadcast(next,message.requestId);
  }
  async expire(){
    const expired=[...this.rooms.values()].filter(room=>!this.present(room,'B')&&!this.present(room,'W')&&Date.now()-room.lastActive>this.idleMs);
    if(!expired.length)return;const codes=new Set(expired.map(room=>room.code));await this.repository.save([...this.rooms.values()].filter(room=>!codes.has(room.code)).map(room=>this.saved(room)));for(const code of codes){this.rooms.delete(code);this.chats.delete(code);this.sockets.delete(code);}
  }
  async close(){for(const socket of this.memberships.keys())socket.close(1001,'SERVER_SHUTDOWN');await this.queue;}
}

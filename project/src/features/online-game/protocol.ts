import type {Color,Coord,GameEvent,GameState,Position} from '../../core/content.generated';
import {rulesEngine} from '../../core/rules';
import type {ScoringDraft,UndoRequest} from '../full-game/model';

export const ONLINE_PROTOCOL=1 as const;
export const ROOM_CODE=/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;
export type OnlineAction={type:'place';at:Coord}|{type:'toggle-dead';at:Coord}|{type:'pass'|'resign'|'confirm-score'|'resume-play'|'request-undo'|'confirm-undo'|'reject-undo'};
/** Compact transport record, distinct from exported content documents. Export GameState for T15. */
export interface OnlineGameRecord {
  schemaVersion:1;id:string;revision:number;rulesetId:'GO-CLUB-AREA-1';kind:'OnlineGameRecord';
  setup:Position;komi:number;events:GameEvent[];
}
export interface PublicRoom {
  schemaVersion:1;id:string;revision:number;rulesetId:'GO-CLUB-AREA-1';kind:'OnlineRoomSnapshot';
  protocolVersion:1;code:string;record:OnlineGameRecord;scoring:ScoringDraft;undoRequest:UndoRequest|null;
  players:Record<Color,{nickname:string;connected:boolean}|null>;message:string;
}
export const CHAT_LIMIT=500;
export const CHAT_HISTORY_LIMIT=50;
export interface RoomChatMessage {id:string;sequence:number;color:Color;nickname:string;text:string;sentAt:string}
/** Transient room transport; deliberately excluded from GameState and saved room files. */
export interface RoomChatSnapshot {schemaVersion:1;id:string;revision:number;rulesetId:'GO-CLUB-AREA-1';kind:'OnlineRoomChat';code:string;messages:RoomChatMessage[]}
export interface OnlineMembership {code:string;token:string;color:Color}
export type ClientMessage=
  |{protocolVersion:1;type:'create';requestId:string;nickname:string;size:number;komi:number}
  |{protocolVersion:1;type:'join';requestId:string;nickname:string;code:string}
  |{protocolVersion:1;type:'resume';requestId:string;code:string;token:string}
  |{protocolVersion:1;type:'act';requestId:string;version:number;action:OnlineAction}
  |{protocolVersion:1;type:'sync'|'leave'|'enable-chat';requestId:string}
  |{protocolVersion:1;type:'chat-send';requestId:string;text:string};
export type ServerMessage=
  |{protocolVersion:1;type:'hello';version:string;rulesetId:'GO-CLUB-AREA-1';shareUrl?:string;capabilities?:{roomChat?:1}}
  |{protocolVersion:1;type:'joined';requestId:string;membership:OnlineMembership;room:PublicRoom}
  |{protocolVersion:1;type:'state';requestId?:string;room:PublicRoom}
  |{protocolVersion:1;type:'left';requestId:string}
  |{protocolVersion:1;type:'chat-state';requestId?:string;chat:RoomChatSnapshot}
  |{protocolVersion:1;type:'chat-error';requestId?:string;code:string;message:string}
  |{protocolVersion:1;type:'error';requestId?:string;code:string;message:string;room?:PublicRoom};

export const compactGame=(game:GameState):OnlineGameRecord=>({schemaVersion:1,id:game.id,revision:game.revision,rulesetId:game.rulesetId,kind:'OnlineGameRecord',setup:game.setup,komi:game.komi,events:game.moves});
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const coords=(value:unknown):value is Coord[]=>Array.isArray(value)&&value.every(at=>object(at)&&Number.isInteger(at.row)&&Number.isInteger(at.col));
const votes=(value:unknown):value is Color[]=>Array.isArray(value)&&JSON.stringify(value)===JSON.stringify(value.length===0?[]:value.length===1?['B']:['B','W']);

/** Replay the shared engine APIs; there is no second rules implementation here. */
const replayed=new WeakSet<GameState>();
export function replayOnlineGame(value:unknown,previous?:GameState):GameState {
  if(!object(value)||value.schemaVersion!==1||value.rulesetId!=='GO-CLUB-AREA-1'||value.kind!=='OnlineGameRecord'||typeof value.id!=='string'||!Number.isSafeInteger(value.revision)||(value.revision as number)<1||typeof value.komi!=='number'||!Number.isFinite(value.komi)||!Array.isArray(value.events)||value.events.length>2000)throw Error('联机棋局版本或格式不受支持。');
  const record=value as unknown as OnlineGameRecord;
  if(record.revision<record.events.length+1)throw Error('联机棋局修订号与着法记录不一致。');
  const start=rulesEngine.startGame(record.setup,{mode:'full-game',komi:record.komi,gameId:record.id});
  if(!start.ok)throw Error(`联机起点未通过校验：${start.error.code}`);
  let game=start.value;
  if(previous&&replayed.has(previous)&&previous.id===record.id&&previous.komi===record.komi&&JSON.stringify(previous.setup)===JSON.stringify(record.setup)){
    const count=Math.min(previous.moves.length,record.events.length);
    if(JSON.stringify(previous.moves.slice(0,count))===JSON.stringify(record.events.slice(0,count))){
      game=previous;
      while(game.moves.length>record.events.length){const back=rulesEngine.undo(game);if(!back.ok)throw Error('回退同步失败。');game=back.value;}
    }
  }
  for(const event of record.events.slice(game.moves.length)){
    if(!object(event))throw Error('联机着法格式错误。');
    if(event.type==='place'||event.type==='pass'||event.type==='resign'){
      const result=event.type==='place'?rulesEngine.tryMove(game,event as Extract<GameEvent,{type:'place'}>):event.type==='pass'?rulesEngine.applyPass(game,event.color as Color):rulesEngine.resign(game,event.color as Color);
      if(!result.ok)throw Error(`联机着法未通过校验：${result.error.code}`);game=result.value.nextState;
    }else if(event.type==='resume'||event.type==='confirm-score'){
      const result=event.type==='resume'?rulesEngine.resumePlay(game,event.requestedBy as Color):rulesEngine.confirmScore(game,event.agreement as Extract<GameEvent,{type:'confirm-score'}>['agreement']);
      if(!result.ok)throw Error(`联机操作未通过校验：${result.error.code}`);game=result.value;
    }else throw Error('联机棋局包含未知操作。');
  }
  replayed.add(game);return game;
}

export function validatePublicRoom(value:unknown):PublicRoom {
  if(!object(value)||value.schemaVersion!==1||value.rulesetId!=='GO-CLUB-AREA-1'||value.kind!=='OnlineRoomSnapshot'||value.protocolVersion!==1||typeof value.id!=='string'||!Number.isSafeInteger(value.revision)||(value.revision as number)<1||typeof value.code!=='string'||!ROOM_CODE.test(value.code)||!object(value.players)||!object(value.scoring)||!coords(value.scoring.deadStones)||!votes(value.scoring.confirmedBy)||typeof value.message!=='string')throw Error('房间同步数据格式不正确，已暂停操作。');
  for(const color of ['B','W']){const seat=value.players[color];if(seat!==null&&(!object(seat)||typeof seat.nickname!=='string'||seat.nickname.length>32||typeof seat.connected!=='boolean'))throw Error('房间座位数据格式不正确。');}
  if(value.undoRequest!==null&&(!object(value.undoRequest)||!votes(value.undoRequest.confirmations)||!Number.isSafeInteger(value.undoRequest.requestedAtRevision)))throw Error('悔棋确认数据格式不正确。');
  if(value.id!==`ONLINE-ROOM-${value.code}`||!value.players.B||!object(value.record)||value.record.id!==`ONLINE-GAME-${value.code}`)throw Error('房间缺少匹配的可重放棋局。');
  return value as unknown as PublicRoom;
}

export function readClientMessage(value:unknown):ClientMessage {
  if(!object(value)||value.protocolVersion!==1||typeof value.requestId!=='string'||!/^[A-Za-z0-9-]{1,80}$/.test(value.requestId))throw Error('BAD_MESSAGE');
  const allowed:Record<string,string[]>={create:['nickname','size','komi'],join:['nickname','code'],resume:['code','token'],act:['version','action'],sync:[],leave:[],'enable-chat':[],'chat-send':['text']};
  if(typeof value.type!=='string'||!Object.hasOwn(allowed,value.type)||Object.keys(value).some(key=>!['protocolVersion','type','requestId',...allowed[value.type as string]].includes(key)))throw Error('BAD_MESSAGE');
  if(value.type==='create'||value.type==='join')if(typeof value.nickname!=='string'||value.nickname.trim().length>32||/[\u0000-\u001f]/.test(value.nickname))throw Error('BAD_NICKNAME');
  if(value.type==='create'&&(![5,9,13,19].includes(value.size as number)||typeof value.komi!=='number'||!Number.isFinite(value.komi)))throw Error('BAD_SETTINGS');
  if((value.type==='join'||value.type==='resume')&&(typeof value.code!=='string'||!ROOM_CODE.test(value.code)))throw Error('BAD_ROOM_CODE');
  if(value.type==='resume'&&(typeof value.token!=='string'||!/^[A-Za-z0-9_-]{32,100}$/.test(value.token)))throw Error('ROOM_AUTH_FAILED');
  if(value.type==='chat-send'&&(typeof value.text!=='string'||!value.text.trim()||value.text.length>CHAT_LIMIT||/[\u0000-\u0008\u000b-\u001f\u007f]/.test(value.text)))throw Error('CHAT_BAD_TEXT');
  if(value.type==='act'){
    if(!Number.isSafeInteger(value.version)||(value.version as number)<1||!object(value.action))throw Error('BAD_MESSAGE');
    const action=value.action;
    if(!['place','toggle-dead','pass','resign','confirm-score','resume-play','request-undo','confirm-undo','reject-undo'].includes(action.type as string))throw Error('BAD_MESSAGE');
    const hasPoint=action.type==='place'||action.type==='toggle-dead';
    if(Object.keys(action).some(key=>!(hasPoint?['type','at']:['type']).includes(key)))throw Error('BAD_MESSAGE');
    if(hasPoint&&(!object(action.at)||!Number.isInteger(action.at.row)||!Number.isInteger(action.at.col)||Object.keys(action.at).some(key=>!['row','col'].includes(key))))throw Error('BAD_MESSAGE');
  }
  return value as unknown as ClientMessage;
}

export function validateRoomChat(value:unknown):RoomChatSnapshot {
  if(!object(value)||value.schemaVersion!==1||value.rulesetId!=='GO-CLUB-AREA-1'||value.kind!=='OnlineRoomChat'||typeof value.code!=='string'||!ROOM_CODE.test(value.code)||value.id!==`ONLINE-CHAT-${value.code}`||!Number.isSafeInteger(value.revision)||(value.revision as number)<1||!Array.isArray(value.messages)||value.messages.length>CHAT_HISTORY_LIMIT)throw Error('聊天同步格式不正确，请重连后重试。');
  let previous=0;
  for(const item of value.messages){
    if(!object(item)||!Number.isSafeInteger(item.sequence)||(item.sequence as number)<=previous||item.id!==`${value.code}-${item.sequence}`||!['B','W'].includes(item.color as string)||typeof item.nickname!=='string'||item.nickname.length>32||typeof item.text!=='string'||!item.text.trim()||item.text.length>CHAT_LIMIT||/[\u0000-\u0008\u000b-\u001f\u007f]/.test(item.text)||typeof item.sentAt!=='string'||!Number.isFinite(Date.parse(item.sentAt)))throw Error('聊天内容未通过校验，请重新连接。');
    previous=item.sequence as number;
  }
  if(previous>(value.revision as number)-1)throw Error('聊天序号不一致，请重新连接。');
  return value as unknown as RoomChatSnapshot;
}

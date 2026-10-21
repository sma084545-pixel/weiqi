import type {GameState} from '../../core/content.generated';
import {replayOnlineGame,validatePublicRoom,type ClientMessage,type OnlineAction,type OnlineMembership,type PublicRoom,type ServerMessage} from './protocol';

const SEAT_KEY='go-club:online-seat:v1';
export interface ConnectionState {status:'connecting'|'ready'|'reconnecting'|'offline'|'error';room:PublicRoom|null;game:GameState|null;membership:OnlineMembership|null;shareUrl:string|null;pending:boolean;message:string}
type Intent={type:'create';nickname:string;size:number;komi:number}|{type:'join';nickname:string;code:string}|{type:'resume';code:string;token:string}|{type:'act';version:number;action:OnlineAction}|{type:'sync'|'leave'};
const savedSeat=():OnlineMembership|null=>{try{const saved=JSON.parse(sessionStorage.getItem(SEAT_KEY)??'null');return saved?.schemaVersion===1&&saved.rulesetId==='GO-CLUB-AREA-1'&&typeof saved.code==='string'&&typeof saved.token==='string'&&['B','W'].includes(saved.color)?{code:saved.code,token:saved.token,color:saved.color}:null;}catch{return null;}};
const remember=(seat:OnlineMembership)=>{try{sessionStorage.setItem(SEAT_KEY,JSON.stringify({schemaVersion:1,id:'LOCAL-ONLINE-SEAT',revision:1,rulesetId:'GO-CLUB-AREA-1',...seat}));}catch{/* The UI remains usable; a refresh may require a new room. */}};
const requestId=()=>{const bytes=new Uint8Array(12);crypto.getRandomValues(bytes);return [...bytes].map(value=>value.toString(16).padStart(2,'0')).join('');};
const endpoint=()=>{const url=new URL('./api/online/ws',document.baseURI);url.protocol=url.protocol==='https:'?'wss:':'ws:';url.hash='';return url.href;};

export class OnlineClient {
  state:ConnectionState={status:'connecting',room:null,game:null,membership:savedSeat(),shareUrl:null,pending:false,message:'正在连接联机服务…'};
  private socket:WebSocket|null=null;
  private stopped=false;
  private timer:ReturnType<typeof setTimeout>|null=null;
  private pendingTimer:ReturnType<typeof setTimeout>|null=null;
  private pendingId:string|null=null;
  private attempts=0;
  private resumeOnHello=true;
  constructor(private notify:(state:ConnectionState)=>void,private url=endpoint()){}
  private emit(patch:Partial<ConnectionState>){this.state={...this.state,...patch};this.notify(this.state);}
  private clearPending(){if(this.pendingTimer)clearTimeout(this.pendingTimer);this.pendingTimer=null;this.pendingId=null;this.emit({pending:false});}
  private room(value:unknown){const room=validatePublicRoom(value);if(this.state.room?.code===room.code&&room.revision<this.state.room.revision)throw Error('服务器棋局版本比本页旧，已保留本页记录；请先导出备份并联系主持者。');const game=replayOnlineGame(room.record,this.state.game??undefined);this.emit({room,game,status:'ready',message:room.message});}
  private online=()=>{if(!this.stopped)this.connect();};
  private offline=()=>{this.socket?.close();this.emit({status:'offline',pending:false,message:'网络已断开，棋局保留；联网后会尝试恢复，不会判负。'});};
  start(){window.addEventListener('online',this.online);window.addEventListener('offline',this.offline);this.connect();}
  stop(){this.stopped=true;if(this.timer)clearTimeout(this.timer);if(this.pendingTimer)clearTimeout(this.pendingTimer);window.removeEventListener('online',this.online);window.removeEventListener('offline',this.offline);this.socket?.close(1000,'PAGE_LEFT');}
  retry(){this.stopped=false;this.connect();}
  private connect(){
    if(this.stopped)return;if(this.timer)clearTimeout(this.timer);this.timer=null;
    const old=this.socket;this.socket=null;old?.close();this.clearPending();
    if(!navigator.onLine){this.emit({status:'offline',message:'当前离线；本机教学与同屏棋盘仍可用，联机需恢复网络。'});return;}
    this.emit({status:this.state.room?'reconnecting':'connecting',message:this.state.room?'正在恢复房间连接…':'正在连接联机服务…'});
    let socket:WebSocket;try{socket=new WebSocket(this.url);}catch{this.emit({status:'error',message:'浏览器未能建立联机连接，请检查网络或联系房主。'});return;}this.socket=socket;
    socket.onerror=()=>{/* close supplies the retry path without exposing low-level exceptions. */};
    socket.onmessage=event=>{
      if(this.stopped||this.socket!==socket)return;
      try{
        const value=JSON.parse(String(event.data)) as ServerMessage;
        if(value.protocolVersion!==1)throw Error('联机版本不兼容，请保存当前棋局后更新页面。');
        if(value.type==='hello'){
          if(value.rulesetId!=='GO-CLUB-AREA-1')throw Error('联机规则不兼容，不能加入。');
          this.attempts=0;this.emit({status:'ready',shareUrl:value.shareUrl&&/^https?:\/\//.test(value.shareUrl)?value.shareUrl:null,message:'已连接，可以创建或加入房间。'});
          if(this.resumeOnHello&&this.state.membership){const {code,token}=this.state.membership;this.send({type:'resume',code,token});}
        }else if(value.type==='joined'){
          const member=value.membership;if(!member||typeof member.token!=='string'||!['B','W'].includes(member.color)||member.code!==value.room?.code)throw Error('座位同步数据不正确。');
          this.room(value.room);remember(member);this.emit({membership:member});this.clearPending();
        }else if(value.type==='state'){
          this.room(value.room);if(value.requestId===this.pendingId)this.clearPending();
        }else if(value.type==='error'){
          if(value.room)this.room(value.room);if(!value.requestId||value.requestId===this.pendingId)this.clearPending();
          const lostSeat=['ROOM_NOT_FOUND','ROOM_AUTH_FAILED','NOT_IN_ROOM'].includes(value.code)&&Boolean(this.state.room);
          this.emit({status:lostSeat?'error':'ready',message:lostSeat?`${value.message} 本页保留最后的棋局供导出，也可返回大厅重新建房。`:value.message});
        }else if(value.type==='left'){
          this.resumeOnHello=false;this.clearPending();this.emit({room:null,game:null,status:'ready',message:'已返回大厅，原座位保留；可恢复上次房间，或创建新房间。'});
        }else throw Error('联机服务返回了未知消息，已暂停操作。');
      }catch(error){this.stopped=true;this.clearPending();socket.close(1002,'INVALID_STATE');this.emit({status:'error',message:(error as Error).message||'同步数据未通过校验，已暂停操作。'});}
    };
    socket.onclose=event=>{
      if(this.stopped||this.socket!==socket)return;this.clearPending();
      if(event.code===4009||event.code===1008){this.stopped=true;this.emit({status:'error',message:event.code===4009?'这个座位已在另一页面恢复；本页暂停操作。':'连接已暂停，请稍后再重连。'});return;}
      if(!navigator.onLine){this.emit({status:'offline',message:'网络已断开，棋局已保留；联网后恢复。'});return;}
      if(!this.state.membership){this.emit({status:'error',message:'暂时连不上联机服务。请确认网址与网络，或联系房主启动服务；也可以返回同屏对弈。'});return;}
      this.emit({status:'reconnecting',message:'连接中断，正在重连；棋局不判负。'});this.timer=setTimeout(()=>this.connect(),Math.min(15000,1000*2**this.attempts++));
    };
  }
  private send(intent:Intent){
    if(this.state.pending||this.state.status!=='ready'||this.socket?.readyState!==WebSocket.OPEN)return false;
    const id=requestId();this.pendingId=id;this.emit({pending:true});
    this.socket.send(JSON.stringify({protocolVersion:1,requestId:id,...intent} satisfies ClientMessage));
    this.pendingTimer=setTimeout(()=>{this.pendingTimer=null;this.emit({message:'尚未收到操作确认，正在重新同步，请勿重复落子。'});this.connect();},20000);
    return true;
  }
  create(nickname:string,size:number,komi:number){this.resumeOnHello=true;return this.send({type:'create',nickname,size,komi});}
  join(nickname:string,code:string){this.resumeOnHello=true;return this.send({type:'join',nickname,code});}
  resume(){const seat=this.state.membership??savedSeat();if(seat)return this.send({type:'resume',code:seat.code,token:seat.token});return false;}
  act(action:OnlineAction){if(!this.state.room)return false;return this.send({type:'act',version:this.state.room.revision,action});}
  leave(){
    if(this.state.status==='ready')return this.send({type:'leave'});
    // Explicitly leaving a disconnected/lost room must have a local recovery path.
    this.resumeOnHello=false;this.stopped=false;this.clearPending();
    this.emit({room:null,game:null,message:'已返回大厅，原座位凭据暂时保留；联网后可重新选择。'});this.connect();return true;
  }
}

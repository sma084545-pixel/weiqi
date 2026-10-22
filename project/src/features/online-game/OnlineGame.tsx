import {useEffect,useMemo,useRef,useState} from 'react';
import {Board} from '../../components/Board';
import {GameTimeline,useGameHistory} from '../../components/GameTimeline';
import type {Coord} from '../../core/content.generated';
import {createVerifiedGameStore,serializeGame,RULE_ERROR_ZH,type BoardMarker} from '../../core/rules';
import {browserStoragePort} from '../../core/unified-persistence';
import {ScoreDetails} from '../full-game/FullGame';
import {createFullGameMatch,scorePreview} from '../full-game/model';
import {OnlineClient,type ConnectionState} from './client';
import {ROOM_CODE,type OnlineAction} from './protocol';
import {BoardDisplayTools} from './BoardDisplayTools';
import {RoomChat} from './RoomChat';
import './OnlineTools.css';
import {onlineConnectionConfig} from './hosting';
import './OnlineGame.css';
const label=(color:'B'|'W')=>color==='B'?'黑方':'白方';
const initial:ConnectionState={status:'connecting',room:null,game:null,membership:null,shareUrl:null,pending:false,message:'正在连接联机服务…',chatSupported:false,chat:null,chatPending:false,chatMessage:'',chatAck:null};
const download=(text:string,name:string)=>{const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);};

export function OnlineGame({projector=false}:{projector?:boolean}){
  const client=useRef<OnlineClient|null>(null),[connection,setConnection]=useState<ConnectionState>(initial);
  const [nickname,setNickname]=useState(''),[code,setCode]=useState(''),[size,setSize]=useState(9),[komi,setKomi]=useState('0'),[notice,setNotice]=useState(''),[confirm,setConfirm]=useState<'resign'|'leave'|null>(null);
  const [chatDraft,setChatDraft]=useState(''),sentChat=useRef<{id:string;text:string}|null>(null);
  useEffect(()=>{if(connection.chatAck&&sentChat.current?.id===connection.chatAck){const submitted=sentChat.current.text;setChatDraft(value=>value===submitted?'':value);sentChat.current=null;}},[connection.chatAck]);
  useEffect(()=>{setChatDraft('');sentChat.current=null;},[connection.room?.code]);
  const sendChat=()=>{const id=client.current?.sendChat(chatDraft);if(id)sentChat.current={id,text:chatDraft};};
  const chat=<RoomChat connection={connection} draft={chatDraft} onDraft={setChatDraft} onSend={sendChat}/>;
  const shareField=useRef<HTMLInputElement>(null),codeField=useRef<HTMLInputElement>(null);
  const hosting=useMemo(()=>onlineConnectionConfig(location.href,import.meta.env.VITE_ONLINE_SERVER_URL,import.meta.env.VITE_ONLINE_SITE_ORIGIN),[]);
  useEffect(()=>{if(!hosting.endpoint){setConnection({...initial,status:'error',message:hosting.message??'联机服务尚未接入。'});return;}const value=new OnlineClient(setConnection,hosting.endpoint);client.current=value;setConnection(value.state);value.start();return()=>{value.stop();client.current=null;};},[hosting]);
  const temporaryRooms=import.meta.env.VITE_ONLINE_EPHEMERAL_ROOMS==='true'&&location.origin===import.meta.env.VITE_ONLINE_SITE_ORIGIN;
  const {room,game,membership}=connection,history=useGameHistory(game);
  const viewing=history.viewingHistory,color=membership?.color??'B',connected=connection.status==='ready';
  const both=Boolean(room?.players.B?.connected&&room.players.W?.connected),canAct=connected&&both&&!connection.pending&&!viewing;
  const ownTurn=game?.toPlay===color,live=Boolean(game&&game.phase==='playing'&&canAct&&ownTurn&&!room?.undoRequest);
  const frame=history.frame,board=viewing?frame?.board:game?.board;
  const preview=useMemo(()=>{if(!game||!room||(game.phase!=='scoring'&&game.result?.reason!=='area'))return null;if(game.result?.reason==='area')return game.result.score;const result=scorePreview({...createFullGameMatch(),game,scoring:room.scoring});return result.ok?result.value:null;},[game,room?.scoring]);
  const result=game?.result?.reason==='area'?game.result.score.winner:game?.result?.reason==='resign'?game.result.winner:null;
  const markers:BoardMarker[]=viewing?frame?.markers??[]:[...(frame?.markers??[]),...((game?.phase==='scoring'||game?.result?.reason==='area')?room?.scoring.deadStones.map((at,index)=>({markerId:`online-dead-${index}`,kind:'target' as const,at,label:'双方待确认的死子标记'}))??[]:[])];
  const act=(action:OnlineAction)=>{if(!canAct)return;setNotice('');client.current?.act(action);};
  const copy=async(text:string,field:HTMLInputElement|null)=>{try{if(!navigator.clipboard)throw Error('select');await navigator.clipboard.writeText(text);setNotice('已复制，请发给同伴。');}catch{field?.focus();field?.select();setNotice('内容已选中，可复制或长按分享。');}};
  const shareUrl=connection.shareUrl??`${location.origin}${location.pathname}#/play/online`;
  const create=()=>{if(!komi.trim()||!Number.isFinite(Number(komi))){setNotice('请填写有效贴目；默认可以填0。');return;}setNotice('');client.current?.create(nickname,size,Number(komi));};
  const join=()=>{const value=code.replace(/[\s-]/g,'').toUpperCase();if(!ROOM_CODE.test(value)){setNotice('请填写完整的8位房间码。');return;}setNotice('');client.current?.join(nickname,value);};
  const save=()=>{if(!game)return;const result=createVerifiedGameStore(browserStoragePort()).save({...game,revision:Math.max(game.revision,room?.record.revision??game.revision)});setNotice(result.ok?'已保存当前棋局的本机副本；不会改动房间。':result.issues[0].message);};
  const choose=(at:Coord)=>{if(game?.phase==='scoring'&&!room?.undoRequest)act({type:'toggle-dead',at});};
  const stateLabel=!hosting.endpoint?'联机服务未接入':connection.status==='ready'?'服务已连接':connection.status==='offline'?'网络已断开':connection.status==='reconnecting'?'正在重连':connection.status==='connecting'?'正在连接':'连接未就绪';
  const nextConfirm=room?.scoring.confirmedBy.includes('B')?'W':'B',nextUndo=room?.undoRequest?.confirmations.includes('B')?'W':'B';
  const renderBoard=(variant:'full'|'mini'|'pip')=>{if(!game||!board)return null;return <Board size={game.size} board={board} zoom={variant==='pip'?.75:1} label={`${variant==='mini'?'悬浮缩略图 · ':variant==='pip'?'画中画 · ':''}联机${game.size}路棋盘，${viewing?'只读回看':label(game.toPlay)+'行棋'}`} mode={variant==='mini'||viewing?'readonly':game.phase==='scoring'?'mark':live?'play':'readonly'} disabled={viewing||!connected||!both||connection.pending||Boolean(room?.undoRequest)||game.phase==='finished'} selected={null} onSelect={choose} onPlay={at=>{if(live)act({type:'place',at});}} markers={markers} showCoordinates displayMode={variant==='full'&&projector?'projector':'standard'}/>;};
  const timeline=frame&&<GameTimeline max={history.max} value={history.index} onChange={history.goTo} title={frame.title} description={frame.description}/>;
  const turnActions=<><button type="button" disabled={!live} onClick={()=>act({type:'pass'})}>停一手</button>{viewing&&<button type="button" onClick={()=>history.goTo(history.max)}>返回当前局面</button>}</>;
  return <div className="online-page" data-testid="online-game" data-room={room?.code??''} data-phase={game?.phase??'lobby'} data-move-count={game?.moves.length??0} data-room-revision={room?.revision??0}>
    <header className="online-hero"><p><a href="#/home">← 返回学习入口</a></p><span className="online-kicker">两台设备 · 一个房间</span><h1>联机双人对弈</h1><p>两人打开同一个可访问的网址，一人创建房间，另一人输入房间码。无需注册或真实姓名；按相同围棋规则轮流落子。</p><span className={`connection-badge status-${connection.status}`} role="status">{stateLabel}{connection.pending?' · 正在提交操作':''}</span></header>
    <div className="online-message" role="status" aria-live="polite">{notice||connection.message}{hosting.endpoint&&connection.status!=='ready'&&<button type="button" onClick={()=>client.current?.retry()}>重新连接</button>}</div>
    {temporaryRooms&&<p className="online-service-notice" role="note" aria-label="临时房间保存说明">免费服务首次连接可能需要约一分钟；稍候可点“重新连接”。房间为临时保存，服务休眠、重启或更新后可能需要重新开房。对弈中请“保存本机副本”或导出棋局；离线时不能同步落子。</p>}
    {!hosting.endpoint?<section className="online-service-notice" aria-label="联机服务接入说明"><h2>同屏对弈可以直接开始</h2><p>这个网站已包含最新学习内容、自由双人对弈、回退和棋局滑动条。两台设备在线同步还需要一台运行中的房间服务器；GitHub Pages本身不运行它。</p><div className="online-actions"><a className="online-primary" href="#/play/free">先用同屏双人对弈</a><a href={new URL('./ONLINE_SETUP.md',document.baseURI).href}>查看联机服务部署说明</a></div></section>:!room||!game||!board?<section className="online-lobby" aria-label="联机大厅">
      <div className="lobby-intro"><h2>找个伙伴，开一局</h2><p>仅房间里的昵称、棋局、聊天和连接状态会发送到联机服务。本机学习进度、教师草稿和反馈不上传；不要填写联系方式。</p><label>昵称（可留空）<input value={nickname} maxLength={32} placeholder="例如：棋友 A" autoComplete="off" onChange={event=>setNickname(event.target.value)}/></label>{membership&&<button type="button" disabled={!connected||connection.pending} onClick={()=>client.current?.resume()}>恢复上次房间 {membership.code}</button>}<p><a href="#/play/free">使用同一台设备？打开同屏对弈 →</a></p></div>
      <form className="room-form" onSubmit={event=>{event.preventDefault();create();}}><span>我是发起者</span><h2>创建房间</h2><label>联机棋盘尺寸<select value={size} onChange={event=>setSize(Number(event.target.value))}>{[5,9,13,19].map(value=><option key={value} value={value}>{value}路{value===5?'（小棋盘练习）':value===9?'（默认）':''}</option>)}</select></label><label>白方贴目<input type="number" step="0.5" value={komi} onChange={event=>setKomi(event.target.value)}/></label><p>默认9路、贴目0，可和棋。创建后锁定设置；创建者执黑。</p><button type="submit" className="online-primary" disabled={!connected||connection.pending}>创建房间</button></form>
      <form className="room-form" onSubmit={event=>{event.preventDefault();join();}}><span>我来加入</span><h2>加入房间</h2><label>输入房间码<input value={code} maxLength={16} autoCapitalize="characters" autoComplete="off" spellCheck={false} onChange={event=>setCode(event.target.value.toUpperCase())} placeholder="8位房间码"/></label><p>向同伴索取房间码，加入后执白。每个房间只有两个座位，不设公开观战；聊天仅供房间内两人使用。</p><button type="submit" className="online-primary" disabled={!connected||connection.pending}>加入房间</button></form>
    </section>:<>
      <section className="online-room-heading"><div><span>房间码</span><input ref={codeField} aria-label="当前房间码" readOnly value={room.code}/><button type="button" onClick={()=>copy(room.code,codeField.current)}>复制房间码</button></div><div className="invite-address"><label>同伴打开的网址<input ref={shareField} readOnly value={shareUrl}/></label><button type="button" onClick={()=>copy(shareUrl,shareField.current)}>复制网址</button><small>本机地址不能直接用于异地访问；请确认双方都能打开这个网址。公开部署后使用部署网址。</small></div></section>
      <section className="online-layout"><div className="online-board-card"><div className="online-board-heading"><div><span>{game.size}路 · 贴目 {game.komi}</span><h2>{viewing?`只读回看 · ${frame?.title}`:game.phase==='playing'?`轮到${label(game.toPlay)}`:game.phase==='scoring'?'共同确认终局':'本局已结束'}</h2></div><strong>你执{color==='B'?'黑':'白'}</strong></div>
        <BoardDisplayTools key={room.code} renderBoard={renderBoard} timeline={timeline} chat={chat} turnActions={turnActions} status={`${game.size}路 · 你执${color==='B'?'黑':'白'} · ${viewing?'只读回看 · '+frame?.title:game.phase==='playing'?'轮到'+label(game.toPlay):game.phase==='scoring'?'终局确认':'本局已结束'}`}/>
        {renderBoard('full')}
        {frame&&<GameTimeline max={history.max} value={history.index} onChange={history.goTo} title={frame.title} description={frame.description}/>}
      </div><aside className="online-controls" aria-label="联机对弈控制"><section className="online-seats"><h2>房间伙伴</h2>{(['B','W'] as const).map(seat=><div key={seat} className="online-seat"><i className={seat==='B'?'black':'white'} aria-hidden="true"/><div><strong>{label(seat)}{seat===color?'（你）':''} · {room.players[seat]?.nickname??'等待加入'}</strong><span>{room.players[seat]?.connected?'已连接':room.players[seat]?'暂时断线':'还没有伙伴'}</span></div></div>)}{!both&&<p>等待双方连接后继续。断线不判负，原盘面和历史保留。</p>}</section>
        {viewing?<p className="online-readonly">正在只读回看。返回当前局面后再落子、停手或确认。</p>:room.undoRequest?<section className="online-undo"><h2>双方确认悔棋</h2><p>黑方{room.undoRequest.confirmations.includes('B')?'已确认':'待确认'}，白方待确认。只有双方分别同意才会撤回最近一步。</p><button type="button" className="online-primary" disabled={!canAct||color!==nextUndo} onClick={()=>act({type:'confirm-undo'})}>{label(nextUndo)}确认悔棋</button><button type="button" disabled={!canAct} onClick={()=>act({type:'reject-undo'})}>拒绝悔棋，保留棋局</button></section>:game.phase==='playing'?<section><h2>{ownTurn?'到你行动':'等待同伴行动'}</h2><p>{ownTurn?'在空交叉点落子，也可以停一手。':'本页只能操作自己的执色；对方落子后会自动同步。'}</p><div className="online-actions"><button type="button" disabled={!live} onClick={()=>act({type:'pass'})}>停一手</button><button type="button" disabled={!live} onClick={()=>setConfirm('resign')}>认输</button><button type="button" disabled={!canAct||!game.moves.length} onClick={()=>act({type:'request-undo'})}>申请悔棋</button></div></section>:game.phase==='scoring'?<section className="online-scoring"><h2>确认死子与中立点</h2><p>先共同商量，再点击整块标记或取消死子。任何修改都会取消原确认；程序不会自动猜死活。</p><p>黑方{room.scoring.confirmedBy.includes('B')?'已确认':'待确认'} · 白方待确认</p><button type="button" className="online-primary" disabled={!canAct||color!==nextConfirm} onClick={()=>act({type:'confirm-score'})}>{label(nextConfirm)}确认当前清单</button><button type="button" disabled={!canAct} onClick={()=>act({type:'resume-play'})}>有争议，恢复原盘对弈</button><button type="button" disabled={!canAct} onClick={()=>act({type:'request-undo'})}>申请悔棋</button></section>:<section className="online-result" role="status"><span>本局结果</span><h2>{result==='draw'?'和棋':result?`${label(result)}获胜`:'本局结束'}</h2><p>{game.result?.reason==='resign'?'认输结束，不编造面积分。':'双方已确认同一份清单，系统按面积计分。'}</p><button type="button" disabled={!canAct} onClick={()=>act({type:'request-undo'})}>申请悔棋</button></section>}
        {chat}
        <section><h2>保留这局棋</h2><div className="online-actions"><button type="button" onClick={save}>保存本机副本</button><button type="button" onClick={()=>(()=>{const serialized=serializeGame({...game,revision:Math.max(game.revision,room.record.revision)});if(serialized.ok)download(serialized.value,`go-club-online-${room.code}.json`);else setNotice(RULE_ERROR_ZH[serialized.error.code]);})()}>导出对局 JSON</button><button type="button" disabled={connection.pending} onClick={()=>setConfirm('leave')}>返回大厅</button></div><p>回看和本机副本不会改变房间。本机恢复凭据只保留在当前页面所属的浏览器会话；不要转发凭据。</p></section>
      </aside></section>
      {!viewing&&preview&&<ScoreDetails score={preview} captures={game.captures} final={game.phase==='finished'}/>}
    </>}
    {confirm&&<div className="online-confirm" role="group" aria-label={confirm==='resign'?'确认认输':'确认返回大厅'}><strong>{confirm==='resign'?'确认认输并结束本局？':'返回大厅会暂时离开座位，棋局保留，不判负。'}</strong><button type="button" className="online-primary" onClick={()=>{if(confirm==='resign')act({type:'resign'});else client.current?.leave();setConfirm(null);}}>{confirm==='resign'?'确认认输':'确认返回大厅'}</button><button type="button" onClick={()=>setConfirm(null)}>取消</button></div>}
  </div>;
}

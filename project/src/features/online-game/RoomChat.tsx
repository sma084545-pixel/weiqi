import {useEffect,useId,useRef} from 'react';
import type {ConnectionState} from './client';
import {CHAT_LIMIT} from './protocol';

export function RoomChat({connection,draft,onDraft,onSend}:{connection:ConnectionState;draft:string;onDraft:(text:string)=>void;onSend:()=>void}){
  const id=useId(),log=useRef<HTMLDivElement>(null),atBottom=useRef(true);
  const chat=connection.chat,canSend=connection.status==='ready'&&connection.chatSupported&&Boolean(chat)&&!connection.chatPending;
  useEffect(()=>{if(atBottom.current&&log.current)log.current.scrollTop=log.current.scrollHeight;},[chat?.revision]);
  return <section className="room-chat" aria-label="房间聊天">
    <div className="room-chat-heading"><h2>房间聊天</h2><span>仅此房间的两位伙伴</span></div>
    <p className="room-chat-note">最近50条临时保留；服务重启后清空，不写入棋谱。请勿发送姓名、联系方式等个人信息。</p>
    {!connection.chatSupported?<p className="chat-unavailable" role="status">{connection.status==='ready'?'聊天服务正在等待更新。当前棋局仍可正常对弈；服务更新后重新连接即可。':'正在等待房间连接恢复，再启用聊天。'}</p>:<>
      <div ref={log} className="chat-log" role="log" aria-label="房间聊天记录" aria-live="polite" aria-relevant="additions text" onScroll={()=>{const node=log.current;if(node)atBottom.current=node.scrollHeight-node.scrollTop-node.clientHeight<48;}}>
        {!chat?.messages.length?<p className="chat-empty">还没有消息，可以和同伴打个招呼。</p>:chat.messages.map(item=><article className={`chat-message chat-${item.color}`} key={item.id}>
          <div><strong>{item.color==='B'?'黑方':'白方'} · {item.nickname}{item.color===connection.membership?.color?'（你）':''}</strong><time dateTime={item.sentAt}>{new Date(item.sentAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</time></div>
          <p>{item.text}</p>
        </article>)}
      </div>
      <form onSubmit={event=>{event.preventDefault();if(canSend&&draft.trim())onSend();}}>
        <label htmlFor={id}>给同伴的消息</label><textarea id={id} value={draft} maxLength={CHAT_LIMIT} rows={3} placeholder="输入消息；Enter发送，Shift+Enter换行" onChange={event=>onDraft(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing&&event.nativeEvent.keyCode!==229){event.preventDefault();if(canSend&&draft.trim())onSend();}}}/>
        <div className="chat-compose-actions"><span>{draft.length}/{CHAT_LIMIT}</span><button type="submit" className="online-primary" disabled={!canSend||!draft.trim()}>{connection.chatPending?'正在发送…':'发送消息'}</button></div>
      </form>
    </>}
    {connection.chatMessage&&<p className="chat-error" role="status">{connection.chatMessage}</p>}
    {connection.chatSupported&&connection.status!=='ready'&&<p role="status">连接恢复后才能发送。输入内容暂时保留在本页。</p>}
  </section>;
}

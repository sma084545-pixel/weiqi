import {useEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';

type BoardView='full'|'mini'|'pip';
type PiPApi={requestWindow:(options:{width:number;height:number})=>Promise<Window>};
const pipApi=()=>(window as Window&{documentPictureInPicture?:PiPApi}).documentPictureInPicture;
export const clampFloating=(x:number,y:number,width:number,height:number,viewportWidth:number,viewportHeight:number)=>({x:Math.max(8,Math.min(x,Math.max(8,viewportWidth-width-8))),y:Math.max(8,Math.min(y,Math.max(8,viewportHeight-height-8)))});

/** Additional controlled views of the same room. No board/rules/history are copied or committed here. */
export function BoardDisplayTools({renderBoard,timeline,chat,status,turnActions}:{renderBoard:(view:BoardView)=>ReactNode;timeline:ReactNode;chat:ReactNode;status:string;turnActions:ReactNode}){
  const [floating,setFloating]=useState(false),[maximized,setMaximized]=useState(false),[position,setPosition]=useState({x:8,y:80}),[pip,setPip]=useState<Window|null>(null),[message,setMessage]=useState(''),[fullscreen,setFullscreen]=useState(false);
  const panel=useRef<HTMLElement>(null),dialog=useRef<HTMLDialogElement>(null),shell=useRef<HTMLDivElement>(null),opener=useRef<HTMLButtonElement>(null),pipRef=useRef<Window|null>(null),alive=useRef(true);
  const drag=useRef<{id:number;dx:number;dy:number}|null>(null);
  const move=(x:number,y:number)=>{const node=panel.current;if(node)setPosition(clampFloating(x,y,node.offsetWidth,node.offsetHeight,window.innerWidth,window.innerHeight));};
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;pipRef.current?.close();pipRef.current=null;};},[]);
  useEffect(()=>{
    if(!floating)return;
    const clamp=()=>setPosition(old=>clampFloating(old.x,old.y,panel.current?.offsetWidth??320,panel.current?.offsetHeight??400,window.innerWidth,window.innerHeight));
    clamp();window.addEventListener('resize',clamp);const observer=new ResizeObserver(clamp);if(panel.current)observer.observe(panel.current);
    return()=>{window.removeEventListener('resize',clamp);observer.disconnect();};
  },[floating]);
  useEffect(()=>{
    const node=dialog.current;if(!maximized||!node)return;
    const overflow=document.body.style.overflow;document.body.style.overflow='hidden';node.showModal();
    return()=>{node.close();document.body.style.overflow=overflow;opener.current?.focus({preventScroll:true});};
  },[maximized]);
  useEffect(()=>{const sync=()=>setFullscreen(Boolean(document.fullscreenElement));document.addEventListener('fullscreenchange',sync);return()=>document.removeEventListener('fullscreenchange',sync);},[]);
  const closeMax=()=>{if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});setMaximized(false);};
  const openPip=async()=>{
    const api=pipApi();if(!api){setFloating(true);setMessage('当前浏览器不支持独立画中画，已打开页内悬浮小棋盘。');return;}
    if(pipRef.current&&!pipRef.current.closed){pipRef.current.focus();return;}
    try{
      const target=await api.requestWindow({width:560,height:740});if(!alive.current){target.close();return;}
      target.document.title='围棋房间 · 画中画';target.document.documentElement.lang='zh-CN';
      const base=target.document.createElement('base');base.href=document.baseURI;target.document.head.append(base);
      for(const source of document.querySelectorAll('link[rel="stylesheet"],style'))target.document.head.append(source.cloneNode(true));
      target.document.body.className='online-pip-body';pipRef.current=target;setPip(target);setFloating(false);
      target.addEventListener('pagehide',()=>{if(pipRef.current===target){pipRef.current=null;if(alive.current)setPip(null);}},{once:true});
      setMessage('独立画中画已打开，与当前房间实时同步；关闭小窗不会离开房间。');
    }catch{if(alive.current){setFloating(true);setMessage('浏览器没有打开独立小窗，已改用页内悬浮棋盘；可以继续对弈。');}}
  };
  const toggleFullscreen=async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else if(shell.current?.requestFullscreen)await shell.current.requestFullscreen();else setMessage('此浏览器不提供系统全屏；棋盘已按窗口最大化显示。');}
    catch{setMessage('浏览器未允许系统全屏；仍可使用当前放大棋盘。');}
  };
  return <>
    <div className="board-display-toolbar" aria-label="棋盘窗口设置"><button type="button" ref={opener} onClick={()=>setMaximized(true)}>最大化棋盘</button><button type="button" aria-pressed={floating} onClick={()=>setFloating(value=>!value)}>{floating?'收起悬浮棋盘':'悬浮小棋盘'}</button><button type="button" onClick={()=>void openPip()}>独立画中画</button></div>
    {message&&<p className="board-display-message" role="status">{message}</p>}
    {floating&&<aside ref={panel} className="floating-board online-tool-surface" aria-label="悬浮小棋盘" style={{left:position.x,top:position.y}}>
      <header><button type="button" className="floating-drag" aria-label="移动悬浮棋盘，使用方向键" onPointerDown={event=>{if(event.button!==0)return;const bounds=panel.current!.getBoundingClientRect();drag.current={id:event.pointerId,dx:event.clientX-bounds.left,dy:event.clientY-bounds.top};event.currentTarget.setPointerCapture(event.pointerId);}} onPointerMove={event=>{if(drag.current?.id===event.pointerId)move(event.clientX-drag.current.dx,event.clientY-drag.current.dy);}} onPointerUp={event=>{if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}} onKeyDown={event=>{const delta:Record<string,[number,number]>={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]};if(delta[event.key]){event.preventDefault();move(position.x+delta[event.key][0],position.y+delta[event.key][1]);}}}>⠿ 拖动小棋盘</button><button type="button" aria-label="关闭悬浮小棋盘" onClick={()=>setFloating(false)}>关闭</button></header>
      <p className="mini-status">{status}</p><div className="miniature-board">{renderBoard('mini')}</div><p className="mini-help">只读缩略图；与主棋盘及回看位置同步。</p><div className="online-actions"><button type="button" onClick={()=>{setFloating(false);setMaximized(true);}}>放大并操作</button><button type="button" onClick={()=>move(8,80)}>复位位置</button></div>
    </aside>}
    {maximized&&<dialog ref={dialog} className="max-board-dialog" aria-labelledby="max-board-title" onCancel={event=>{event.preventDefault();closeMax();}}>
      <div ref={shell} className="max-board-shell online-tool-surface"><header className="max-board-header"><div><h2 id="max-board-title">放大棋盘</h2><p>{status}</p></div><div className="online-actions"><button type="button" onClick={()=>void toggleFullscreen()}>{fullscreen?'退出系统全屏':'进入系统全屏'}</button><button type="button" autoFocus onClick={closeMax}>返回普通棋盘</button></div></header>
        <div className="max-board-layout"><div className="max-board-main">{renderBoard('full')}{timeline}<div className="online-actions">{turnActions}</div></div><aside>{chat}</aside></div>
      </div>
    </dialog>}
    {pip&&createPortal(<div className="online-tool-surface pip-board"><header><h1>联机棋盘 · 画中画</h1><p>{status}</p></header>{renderBoard('pip')}<div className="online-actions">{turnActions}<button type="button" onClick={()=>{window.focus();pip.close();}}>返回主窗口</button></div><p>同一房间实时同步。确认死子、悔棋和聊天请回主窗口；关闭小窗不影响棋局。</p></div>,pip.document.body)}
  </>;
}

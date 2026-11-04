import {useEffect,useId,useMemo,useRef,useState} from 'react';
import type {Color,GameState} from '../../core/content.generated';
import type {AiDifficulty} from '../../core/analysis/ai-contract';
import {browserStoragePort} from '../../core/unified-persistence';
import {openReviewRecord} from './storage';
import type {ReviewRecord} from './model';
import {ReviewWorkspace} from './ReviewWorkspace';
import './ReviewWorkspace.css';

export function ReviewActions({game,index,humanColor,title,onOpen,finishedOnly=false,difficulty='standard'}:{game:GameState;index:number;humanColor:Color;title:string;onOpen?:()=>void;finishedOnly?:boolean;difficulty?:AiDifficulty}){
  const port=useMemo(()=>browserStoragePort(),[]),dialog=useRef<HTMLDialogElement>(null),label=useId();
  const [record,setRecord]=useState<ReviewRecord|null>(null),[tab,setTab]=useState<'overview'|'continue'>('continue'),[issue,setIssue]=useState('');
  const gate=useRef(false);
  const close=()=>{dialog.current?.close();setRecord(null);gate.current=false;};
  const open=(next:'overview'|'continue')=>{
    if(gate.current)return;gate.current=true;onOpen?.();
    try{setTab(next);setRecord(openReviewRecord(port,game,humanColor,title,index));setIssue('');}catch(e){gate.current=false;setIssue(e instanceof Error?e.message:'无法保存独立复盘，原棋局保持不变。');}
  };
  useEffect(()=>{
    const node=dialog.current;if(!record||!node)return;
    node.showModal();return()=>{if(node.open)node.close();};
  },[!!record]);
  if(game.mode!=='full-game'||(finishedOnly&&game.phase!=='finished'))return null;
  return <section className="review-launcher" aria-label="复盘与续下">
    <button type="button" className="primary-action" onClick={()=>open('continue')}>从这里继续</button>
    {game.phase==='finished'&&<button type="button" className="primary-action" onClick={()=>open('overview')}>AI 复盘</button>}
    <p>当前第 {index} 步；新对局独立保存，不覆盖原棋谱。{game.phase==='finished'?'复盘分析不改变胜负与结算。':'赛后才开放整盘 AI 复盘。'}</p>
    {issue&&<p role="alert">{issue}</p>}
    <dialog ref={dialog} className="review-workspace" aria-labelledby={label} onCancel={()=>{setRecord(null);gate.current=false;}}>
      {record&&<><header className="review-topbar"><div><span>{record.title} · 独立复盘</span><h1 id={label}>复盘与重新尝试</h1></div><button type="button" onClick={close}>返回原复盘（第 {index} 步）</button></header><ReviewWorkspace initialRecord={record} initialTab={tab} initialDifficulty={difficulty} port={port}/></>}
    </dialog>
  </section>;
}

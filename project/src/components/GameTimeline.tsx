import {useId,useMemo,useState} from 'react';
import type {GameState} from '../core/content.generated';
import {createGameHistory} from '../core/game-history';
import './GameTimeline.css';

/** Cursor is separate from the saved game and resets synchronously on any game change. */
export function useGameHistory(game:GameState|null) {
  const frames=useMemo(()=>game?createGameHistory(game):[],[game]);
  const [cursor,setCursor]=useState<{game:GameState;index:number}|null>(null);
  const max=Math.max(0,frames.length-1);
  const index=cursor?.game===game?Math.min(cursor.index,max):max;
  const goTo=(value:number)=>{if(game)setCursor({game,index:Math.max(0,Math.min(max,Math.round(value)))});};
  return {frames,index,max,frame:frames[index]??null,viewingHistory:index<max,goTo};
}

interface GameTimelineProps {
  max:number;
  value:number;
  onChange:(index:number)=>void;
  title:string;
  description?:string;
  disabled?:boolean;
  help?:string;
  latestLabel?:string;
}

/** Native range supplies touch, pointer and keyboard behavior without pointer-only code. */
export function GameTimeline({max,value,onChange,title,description,disabled=false,help,latestLabel='返回当前局面继续'}:GameTimelineProps) {
  const id=useId();
  const last=Math.max(0,max),index=Math.max(0,Math.min(value,last));
  const choose=(next:number)=>{if(!disabled)onChange(Math.max(0,Math.min(next,last)));};
  return <section className="game-timeline" aria-labelledby={`${id}-label`} data-history-index={index} data-history-max={last} data-browsing={index<last}>
    <div className="timeline-heading"><label id={`${id}-label`} htmlFor={id}>棋局滑动条</label><span>{index<last?'只读回看':'当前局面'} · {index} / {last} 步</span></div>
    <p id={`${id}-help`} className="timeline-help">{help??'拖动即可回看；左右方向键逐步切换，Home 回开局，End 回当前。回看不改变对局；真正悔棋请使用对局操作。'}</p>
    <input id={id} type="range" min="0" max={last} step="1" value={index} disabled={disabled||last===0} aria-describedby={`${id}-help ${id}-position`} aria-valuetext={`${index} / ${last} 步，${title}`} onChange={event=>choose(event.currentTarget.valueAsNumber)}/>
    <div className="timeline-position" id={`${id}-position`}><strong>{title}</strong>{description&&<span>{description}</span>}</div>
    <div className="timeline-actions"><button type="button" disabled={disabled||index===0} onClick={()=>choose(0)}>回到开局</button><button type="button" disabled={disabled||index===0} onClick={()=>choose(index-1)}>回退到上一步</button><button type="button" disabled={disabled||index===last} onClick={()=>choose(index+1)}>前进一步</button><button type="button" className="timeline-latest" disabled={disabled||index===last} onClick={()=>choose(last)}>{latestLabel}</button></div>
  </section>;
}

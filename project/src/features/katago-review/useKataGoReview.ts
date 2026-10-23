import {useEffect,useMemo,useRef,useState} from 'react';
import type {GameState} from '../../core/content.generated';
import {makeReviewRequest,type ReviewAnalysisResponse} from '../../core/analysis/contract';
import type {BoardMarker} from '../../core/rules';
import {analysisOrigin} from './config';
import {AnalysisClientError,requestReviewAnalysis} from './client';

interface ViewState {identity:object;phase:'idle'|'loading'|'starting'|'error'|'done';result?:ReviewAnalysisResponse;message?:string;}
export function useKataGoReview(game:GameState|null,index:number,enabled:boolean){
  const origin=analysisOrigin();
  const allowed=Boolean(enabled&&game?.phase==='finished'&&game.mode==='full-game');
  const identity=useMemo(()=>({}),[game,index,allowed]);
  const positionId=useMemo(()=>`review-${globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random().toString(36).slice(2)}`}`,[identity]);
  const [state,setState]=useState<ViewState>({identity,phase:'idle'});
  const active=useRef<{identity:object;controller:AbortController;sequence:number}|null>(null);
  const sequence=useRef(0),latest=useRef(identity);latest.current=identity;
  const current:ViewState=state.identity===identity?state:{identity,phase:'idle'};
  useEffect(()=>()=>{sequence.current++;active.current?.controller.abort();active.current=null;},[identity]);
  const cancel=()=>{sequence.current++;active.current?.controller.abort();active.current=null;setState({identity,phase:'idle',message:'已取消分析，棋局保持不变。'});};
  const analyze=async()=>{
    if(!allowed||!game||!origin||active.current?.identity===identity)return;
    const controller=new AbortController(),ticket=++sequence.current;
    active.current?.controller.abort();active.current={identity,controller,sequence:ticket};
    setState({identity,phase:'loading'});
    // A slow first connection may be Render waking; this is a status hint, not a readiness claim.
    const wakeHint=setTimeout(()=>{if(latest.current===identity&&sequence.current===ticket)setState({identity,phase:'loading',message:'仍在等待；服务可能正在冷启动。可以取消，或继续等待本次请求。'});},15_000);
    try{
      const frame=index===game.moves.length?game:game.undoStack[index];
      const result=await requestReviewAnalysis(origin,makeReviewRequest(game,index,positionId),frame.toPlay,controller.signal);
      if(latest.current!==identity||sequence.current!==ticket||controller.signal.aborted)return;
      setState({identity,phase:'done',result});
    }catch(error){
      if(latest.current!==identity||sequence.current!==ticket||controller.signal.aborted)return;
      const issue=error instanceof AnalysisClientError?error:new AnalysisClientError('NETWORK','分析未能完成，请稍后重试。');
      setState({identity,phase:issue.code==='NOT_READY'?'starting':'error',message:issue.message});
    }finally{clearTimeout(wakeHint);if(active.current?.sequence===ticket)active.current=null;}
  };
  const result=allowed?current.result:undefined;
  const markers:BoardMarker[]=result?.candidates.flatMap((candidate,index)=>candidate.move.type==='place'?[{markerId:`katago-${positionId}-${index}`,kind:'sequence' as const,at:candidate.move.at,number:index+1,label:`KataGo 候选 ${index+1}`}]:[])??[];
  return {allowed,configured:Boolean(origin),phase:current.phase,message:current.message,result,markers,analyze,cancel};
}

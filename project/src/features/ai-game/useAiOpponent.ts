import {useEffect,useMemo,useRef,useState} from 'react';
import type {GameState} from '../../core/content.generated';
import {makeAiMoveRequest,type AiMoveResponse} from '../../core/analysis/ai-contract';
import {analysisOrigin} from '../katago-review/config';
import {requestAiMove} from './client';
import type {AiOptions} from './model';

interface OpponentState {identity:object;phase:'idle'|'loading'|'error';message:string;last?:AiMoveResponse}
/** Identity follows effective history, not just board layout. One request; explicit retry on failure. */
export function useAiOpponent(game:GameState|null,options:AiOptions,enabled:boolean,onMove:(move:AiMoveResponse,expected:GameState)=>void){
  const origin=analysisOrigin(),identity=useMemo(()=>({}),[game,options.humanColor,options.difficulty]);
  const [attempt,setAttempt]=useState(0),[state,setState]=useState<OpponentState>({identity,phase:'idle',message:''});
  const current=state.identity===identity?state:{identity,phase:'idle' as const,message:''};
  const sequence=useRef(0),active=useRef<AbortController|null>(null),latest=useRef({identity,enabled});latest.current={identity,enabled};
  const callback=useRef(onMove);callback.current=onMove;
  useEffect(()=>{
    if(!enabled||!game||game.phase!=='playing'||game.toPlay===options.humanColor)return;
    const ticket=++sequence.current,controller=new AbortController();active.current=controller;
    const live=()=>!controller.signal.aborted&&sequence.current===ticket&&latest.current.identity===identity&&latest.current.enabled;
    let wake:ReturnType<typeof setTimeout>|undefined;
    // Deferring the start lets StrictMode's setup/cleanup cancel its disposable first mount.
    const timer=setTimeout(async()=>{
      if(!live())return;
      if(!origin){setState({identity,phase:'error',message:'本版本尚未接通 AI 服务。可以导出棋局或选择双人对弈。'});return;}
      setState({identity,phase:'loading',message:'AI 正在思考。可随时暂停、悔棋或回看。'});
      wake=setTimeout(()=>{if(live())setState({identity,phase:'loading',message:'仍在等待，服务可能正在从休眠中启动。可以取消后稍后重试。'});},15_000);
      try{
        const request=makeAiMoveRequest(game,options.humanColor,options.difficulty,`ai-${crypto.randomUUID()}`);
        const response=await requestAiMove(origin,request,game,controller.signal);
        if(!live())return;
        setState({identity,phase:'idle',message:'',last:response});callback.current(response,game);
      }catch(error){if(live())setState({identity,phase:'error',message:error instanceof Error?error.message:'AI 暂时未能落子，棋局保留。'});}
      finally{clearTimeout(wake);if(active.current===controller)active.current=null;}
    },180);
    return()=>{clearTimeout(timer);clearTimeout(wake);controller.abort();if(active.current===controller)active.current=null;};
  },[identity,enabled,attempt,origin]);
  const cancel=()=>{sequence.current++;active.current?.abort();active.current=null;setState({identity,phase:'idle',message:'AI 已暂停，棋局保持不变。'});};
  return {...current,configured:!!origin,cancel,retry:()=>setAttempt(v=>v+1)};
}

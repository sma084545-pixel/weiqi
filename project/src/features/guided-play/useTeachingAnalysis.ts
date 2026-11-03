import {useEffect,useMemo,useRef,useState} from 'react';
import type {GameState} from '../../core/content.generated';
import {localPositionAnalyzer,teachingPath} from './analyzer';
import type {PositionAnalyzer,TeachingAnalysis,TeachingConcept} from './types';

export function useTeachingAnalysis(game:GameState|null,focus:readonly TeachingConcept[],enabled:boolean,provider:PositionAnalyzer=localPositionAnalyzer){
  const [attempt,setAttempt]=useState(0),[state,setState]=useState<{game:GameState|null;provider:PositionAnalyzer;focus:readonly TeachingConcept[];phase:'idle'|'loading'|'ready'|'error';value:TeachingAnalysis|null;message:string}>({game:null,provider,focus,phase:'idle',value:null,message:''});
  const cache=useMemo(()=>new WeakMap<GameState,TeachingAnalysis>(),[provider,focus,attempt]),generation=useRef(0),latest=useRef({game,enabled});latest.current={game,enabled};
  useEffect(()=>{
    if(!game||!enabled||game.phase!=='playing')return;
    const ticket=++generation.current,controller=new AbortController();
    const cached=cache.get(game);
    if(cached){setState({game,provider,focus,phase:'ready',value:cached,message:''});return;}
    setState({game,provider,focus,phase:'loading',value:null,message:''});
    const timer=setTimeout(async()=>{
      try{
        const value=await provider.analyzePosition(game,focus,controller.signal);
        if(!value||value.positionKey!==teachingPath(game)||!Array.isArray(value.candidates)||!Array.isArray(value.region)||!Array.isArray(value.urgentGroups))throw Error('Incomplete teaching response');
        if(controller.signal.aborted||ticket!==generation.current||latest.current.game!==game||!latest.current.enabled)return;
        cache.set(game,value);setState({game,provider,focus,phase:'ready',value,message:''});
      }catch{
        if(!controller.signal.aborted&&ticket===generation.current&&latest.current.game===game&&latest.current.enabled)setState({game,provider,focus,phase:'error',value:null,message:'这次提示未能完成，棋局没有改变。可以独立落子或重新请求。'});
      }
    },30);
    return()=>{clearTimeout(timer);controller.abort();generation.current++;};
  },[game,focus,enabled,provider,attempt,cache]);
  const current=state.game===game&&state.provider===provider&&state.focus===focus&&enabled?state:{phase:'idle' as const,value:null,message:''};
  return {...current,retry:()=>setAttempt(n=>n+1)};
}

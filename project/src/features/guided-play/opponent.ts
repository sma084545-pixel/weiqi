import {useEffect,useRef,useState} from 'react';
import type {Coord,GameState} from '../../core/content.generated';
import type {AiOptions} from '../ai-game/model';
import {useAiOpponent} from '../ai-game/useAiOpponent';
import {rankedTeachingMoves} from './analyzer';
import {FOCUS,type GuidedOptions} from './types';

export type GuidedReply={at:Coord|null;source:'local'|'katago';reason:string};
/** Transparent training partner. Every candidate has already passed the shared rules engine. */
export function localTeachingReply(game:GameState,options:GuidedOptions):GuidedReply {
  if(game.phase!=='playing'||game.toPlay===options.humanColor)throw Error('现在不是教学对手的回合。');
  if(game.consecutivePasses>0)return {at:null,source:'local',reason:'教学机器人跟随停手，邀请你核对终局；这不是自动判活。'};
  if(game.moves.length>=200)return {at:null,source:'local',reason:'教学机器人达到本局练习预算，选择停手；你仍可继续或核对终局。'};
  const ranked=rankedTeachingMoves(game,FOCUS[options.goal]);
  const safe=ranked.filter(c=>c.safe||c.concept==='capture');
  const choices=safe.length?safe:ranked;
  if(!choices.length)return {at:null,source:'local',reason:'教学机器人没有找到可试的合法候选，选择停手；不代表棋块已经判活。'};
  const close=choices.filter(c=>c.priority>=choices[0].priority-12);
  const chosen=options.level===1&&close.length>1?close[Math.min(2,close.length-1)]:choices[0];
  return {at:chosen.at,source:'local',reason:'本地教学机器人按提子、救一气棋、连接与角边发展等简单规则落子，不代表段级位。'};
}
export function useGuidedOpponent(game:GameState|null,options:GuidedOptions,enabled:boolean,onMove:(reply:GuidedReply,expected:GameState)=>void){
  const [attempt,setAttempt]=useState(0),[local,setLocal]=useState<{game:GameState|null;phase:'idle'|'loading'|'error';message:string}>({game:null,phase:'idle',message:''});
  const callback=useRef(onMove);callback.current=onMove;
  const latest=useRef({game,enabled});latest.current={game,enabled};
  const generation=useRef(0);
  const aiOptions:AiOptions={humanColor:options.humanColor,difficulty:options.level===1?'relaxed':options.level===2?'standard':'challenge'};
  const remote=useAiOpponent(game,aiOptions,enabled&&options.opponent==='katago',(result,expected)=>callback.current({at:result.move.type==='pass'?null:result.move.at,source:'katago',reason:'KataGo 已按本局真实历史落子。'},expected));
  useEffect(()=>{
    if(!game||!enabled||options.opponent!=='local'||game.phase!=='playing'||game.toPlay===options.humanColor)return;
    const ticket=++generation.current;
    setLocal({game,phase:'loading',message:'教学机器人在想下一手…'});
    const timer=setTimeout(()=>{
      if(ticket!==generation.current||latest.current.game!==game||!latest.current.enabled)return;
      try{const reply=localTeachingReply(game,options);if(ticket!==generation.current||latest.current.game!==game||!latest.current.enabled)return;setLocal({game,phase:'idle',message:''});callback.current(reply,game);}
      catch{setLocal({game,phase:'error',message:'教学机器人本手没有完成，原局面保留。可以重试或撤回。'});}
    },500);
    return()=>{clearTimeout(timer);generation.current++;};
  },[game,enabled,options.opponent,options.humanColor,options.level,options.goal,attempt]);
  return {phase:options.opponent==='katago'?remote.phase:local.game===game?local.phase:'idle' as const,message:options.opponent==='katago'?remote.message:local.game===game?local.message:'',cancel:()=>{generation.current++;remote.cancel();},retry:()=>{setAttempt(n=>n+1);remote.retry();}};
}

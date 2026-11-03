import {useEffect,useMemo,useRef,useState} from 'react';
import type {Coord,GameState} from '../../core/content.generated';
import {RULE_ERROR_ZH,rulesEngine} from '../../core/rules';
import {browserStoragePort} from '../../core/unified-persistence';
import {useGameHistory} from '../../components/GameTimeline';
import {travelAiHistory} from '../ai-game/model';
import {playAt,passTurn,type FullGameFlowResult} from '../full-game/model';
import {addHintUse,guidedHumanMove,retryGuidedMoment,startGuidedSession,updateGuidedMatch} from './model';
import {observeMove,teachingPath} from './analyzer';
import {createGuidedPlayStore,createGuidedProgressStore,parseGuidedSession} from './storage';
import {useGuidedOpponent} from './opponent';
import {useTeachingAnalysis} from './useTeachingAnalysis';
import {DEFAULT_GUIDED_OPTIONS,FOCUS,type GuidedOptions,type GuidedPhase,type GuidedSession,type MoveObservation} from './types';

export function useGuidedPlay(){
  const port=useMemo(()=>browserStoragePort(),[]),store=useMemo(()=>createGuidedPlayStore(port),[port]),progressStore=useMemo(()=>createGuidedProgressStore(port),[port]);
  const [loaded]=useState(()=>store.load());
  const [session,setSession]=useState<GuidedSession|null>(loaded.ok?loaded.session:null);
  const [settings,setSettings]=useState<GuidedOptions>({...DEFAULT_GUIDED_OPTIONS});
  const [colorChoice,setColorChoice]=useState<'B'|'W'|'random'>('B');
  const [paused,setPaused]=useState(!!(loaded.ok&&loaded.session));
  const [notice,setNotice]=useState(loaded.ok&&loaded.session?'已恢复辅助棋局；对手暂停，请按需继续。':loaded.ok?'':loaded.message);
  const [completed,setCompleted]=useState(()=>{const p=progressStore.load();return p.ok?p.value.completed.length:0;});
  const [feedback,setFeedback]=useState<{before:GameState;after:GameState;observation:MoveObservation;awaiting:boolean}|null>(null);
  const [aiExplanation,setAiExplanation]=useState('');
  const [beforeView,setBeforeView]=useState<GameState|null>(null);
  const [pending,setPending]=useState<{game:GameState;at:Coord}|null>(null);
  const [hint,setHint]=useState<{game:GameState;level:number}|null>(null);
  const [mutedOverlayGame,setMutedOverlayGame]=useState<GameState|null>(null);
  const [modal,setModal]=useState<'restart'|'resign'|'import'|null>(null);
  const [incoming,setIncoming]=useState<GuidedSession|null>(null);
  const latest=useRef(session);latest.current=session;
  const gate=useRef(false),hintRef=useRef(hint);hintRef.current=hint;
  const game=session?.match.game??null,options=session?.options??settings,focus=FOCUS[options.goal];
  const history=useGameHistory(game),viewing=history.viewingHistory||!!beforeView;
  const waiting=!!feedback?.awaiting;
  const aiEnabled=!!game&&game.phase==='playing'&&game.toPlay!==options.humanColor&&!paused&&!waiting&&!viewing&&!modal;
  function commit(next:GuidedSession){latest.current=next;setSession(next);}
  function apply(result:FullGameFlowResult){const current=latest.current;if(!current)return false;const next=updateGuidedMatch(current,result);if(next){commit(next);setNotice('');return true;}setNotice(RULE_ERROR_ZH[!result.ok?result.error.code as keyof typeof RULE_ERROR_ZH:'INVALID_ARGUMENT']??'操作未完成，原棋局保持不变。');return false;}
  const opponent=useGuidedOpponent(game,options,aiEnabled,(reply,expected)=>{
    const current=latest.current;if(!current||current.match.game!==expected)return;
    const result=reply.at?playAt(current.match,reply.at):passTurn(current.match);
    if(result.ok&&result.value.game){
      const next=result.value.game,observation=observeMove(expected,next,next.moves.at(-1)!,focus);
      const meaningful=observation&&observation.kind!=='ordinary';
      const text=observation?.atariTargets?`对手这一步让你的 ${observation.atariTargets} 块棋只剩一口气。你能找出那口气吗？`:observation?.captured?`对手刚提走 ${observation.captured} 颗棋。回看它们最后一口气是怎样被占掉的。`:observation?.connections?'对手把自己的棋直接连在一起了。你自己的棋有没有需要照顾的地方？':reply.at===null?reply.reason:'';
      setAiExplanation(options.level===3&&!observation?.atariTargets?'':meaningful||reply.at===null?text:'');
      setFeedback(null);setHint(null);setBeforeView(null);setPending(null);apply(result);
    }else{setPaused(true);apply(result);}
  });
  useEffect(()=>{gate.current=false;},[game]);
  useEffect(()=>{if(!session)return;const saved=store.save(session);if(!saved.ok)setNotice(saved.message);},[session,store]);
  useEffect(()=>{if(!session||game?.phase!=='finished')return;const saved=progressStore.record(session);if(saved.ok)setCompleted(saved.value.completed.length);else setNotice(saved.message);},[session,game?.phase,progressStore]);
  const analysisGame=beforeView??game;
  const analysisEnabled=!!analysisGame&&analysisGame.phase==='playing'&&analysisGame.toPlay===options.humanColor&&!modal&&(!history.viewingHistory||!!beforeView);
  const analysis=useTeachingAnalysis(analysisGame,focus,analysisEnabled);
  const hintLevel=hint?.game===analysisGame?hint.level:0;
  const humanAllowed=!!game&&game.phase==='playing'&&game.toPlay===options.humanColor&&!viewing&&!modal;
  const stop=()=>{opponent.cancel();setPaused(true);};
  const clearTeaching=()=>{setFeedback(null);setAiExplanation('');setHint(null);hintRef.current=null;setBeforeView(null);setPending(null);};
  const play=(at:Coord|null,acceptRisk=false)=>{
    const current=latest.current;
    if(!current||!humanAllowed||current.match.game!==game||gate.current||!game)return;
    const result=guidedHumanMove(current,at);
    if(!result.ok){apply(result);return;}
    const next=result.value.game!;
    const observation=observeMove(game,next,next.moves.at(-1)!,focus);
    if(at&&options.level===1&&observation?.kind==='danger'&&!acceptRisk){setPending({game,at});setNotice('棋局还没有改变。你可以再想一想，也可以坚持原来的落点。');return;}
    gate.current=true;setPending(null);setHint(null);hintRef.current=null;setBeforeView(null);setAiExplanation('');
    const significant=!!observation&&(options.level===3?observation.kind==='danger':observation.kind!=='ordinary');
    setFeedback(significant&&observation?{before:game,after:next,observation,awaiting:next.phase==='playing'}:null);
    setPaused(false);apply(result);
  };
  const travel=(direction:'undo'|'redo',round=false)=>{
    const current=latest.current;if(!current)return;stop();clearTeaching();
    apply(travelAiHistory(current.match,{humanColor:options.humanColor,difficulty:'relaxed'},direction,round));
  };
  const goTo=(index:number)=>{stop();clearTeaching();history.goTo(index);};
  const requestHint=(final=false)=>{
    if(!analysisEnabled||!analysis.value||!analysisGame)return;
    const current=latest.current;if(!current)return;
    const old=hintRef.current?.game===analysisGame?hintRef.current.level:0;
    if(final?old!==3:old>=3)return;
    const level=final?4:Math.min(3,old+1);
    const value={game:analysisGame,level};hintRef.current=value;setHint(value);
    // Before-move feedback previews have their own exact path in the log.
    if(analysisGame===game)commit(addHintUse(current,level as 1|2|3|4));
    else commit({...current,revision:current.revision+1,hintUses:[...current.hintUses,{path:teachingPath(analysisGame),index:analysisGame.moves.length,level:level as 1|2|3|4}].slice(-500)});
  };
  const hideHints=()=>{setHint(null);hintRef.current=null;setMutedOverlayGame(game);};
  const continueAfterFeedback=()=>{setBeforeView(null);setFeedback(f=>f?{...f,awaiting:false}:null);hideHints();setPaused(false);};
  const inspectBefore=()=>{if(!feedback||!latest.current)return;stop();setBeforeView(feedback.before);const value={game:feedback.before,level:1};setHint(value);hintRef.current=value;const current=latest.current;commit({...current,revision:current.revision+1,hintUses:[...current.hintUses,{path:teachingPath(feedback.before),index:feedback.before.moves.length,level:1 as const}].slice(-500)});};
  const start=()=>{
    const randomColor=colorChoice==='random'?(crypto.getRandomValues(new Uint8Array(1))[0]%2===0?'B':'W'):colorChoice;
    const next=startGuidedSession({...settings,humanColor:randomColor},`GUIDED-${crypto.randomUUID()}`);
    opponent.cancel();clearTeaching();commit(next);setPaused(false);setNotice('这是一盘正常围棋。先想目标，需要时再请求提示。');
  };
  const newSetup=()=>{stop();clearTeaching();if(session)setSettings({...session.options});latest.current=null;setSession(null);setModal(null);setNotice('原棋局仍留在本机，开始新一盘前可先读取或导出。');};
  const retryMoment=(index:number)=>{
    const current=latest.current;if(!current)return;const archived=store.archive(current);if(!archived.ok){setNotice(archived.message);return;}
    try{const next=retryGuidedMoment(current,index,`GUIDED-${crypto.randomUUID()}`);stop();clearTeaching();commit(next);setPaused(true);setNotice('原局已单独归档。这里是从同一合法历史开始的新变化，可以自己重新选择。');}catch(e){setNotice(e instanceof Error?e.message:'未能开始变化，原局保留。');}
  };
  const restore=()=>{const r=store.load();if(r.ok&&r.session){stop();clearTeaching();commit(r.session);setPaused(true);setNotice('辅助棋局已恢复，对手暂停。');}else setNotice(r.ok?'本设备还没有已保存的辅助对局。':r.message);};
  const returnOriginal=()=>{const current=latest.current;if(!current?.parentSessionId)return;const original=store.readArchive(current.parentSessionId);if(!original.ok||!original.session||original.session.match.game?.phase!=='finished'){setNotice(original.ok?'这条归档不是原来的完整终局，当前变化保留。':original.message);return;}const saved=store.saveVariation(current);if(!saved.ok){setNotice(saved.message);return;}stop();clearTeaching();commit(original.session);setNotice('已回到原局报告；刚才的变化也已单独保存在本机备份中。');};
  const importText=(text:string)=>{const r=parseGuidedSession(text);if(!r.ok){setNotice(r.message);return;}if(!r.session)return;stop();setIncoming(r.session);setModal('import');};
  const confirmImport=()=>{if(incoming){clearTeaching();commit(incoming);setPaused(true);setNotice('已按规则重放导入；对手暂停。');}setIncoming(null);setModal(null);};
  const phase:GuidedPhase=!game?'USER_THINKING':game.phase==='finished'?'GUIDED_PLAY_SUMMARY':viewing?'HISTORY':game.phase==='scoring'?'SCORING':waiting?'USER_MOVE_FEEDBACK':game.toPlay!==options.humanColor?'AI_THINKING':hintLevel>0?'USER_REQUESTED_HINT':aiExplanation?'AI_MOVE_EXPLANATION':'USER_THINKING';
  return {session,game,options,settings,setSettings,colorChoice,setColorChoice,focus,completed,notice,setNotice,paused,setPaused,feedback,aiExplanation,beforeView,pending,hintLevel,analysis,history,viewing,waiting,humanAllowed,phase,modal,setModal,incoming,setIncoming,opponent,showDanger:mutedOverlayGame!==game,
    start,play,travel,goTo,requestHint,hideHints,continueAfterFeedback,inspectBefore,stop,clearTeaching,newSetup,retryMoment,returnOriginal,restore,importText,confirmImport,apply,
    save:()=>{if(session){const r=store.save(session);setNotice(r.ok?'辅助棋局与提示记录已保存到当前设备。':r.message);}},
    confirmPending:()=>{if(pending&&pending.game===latest.current?.match.game)play(pending.at,true);},cancelPending:()=>{setPending(null);setNotice('');},
    visibleObservation:feedback&&feedback.after===game&&!history.viewingHistory?feedback.observation:null,
  };
}

import {createGuidedSessionStore} from './game-storage';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Board} from '../../components/Board';
import {GameTimeline,useGameHistory} from '../../components/GameTimeline';
import {RULE_ERROR_ZH,undo,type BoardMarker} from '../../core/rules';
import {browserStoragePort} from '../../core/unified-persistence';
import {playAt,passTurn,resignGame,restoreFullGame,toggleDeadGroup,confirmScoreFor,resumeDisputedPlay,scorePreview,type FullGameMatch} from '../full-game/model';
import {ScoreDetails} from '../full-game/FullGame';
import {botMatch,newGuidedGame,teachingPause} from './teaching-bot';

export function GuidedGame({projector=false,onFinished}:{projector?:boolean;onFinished:()=>void}){
 const [loaded]=useState(()=>createGuidedSessionStore(browserStoragePort()).load());
 const [match,setMatch]=useState<FullGameMatch|null>(loaded.ok?loaded.match:null),[notice,setNotice]=useState(loaded.ok?'':loaded.message),[seen,setSeen]=useState<string[]>(loaded.ok?loaded.seen:[]),[reason,setReason]=useState(''),[zoom,setZoom]=useState(.85),[viewKey,setViewKey]=useState(0),[pending,setPending]=useState<'restart'|'resign'|null>(null);
 const gate=useRef(false),finished=useRef(false),game=match?.game??null;
 const history=useGameHistory(game),pause=game?teachingPause(game,seen):null;
 useEffect(()=>{gate.current=false;},[game]);
 useEffect(()=>{if(!game||!match)return;const saved=createGuidedSessionStore(browserStoragePort()).save(match,seen);if(!saved.ok)setNotice(saved.message);},[match,seen]);
 useEffect(()=>{if(game?.phase==='finished'&&!finished.current){finished.current=true;onFinished();}},[game,onFinished]);
 useEffect(()=>{
  if(!match||!game||game.phase!=='playing'||game.toPlay!=='W'||history.viewingHistory||pending)return;
  const expected=game;
  const timer=window.setTimeout(()=>setMatch(previous=>{if(!previous||previous.game!==expected)return previous;const result=botMatch(previous);if(!result.ok){setNotice(result.message);return previous;}setNotice(result.reason);return result.match;}),450);
  return()=>window.clearTimeout(timer);
 },[game,history.viewingHistory,pending]);
 const preview=useMemo(()=>match&&game&&(game.phase==='scoring'||game.result?.reason==='area')?scorePreview(match):null,[match,game]);
 const apply=(result:ReturnType<typeof playAt>)=>{if(result.ok){setMatch(result.value);setNotice('');}else setNotice('message' in result.error?String(result.error.message):RULE_ERROR_ZH[result.error.code as keyof typeof RULE_ERROR_ZH]??'操作没有完成，原棋局保留。');};
 const start=()=>{const r=newGuidedGame();if(r.ok){setMatch(r.value);setSeen([]);setReason('');setNotice('');finished.current=false;}else setNotice('起点未通过规则检查，未改变原棋局。');};
 const backward=()=>{if(!game)return;let s=game;let count=0;do{const r=undo(s);if(!r.ok)break;s=r.value;count++;}while(s.toPlay==='W'&&s.moves.length&&count<2);apply(restoreFullGame(s));};
 const download=()=>{if(!game)return;const url=URL.createObjectURL(new Blob([JSON.stringify(game,null,2)+'\n'],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='13路引导实战.json';a.click();URL.revokeObjectURL(url);};
 const markers:BoardMarker[]=history.viewingHistory?history.frame?.markers??[]:[...(game?.lastMove?.type==='place'?[{markerId:'last',kind:'last-move' as const,at:game.lastMove.at,label:'最后一手'}]:[]),...(pause?.at?[{markerId:'pause',kind:'target' as const,at:pause.at,label:'当前观察目标'}]:[]),...(match?.scoring.deadStones??[]).map((at,i)=>({markerId:`dead-${i}`,kind:'target' as const,at,label:'待人工确认的死子'}))];
 const board=history.viewingHistory?history.frame?.board:game?.board;
 return <section className="adv-guided-game" data-testid="guided-13-game" data-phase={game?.phase??'setup'} data-turn={game?.toPlay??''}>
  <h3>Guided 13×13 Game · 一盘综合实战</h3><p>你执黑，本地教学机器人执白。它按提子、救一气棋和角边发展等简单规则落子，不是 KataGo，也不代表某个段级位；不会上传棋局。关键观察点最多四类，不会每步弹窗。</p>
  {!game||!match?<button type="button" className="primary-action" onClick={start}>开始13路引导实战</button>:<>
   <p className="adv-turn">完整13路 · 贴目0 · {game.phase==='playing'?game.toPlay==='B'?'轮到你（黑方）':'教学机器人（白方）准备落子':game.phase==='scoring'?'终局确认中':'本局已结束'}</p>
   {pause&&!history.viewingHistory&&<section className="adv-teaching-pause" aria-label="关键节点观察"><h4>{pause.title}</h4><p>{pause.question}</p><label htmlFor="guided-plan">我的计划（可选）<input id="guided-plan" value={reason} maxLength={300} onChange={e=>setReason(e.target.value)}/></label><button type="button" onClick={()=>{setSeen([...seen,pause.id]);setReason('');setNotice(pause.explanation);}}>根据观察，继续对弈</button><button type="button" onClick={()=>{setSeen([...seen,pause.id]);setReason('');}}>这次先继续下棋</button></section>}
   <div className="adv-game-layout"><div className="adv-board-panel"><Board size={13} board={board??game.board} label={`13路引导实战，${history.viewingHistory?'只读回看':game.toPlay==='B'?'黑方操作':'白方教学机器人'}`} mode={history.viewingHistory||game.phase==='finished'?'readonly':game.phase==='scoring'?'mark':'play'} disabled={!!pending||history.viewingHistory||game.phase==='finished'||(game.phase==='playing'&&(game.toPlay!=='B'||!!pause))} selected={null} onSelect={at=>{if(game.phase==='scoring')apply(toggleDeadGroup(match,at));}} onPlay={at=>{if(gate.current||game.toPlay!=='B'||pause)return;gate.current=true;const r=playAt(match,at);if(!r.ok)gate.current=false;apply(r);}} markers={markers} resetViewKey={viewKey} zoom={zoom} displayMode={projector?'projector':'standard'}/><div className="adv-view-controls"><button type="button" disabled={zoom>=1.5} onClick={()=>setZoom(z=>Math.min(1.5,z+.25))}>放大棋盘</button><button type="button" disabled={zoom<=.75} onClick={()=>setZoom(z=>Math.max(.75,z-.25))}>缩小棋盘</button><button type="button" onClick={()=>{setZoom(.85);setViewKey(k=>k+1);}}>复位视图</button><span>完整13路；放大后仅在棋盘内滑动。</span></div>{history.frame&&<GameTimeline max={history.max} value={history.index} onChange={history.goTo} title={history.frame.title} description={history.frame.description}/>}</div>
   <div className="adv-game-controls"><h4>本局操作</h4>{game.phase==='playing'&&!history.viewingHistory&&<><button type="button" disabled={!!pending||game.toPlay!=='B'||!!pause} onClick={()=>apply(passTurn(match))}>停一手，邀请共同收尾</button><button type="button" disabled={!!pending||game.toPlay!=='B'} onClick={()=>setPending('resign')}>我认输</button></>}
    <button type="button" disabled={!!pending||!game.moves.length} onClick={backward}>撤回最近回合</button><button type="button" onClick={download}>导出完整棋局</button><button type="button" onClick={()=>setPending('restart')}>另开一局</button><a href="#/play/free">随时转到自由双人对弈 →</a>
    {game.phase==='scoring'&&!history.viewingHistory&&<section><h4>人工核对，两方确认</h4><p>机器人不自动判断死活。点击整块标记死子；请你与同伴核对双方清单，不确定就恢复演示。改动会取消旧确认。</p>{match.scoring.confirmedBy.length===0?<button type="button" onClick={()=>apply(confirmScoreFor(match,'B'))}>已核对黑方清单</button>:<button type="button" onClick={()=>apply(confirmScoreFor(match,'W'))}>已核对白方同一清单并计分</button>}<button type="button" onClick={()=>apply(resumeDisputedPlay(match,'B'))}>有争议，恢复原盘面对弈</button></section>}
   </div></div>
   {notice&&<p className="adv-notice" role="status">{notice}</p>}
   {pending&&<div className="adv-confirm" role="group" aria-label="确认本局操作"><p>{pending==='restart'?'重开会替换这盘引导棋，可先导出。':'认输将结束本局，不编造数子得分。'}</p><button type="button" onClick={()=>{if(pending==='restart')start();else apply(resignGame(match));setPending(null);}}>{pending==='restart'?'确认重开':'确认我认输'}</button><button type="button" onClick={()=>setPending(null)}>取消</button></div>}
   {preview?.ok&&!history.viewingHistory&&<ScoreDetails score={preview.value} captures={game.captures} final={game.phase==='finished'}/>}
   {game.phase==='finished'&&<div className="adv-finished" role="status"><h4>已完成一盘13路练习</h4><p>{game.result?.reason==='resign'?'本局以认输结束；没有编造面积分。':'双方清单确认后已按面积计分。'}可以回看关键节点、导出棋谱，再到课程总结选择自己的学习标记。</p></div>}
  </>}
 </section>;
}

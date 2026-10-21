import {useEffect,useMemo,useRef,useState} from 'react';
import {Board} from '../../components/Board';
import {GameTimeline,useGameHistory} from '../../components/GameTimeline';
import type {Color,Coord} from '../../core/content.generated';
import {RULE_ERROR_ZH} from '../../core/rules';
import {StepPlayer} from '../capture-lab/StepPlayer';
import {CAPTURE_LAB_ROUTE,FULL_GAME_ROUTE,ROUTE_ROUTE} from '../learning-hub/registry';
import {beginRound,configureMatch,confirmUndo,createCaptureMatch,passTurn,playAt,refuseUndo,requestUndo,restartRound,seatForColor,type CaptureFlowError,type CaptureMatch,type CaptureSize} from './model';
import {createMoveReview,libertyMarkers,winningExplanation} from './review';
import './CaptureGame.css';

const colorName=(color:Color)=>color==='B'?'黑方':'白方';
const flowError=(error:CaptureFlowError)=>{
  if(error.code==='ROUND_NOT_STARTED')return '请先由两位伙伴共同确认本局设置。';
  if(error.code==='SETTINGS_LOCKED')return '本局已经开始；尺寸和显示气设置要到新一局再选。';
  if(error.code==='NO_MOVE_TO_UNDO')return '当前还没有可以撤回的着法。';
  if(error.code==='UNDO_NOT_REQUESTED')return '请先提出悔棋申请。';
  if(error.code==='UNDO_CONFIRMATION_ORDER')return '请按屏幕顺序由黑方、白方依次确认。';
  return RULE_ERROR_ZH[error.code]??'操作未完成，原状态已保留。';
};

function UndoDialog({match,onChange,onNotice}:{match:CaptureMatch;onChange:(next:CaptureMatch)=>void;onNotice:(text:string|null)=>void}){
  const ref=useRef<HTMLDialogElement>(null),request=match.undoRequest;
  useEffect(()=>{const dialog=ref.current;if(!dialog)return;if(request&&!dialog.open)dialog.showModal();if(!request&&dialog.open)dialog.close();},[request]);
  const confirm=(color:Color)=>{const result=confirmUndo(match,color);if(result.ok){onChange(result.value);onNotice(null);}else onNotice(flowError(result.error));};
  const refuse=()=>{onChange(refuseUndo(match));onNotice(null);};
  return <dialog ref={ref} className="undo-dialog" aria-labelledby="undo-title" onCancel={event=>{event.preventDefault();refuse();}}>
    <h2 id="undo-title">双方确认悔棋</h2>
    <p>这是同一设备上的操作约定，不验证任何人的身份。原盘面要等双方都同意后才会撤回一手。</p>
    <ol className="undo-steps"><li className={request?.confirmations.includes('B')?'done':'current'}><strong>1</strong><span>黑方确认</span></li><li className={request?.confirmations.includes('B')?'current':''}><strong>2</strong><span>白方确认</span></li><li><strong>3</strong><span>准确撤回一手</span></li></ol>
    {request?.confirmations.length===0?<button type="button" className="primary-action" onClick={()=>confirm('B')}>黑方确认悔棋</button>:<button type="button" className="primary-action" onClick={()=>confirm('W')}>白方确认悔棋</button>}
    <button type="button" className="outline-action" onClick={refuse}>拒绝，保留当前局面</button>
  </dialog>;
}

export function CaptureGame({projector=false}:{projector?:boolean}){
  const [match,setMatch]=useState(()=>createCaptureMatch());
  const [notice,setNotice]=useState<string|null>(null);
  const [reviewPlaying,setReviewPlaying]=useState(false);
  const [showFullGameHelp,setShowFullGameHelp]=useState(false);
  const [restartConfirm,setRestartConfirm]=useState(false);
  const moveGate=useRef(false);
  useEffect(()=>{moveGate.current=false;},[match.game.revision]);
  const review=useMemo(()=>createMoveReview(match.game,5),[match.game]);
  const history=useGameHistory(match.game);
  const reviewStart=match.game.moves.length-review.length+1;
  const reviewStep=Math.max(0,history.index-reviewStart);
  const setReviewStep=(step:number)=>history.goTo(reviewStart+step);
  useEffect(()=>{setReviewPlaying(false);},[match.game]);
  const finished=match.game.phase==='finished';
  const frame=history.frame;
  const board=frame?.board??match.game.board;
  const win=match.game.result?.reason==='first-capture'?match.game.result.winner:null;
  const explanation=match.winningEvent&&win?winningExplanation(match.winningEvent,win,match.game.size):null;
  const lastMarker=!finished&&match.game.lastMove?.type==='place'?[{markerId:'game-last',kind:'last-move' as const,at:match.game.lastMove.at,label:'最后一手'}]:[];
  const markers=[...(frame?.markers??lastMarker),...(finished&&!history.viewingHistory&&explanation?explanation.markers:[]),...(match.settings.showLiberties?libertyMarkers(board):[])];
  const apply=(result:ReturnType<typeof playAt>)=>{if(result.ok){setMatch(result.value);setNotice(null);}else setNotice(flowError(result.error));};
  const play=(at:Coord)=>{if(moveGate.current||history.viewingHistory)return;moveGate.current=true;const result=playAt(match,at);if(!result.ok)moveGate.current=false;apply(result);};
  const start=()=>apply(beginRound(match));
  const configure=(settings:{size:CaptureSize;showLiberties:boolean})=>apply(configureMatch(match,settings));
  const undo=()=>apply(requestUndo(match));
  const pass=()=>apply(passTurn(match));
  const restart=(swap:boolean)=>{setMatch(restartRound(match,swap));setNotice(null);setRestartConfirm(false);setShowFullGameHelp(false);};
  const status=history.viewingHistory?`只读复盘 · ${frame?.title}`:finished?(win?`${colorName(win)}获胜`:'本轮无胜者'):match.started?`当前：${colorName(match.game.toPlay)} · 伙伴${seatForColor(match,match.game.toPlay)}`:'等待共同确认开局';

  return <div className="capture-game-page" data-phase={match.game.phase} data-move-count={match.game.moves.length} data-game-revision={match.game.revision}>
    <UndoDialog match={match} onChange={setMatch} onNotice={setNotice}/>
    <section className="capture-game-hero"><p><a href={ROUTE_ROUTE}>← 返回学习路线</a></p><h1>双人吃子小游戏</h1><h2>先提到棋子者获胜；这是入门小游戏</h2><p>两位伙伴在同一设备轮流落子。这里不计算面积，也不把本小游戏获胜等同于完整围棋胜利。</p></section>
    <section className="capture-game-layout">
      <div className="capture-game-board"><div className="game-board-heading"><div><span>同屏双人 · {match.settings.size}路</span><h2>对局棋盘</h2></div><strong>{status}</strong></div>
        <Board size={match.settings.size} board={board} label={`双人吃子小游戏，完整${match.settings.size}路棋盘，${status}`} mode={match.started&&!finished&&!history.viewingHistory?'play':'readonly'} disabled={!match.started||finished||history.viewingHistory} selected={null} onSelect={()=>{}} onPlay={play} markers={markers} showCoordinates displayMode={projector?'projector':'standard'}/>
        <div className="game-legend"><span><i className="legend-stone black"/>黑方 · 伙伴{seatForColor(match,'B')}</span><span><i className="legend-stone white"/>白方 · 伙伴{seatForColor(match,'W')}</span><span><i className="legend-last"/>最后一手</span>{match.settings.showLiberties&&<span><i className="legend-liberty"/>辅助气环</span>}</div>
        {match.started&&frame&&<GameTimeline max={history.max} value={history.index} onChange={index=>{setReviewPlaying(false);history.goTo(index);}} title={frame.title} description={frame.description}/>}
      </div>
      <aside className="capture-game-controls" aria-label="吃子小游戏控制">
        <section className="turn-card"><span className={`turn-stone ${(frame?.toPlay??match.game.toPlay)==='B'?'black':'white'}`}/><div><strong>{status}</strong><p>{history.viewingHistory?'正在只读回看；请返回当前局面后继续。':finished?'盘面已锁定并保留，可回看或申请悔棋。':match.started?'轮到这一方落子。':'确认后由黑方先下。'}</p></div></section>
        <fieldset className="round-settings" disabled={match.started}><legend>本局共同设置</legend><label htmlFor="capture-size">棋盘尺寸<select id="capture-size" value={match.settings.size} onChange={event=>configure({...match.settings,size:Number(event.target.value) as CaptureSize})}><option value="9">9路（默认）</option><option value="5">5路（短练习）</option></select></label><label className="assist-setting" htmlFor="capture-liberties"><input id="capture-liberties" type="checkbox" checked={match.settings.showLiberties} onChange={event=>configure({...match.settings,showLiberties:event.target.checked})}/><span><strong>显示气辅助</strong><small>本局开始后锁定，并一直在屏幕上显示选择。</small></span></label></fieldset>
        {!match.started&&<button type="button" className="start-round" onClick={start}>双方确认，开始本局</button>}
        <section className="game-actions"><h2>本局操作</h2><div><button type="button" onClick={pass} disabled={!match.started||finished||history.viewingHistory}>停一手</button><button type="button" onClick={undo} disabled={!match.game.moves.length||history.viewingHistory}>申请悔棋</button><button type="button" onClick={()=>setRestartConfirm(true)}>重开一局</button></div>{restartConfirm&&<div className="restart-confirm" role="group" aria-label="确认重开"><p>重开会清空本局盘面、提子、历史和结果。</p><button type="button" onClick={()=>restart(false)}>确认重开</button><button type="button" onClick={()=>setRestartConfirm(false)}>取消</button></div>}</section>
        <div className="game-message" role="status" aria-live="polite"><strong>当前说明</strong><span>{history.viewingHistory?frame?.description:notice??match.message}</span></div>
      </aside>
    </section>
    {finished&&<section className="capture-finish" aria-labelledby="capture-finish-title"><div className="finish-heading"><div><span>本轮结束</span><h2 id="capture-finish-title">{win?`${colorName(win)} · 伙伴${seatForColor(match,win)}获胜`:'双方连续停手，本轮无胜者'}</h2></div><p>{win?'先提到任意数量棋子，因此本手立即结束本局。':'可以直接重开，再尝试主动寻找最后一口气。'}</p></div>
      {explanation&&!history.viewingHistory&&<div className="capture-cause"><h3>本次吃子的说明</h3><p>{explanation.text}</p></div>}
      {review.length>0&&history.index>=reviewStart&&<><StepPlayer frames={review} step={reviewStep} onStepChange={setReviewStep} playing={reviewPlaying} onPlayingChange={value=>{if(value&&history.index<reviewStart)history.goTo(reviewStart);setReviewPlaying(value);}} reducedMotion={window.matchMedia('(prefers-reduced-motion: reduce)').matches} onComplete={()=>{}} title="回看最后最多 5 手" description="回看只切换保存的历史盘面，不会新增、撤回或重做真实着法。" playLabel="播放回看" intervalMs={850}/><p className="review-explanation">{history.viewingHistory?frame?.description:review[reviewStep]?.explanation}</p></>}
      <div className="finish-actions"><button type="button" className="primary-action" onClick={()=>restart(true)}>交换黑白再来一局</button><button type="button" className="outline-action" onClick={()=>setShowFullGameHelp(value=>!value)} aria-expanded={showFullGameHelp}>尝试完整 9×9</button></div>
      {showFullGameHelp&&<div className="full-game-help"><strong>完整小棋盘对弈已经可用。</strong><p>它支持9、13、19路、双停终局确认和面积明细。本小游戏的胜负不会带入完整对局。</p><a href={FULL_GAME_ROUTE}>打开完整小棋盘对弈</a></div>}
    </section>}
    <section className="capture-game-about"><h2>玩法边界</h2><p>使用 GO-CLUB-AREA-1 的合法落子、禁自杀和位置超级劫。首个成功提子者立即获胜；连续两次停手无胜者。本页没有倒计时、公开排名、面积得分、账号或强制音效。</p><a href={CAPTURE_LAB_ROUTE}>想先看提子步骤？返回提子实验室</a></section>
  </div>;
}

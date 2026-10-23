import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {Board} from '../../components/Board';
import {GameTimeline,useGameHistory} from '../../components/GameTimeline';
import type {AreaScore,Color,Coord,StoneValue} from '../../core/content.generated';
import {displayCoord} from '../../core/coordinates';
import {RULE_ERROR_ZH,type BoardMarker} from '../../core/rules';
import {CAPTURE_GAME_ROUTE,HOME_ROUTE,ROUTE_ROUTE} from '../learning-hub/registry';
import {
  FULL_GAME_SIZES,confirmScoreFor,confirmUndo,createFullGameMatch,passTurn,playAt,refuseUndo,requestUndo,resignGame,
  restartToSetup,restoreFullGame,resumeDisputedPlay,scorePreview,setBoardSize,setKomi,setSetupKind,startFullGame,
  toggleDeadGroup,toggleHandicapStone,type FullGameFlowError,type FullGameMatch,type FullGameSize,type SetupKind,
} from './model';
import {createFullGameStore,fullGameJson} from './storage';
import {browserStoragePort} from '../../core/unified-persistence';
import {useKataGoReview} from '../katago-review/useKataGoReview';
import {KataGoReview} from '../katago-review/KataGoReview';
import './FullGame.css';

const colorName=(color:Color)=>color==='B'?'黑方':'白方';
const flowError=(error:FullGameFlowError)=>{
  if(error.code==='GAME_NOT_STARTED')return '请先完成开局设置。';
  if(error.code==='SETTINGS_LOCKED')return '对局已经开始；尺寸、让子和贴目不能赛中修改。';
  if(error.code==='SIZE_CHANGE_REQUIRES_CLEAR')return '这个更改会清除已摆的起始黑子，请先确认。';
  if(error.code==='NO_HANDICAP_STONES')return '自由放置让子模式至少需要一颗起始黑子。';
  if(error.code==='NOT_A_STONE')return '这里是空点；终局时请点击一颗棋子来标记它所属的整块。';
  if(error.code==='UNDO_NOT_REQUESTED')return '请先提出悔棋申请。';
  if(error.code==='UNDO_CONFIRMATION_ORDER')return '请按黑方、白方的顺序确认悔棋。';
  if(error.code==='NO_MOVE_TO_UNDO')return '当前没有可以撤回的对局操作。';
  if(error.code==='SCORE_CONFIRMATION_ORDER')return '请先由黑方确认当前清单，再由白方确认。';
  if(error.code==='SAVE_NOT_AVAILABLE')return '当前设备无法保存；对局仍保留在本页。';
  return RULE_ERROR_ZH[error.code]??'操作未完成，原状态已保留。';
};
const setupBoard=(match:FullGameMatch):StoneValue[][]=>{
  const board=Array.from({length:match.setup.size},()=>Array<StoneValue>(match.setup.size).fill(null));
  for(const at of match.setup.handicapStones)board[at.row][at.col]='B';return board;
};

function UndoDialog({match,onChange,onNotice}:{match:FullGameMatch;onChange:(next:FullGameMatch)=>void;onNotice:(text:string|null)=>void}){
  const ref=useRef<HTMLDialogElement>(null),request=match.undoRequest;
  useEffect(()=>{const node=ref.current;if(!node)return;if(request&&!node.open)node.showModal();if(!request&&node.open)node.close();},[request]);
  const confirm=(color:Color)=>{const result=confirmUndo(match,color);if(result.ok){onChange(result.value);onNotice(null);}else onNotice(flowError(result.error));};
  const refuse=()=>{onChange(refuseUndo(match));onNotice(null);};
  return <dialog ref={ref} className="full-dialog" aria-labelledby="full-undo-title" onCancel={event=>{event.preventDefault();refuse();}}>
    <h2 id="full-undo-title">双方确认悔棋</h2><p>这是同一设备上的现场操作约定，不是身份认证。只有双方都同意，规则引擎才撤回最近一项操作。</p>
    <ol className="confirmation-steps"><li className={request?.confirmations.includes('B')?'done':'current'}>黑方确认</li><li className={request?.confirmations.includes('B')?'current':''}>白方确认</li><li>恢复完整状态</li></ol>
    {request?.confirmations.length===0?<button type="button" className="primary-action" onClick={()=>confirm('B')}>黑方确认悔棋</button>:<button type="button" className="primary-action" onClick={()=>confirm('W')}>白方确认悔棋</button>}
    <button type="button" className="outline-action" onClick={refuse}>拒绝，保留当前状态</button>
  </dialog>;
}

function ConfirmDialog({open,title,description,confirmLabel,onConfirm,onClose}:{open:boolean;title:string;description:string;confirmLabel:string;onConfirm:()=>void;onClose:()=>void}){
  const ref=useRef<HTMLDialogElement>(null),titleId=useId();
  useEffect(()=>{const node=ref.current;if(!node)return;if(open&&!node.open)node.showModal();if(!open&&node.open)node.close();},[open]);
  return <dialog ref={ref} className="full-dialog" aria-labelledby={titleId} onCancel={event=>{event.preventDefault();onClose();}}><h2 id={titleId}>{title}</h2><p>{description}</p><div className="dialog-actions"><button type="button" className="primary-action" onClick={onConfirm}>{confirmLabel}</button><button type="button" className="outline-action" onClick={onClose}>取消</button></div></dialog>;
}

export function ScoreDetails({score,captures,final}:{score:AreaScore;captures:{B:number;W:number};final:boolean}){
  const result=score.winner==='draw'?'和棋':`${score.winner==='B'?'黑方':'白方'}领先 ${Math.abs(score.difference)} 目`;
  return <section className={`score-details${final?' final':''}`} aria-label={final?'最终面积计分':'面积计分预览'}>
    <div className="score-title"><div><span>{final?'双方已确认':'当前预览'}</span><h2>{final?'最终面积计分':'面积计分预览'}</h2></div><strong>{result}</strong></div>
    <div className="score-grid"><div><span>黑活子</span><strong>{score.blackStones}</strong></div><div><span>黑方围空</span><strong>{score.blackTerritory.length}</strong></div><div><span>黑方总分</span><strong>{score.blackTotal}</strong></div><div><span>白活子</span><strong>{score.whiteStones}</strong></div><div><span>白方围空</span><strong>{score.whiteTerritory.length}</strong></div><div><span>白方总分</span><strong>{score.whiteTotal}</strong></div><div><span>中立点</span><strong>{score.neutralPoints.length}</strong></div><div><span>贴目</span><strong>{score.komi}</strong></div><div><span>黑减白</span><strong>{score.difference}</strong></div></div>
    <p className="capture-info">提子信息：黑方提 {captures.B} 子，白方提 {captures.W} 子。面积计分不把提子数再加一次。</p>
  </section>;
}

function recoverFullGame(){
  const fallback=createFullGameMatch();
  try{const loaded=createFullGameStore(browserStoragePort()).load();if(!loaded.ok||!loaded.value)return fallback;const restored=restoreFullGame(loaded.value);return restored.ok?restored.value:fallback;}catch{return fallback;}
}

export function FullGame({projector=false,freePlay=false}:{projector?:boolean;freePlay?:boolean}){
  const [match,setMatch]=useState(recoverFullGame);
  const [notice,setNotice]=useState<string|null>(null);
  const [confirmAction,setConfirmAction]=useState<'resign'|'restart'|null>(null);
  const [discardAction,setDiscardAction]=useState<{type:'size';size:FullGameSize}|{type:'kind';kind:SetupKind}|null>(null);
  const moveGate=useRef(false);
  const game=match.game;
  useEffect(()=>{moveGate.current=false;},[game?.revision]);
  const history=useGameHistory(game);
  const analysis=useKataGoReview(game,history.index,freePlay);
  const reviewIndex=history.viewingHistory?history.index:null;
  const frame=history.viewingHistory?history.frame:null;
  const previewResult=useMemo(()=>game&&(game.phase==='scoring'||game.result?.reason==='area')?scorePreview(match):null,[game,match.scoring]);
  const preview=previewResult?.ok?previewResult.value:null;
  const finalScore=game?.result?.reason==='area'?game.result.score:null;
  const currentBoard=game?game.board:setupBoard(match);
  const board=frame?.board??currentBoard;
  const dead=game?.agreement?.deadStones??match.scoring.deadStones;
  const markers:BoardMarker[]=frame?.markers??[
    ...(game?.lastMove?.type==='place'?[{markerId:'full-last',kind:'last-move' as const,at:game.lastMove.at,label:'最后一手'}]:[]),
    ...(game?.phase==='scoring'||game?.result?.reason==='area'?dead.map((at,index)=>({markerId:`dead-${index}`,kind:'target' as const,at,label:'双方待确认的死子标记'})):[]),
  ];
  const apply=(result:ReturnType<typeof playAt>)=>{if(result.ok){setMatch(result.value);setNotice(null);}else setNotice(flowError(result.error));};
  const play=(at:Coord)=>{if(moveGate.current||!game||reviewIndex!==null)return;moveGate.current=true;const result=playAt(match,at);if(!result.ok)moveGate.current=false;apply(result);};
  const select=(at:Coord)=>{if(!game){apply(toggleHandicapStone(match,at));return;}if(game.phase==='scoring'&&reviewIndex===null)apply(toggleDeadGroup(match,at));};
  const changeSize=(size:FullGameSize)=>{const result=setBoardSize(match,size);if(!result.ok&&result.error.code==='SIZE_CHANGE_REQUIRES_CLEAR')setDiscardAction({type:'size',size});else apply(result);};
  const changeKind=(kind:SetupKind)=>{const result=setSetupKind(match,kind);if(!result.ok&&result.error.code==='SIZE_CHANGE_REQUIRES_CLEAR')setDiscardAction({type:'kind',kind});else apply(result);};
  const confirmDiscard=()=>{if(!discardAction)return;apply(discardAction.type==='size'?setBoardSize(match,discardAction.size,true):setSetupKind(match,discardAction.kind,true));setDiscardAction(null);};
  const localStore=()=>{try{return createFullGameStore(browserStoragePort());}catch{return null;}};
  useEffect(()=>{if(game)localStore()?.save(game);},[game?.revision]);
  const save=()=>{if(!game)return;const result=localStore()?.save(game);setNotice(result?.ok?'已把完整可重放对局保存到当前设备。':result&&!result.ok?result.issues[0].message:flowError({code:'SAVE_NOT_AVAILABLE'}));};
  const load=()=>{const result=localStore()?.load();if(!result){setNotice(flowError({code:'SAVE_NOT_AVAILABLE'}));return;}if(!result.ok){setNotice(result.issues[0].message);return;}if(!result.value){setNotice('当前设备还没有保存的完整对局。');return;}apply(restoreFullGame(result.value));};
  const download=()=>{if(!game)return;const blob=new Blob([fullGameJson(game)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`go-club-game-${game.revision}.json`;a.click();URL.revokeObjectURL(url);setNotice('已导出可由规则引擎重放验证的 GameState JSON。');};

  const status=!game?'开局设置':frame?`只读复盘 · ${frame.title}`:game.phase==='playing'?`当前：${colorName(game.toPlay)}`:game.phase==='scoring'?'终局确认中':game.result?.reason==='resign'?`${colorName(game.result.winner)}获胜（认输）`:'对局结束';
  const winner=game?.result?.reason==='area'?game.result.score.winner:game?.result?.reason==='resign'?game.result.winner:null;
  const resultTitle=game?.phase==='finished'&&winner?(winner==='draw'?'和棋':`${colorName(winner)}获胜`):null;
  const mode=!game?(match.setup.kind==='free-handicap'?'mark':'readonly'):reviewIndex!==null?'readonly':game.phase==='playing'?'play':game.phase==='scoring'?'mark':'readonly';

  return <div className="full-game-page" data-free-play={freePlay?'true':undefined} data-view={game?'game':'setup'} data-phase={game?.phase??'setup'} data-move-count={game?.moves.length??0} data-game-revision={game?.revision??0} data-winner={winner??'none'}>
    <UndoDialog match={match} onChange={setMatch} onNotice={setNotice}/>
    <ConfirmDialog open={confirmAction!==null} title={confirmAction==='resign'?'确认认输':'确认重开'} description={confirmAction==='resign'?`${game?colorName(game.toPlay):'当前一方'}认输后，本局立即结束且不生成面积分。`:'返回开局设置会结束当前这一局；可先保存或导出完整记录。'} confirmLabel={confirmAction==='resign'?'确认认输':'返回设置并重开'} onConfirm={()=>{if(confirmAction==='resign')apply(resignGame(match));else{setMatch(restartToSetup(match));setNotice(null);}setConfirmAction(null);}} onClose={()=>setConfirmAction(null)}/>
    <ConfirmDialog open={discardAction!==null} title="清除已摆起始黑子？" description="切换尺寸或改回空盘会清除当前自由放置的起始黑子。只有确认后才执行。" confirmLabel="确认清除并更改" onConfirm={confirmDiscard} onClose={()=>setDiscardAction(null)}/>

    <section className="full-game-hero"><p><a href={freePlay?HOME_ROUTE:ROUTE_ROUTE}>{freePlay?'← 返回学习入口':'← 返回学习路线'}</a></p><span className="module-kicker">完整围棋 · 同屏双人</span><h1>{freePlay?'自由双人对弈':'完整小棋盘对弈'}</h1><p>{freePlay?'两人共用一台设备，黑白轮流落子。自由选择棋盘大小，系统处理提子与禁着；两人停手并确认终局后，自动数子判定黑胜、白胜或和棋。':'默认9路，可选5、13、19路；5路用于小棋盘练习。双方连续停手后共同确认死子与中立点；系统不会替你们猜任意棋块的死活。'}</p>{freePlay&&<ol className="free-play-steps"><li><span>1</span>选棋盘，开始对弈</li><li><span>2</span>黑白轮流点交叉点</li><li><span>3</span>双方停手，确认后自动计分</li></ol>}{freePlay&&<p><a href="#/play/online">各用一台设备？进入联机对弈 →</a></p>}</section>
    {freePlay&&resultTitle&&!frame&&<section className="free-play-result" role="status" aria-live="polite" aria-atomic="true" data-testid="free-play-result"><div><span>本局结果</span><h2>{resultTitle}</h2></div><p>{finalScore?`黑方 ${finalScore.blackTotal} 分 · 白方 ${finalScore.whiteTotal} 分${finalScore.winner==='draw'?'':` · 相差 ${Math.abs(finalScore.difference)} 分`}`:`${game?.result?.reason==='resign'?colorName(game.toPlay):'一方'}认输，本局结束。`}</p></section>}

    <section className="full-game-layout">
      <div className="full-board-panel"><div className="full-board-heading"><div><span>{game?`${game.size}路 · 贴目 ${game.komi}`:`${match.setup.size}路 · 贴目 ${match.setup.komi}`}</span><h2>{game?'对局棋盘':'开局棋盘'}</h2></div><strong>{status}</strong></div>
        <Board size={game?.size??match.setup.size} board={board} label={`完整${game?.size??match.setup.size}路棋盘，${status}`} mode={mode} disabled={Boolean(frame)||(game?.phase==='finished')} selected={null} onSelect={select} onPlay={play} markers={[...markers,...analysis.markers]} showCoordinates displayMode={projector?'projector':'standard'}/>
        <div className="full-legend"><span><i className="legend-stone black"/>黑子</span><span><i className="legend-stone white"/>白子</span><span><i className="legend-last"/>最后一手</span>{dead.length>0&&<span><i className="legend-dead">△</i>待确认死子</span>}</div>
        {game&&history.frame&&<GameTimeline max={history.max} value={history.index} onChange={history.goTo} title={history.frame.title} description={history.frame.description}/>}
      </div>

      <aside className="full-game-controls" aria-label="完整对弈控制">
        {!game?<>
          <section className="setup-copy"><span>步骤 1 / 2</span><h2>确定本局设置</h2><p>默认 9 路、贴目 0，可出现和棋。5 路是小棋盘练习；尺寸和贴目均在开局前确定。</p></section>
          <fieldset><legend>棋盘与贴目</legend><label htmlFor="full-size">棋盘尺寸<select id="full-size" value={match.setup.size} onChange={event=>changeSize(Number(event.target.value) as FullGameSize)}>{FULL_GAME_SIZES.map(size=><option key={size} value={size}>{size}路{size===5?'（小棋盘练习）':size===9?'（默认）':''}</option>)}</select></label><label htmlFor="full-komi">白方贴目<input id="full-komi" type="number" step="0.5" value={match.setup.komi} onChange={event=>{const value=event.target.valueAsNumber;if(Number.isFinite(value))apply(setKomi(match,value));}}/></label><small>贴目在开局时确定，进行中不能静默修改。</small></fieldset>
          <fieldset><legend>起始方式</legend><label className="radio-card"><input type="radio" name="setup-kind" checked={match.setup.kind==='empty'} onChange={()=>changeKind('empty')}/><span><strong>空盘</strong><small>黑方先行。</small></span></label><label className="radio-card"><input type="radio" name="setup-kind" checked={match.setup.kind==='free-handicap'} onChange={()=>changeKind('free-handicap')}/><span><strong>本社团自由放置让子</strong><small>点击棋盘放置任意起始黑子；不是正式固定让子规则，完成后白方先行。</small></span></label>{match.setup.kind==='free-handicap'&&<p className="handicap-count">已放 {match.setup.handicapStones.length} 颗起始黑子；再次点击可移除。</p>}</fieldset>
          <button type="button" className="start-full-game" onClick={()=>apply(startFullGame(match))}>验证设置并开始对局</button>
          <button type="button" className="outline-action" onClick={load}>读取当前设备保存的对局</button>
        </>:<>
          <section className="turn-card"><span className={`turn-stone ${(frame?.toPlay??game.toPlay)==='B'?'black':'white'}`}/><div><strong>{status}</strong><p>{frame?'当前只读；返回最新局面后才能操作。':game.phase==='playing'?`轮到${colorName(game.toPlay)}。`:game.phase==='scoring'?'请共同核对整块死子与中立点。':'盘面保留，可复盘、保存或申请悔棋。'}</p></div></section>
          {game.phase==='playing'&&reviewIndex===null&&<section className="play-actions"><h2>对弈操作</h2><div><button type="button" onClick={()=>apply(passTurn(match))}>停一手</button><button type="button" onClick={()=>setConfirmAction('resign')}>认输</button><button type="button" onClick={()=>apply(requestUndo(match))} disabled={!game.moves.length}>申请悔棋</button><button type="button" onClick={()=>setConfirmAction('restart')}>重开</button></div><p>位置超级劫比较本局完整布局历史；停一手不受重复检查限制，也不清空历史。</p></section>}
          {game.phase==='scoring'&&reviewIndex===null&&<section className="scoring-actions"><span>终局确认</span><h2>点击整块标记死子</h2>{freePlay&&<p className="free-scoring-help">若双方同意盘上棋子都活着，可直接依次确认。最后一方确认后，程序自动算分并显示胜负；有死活争议则恢复对弈。</p>}<p>点击任一棋子会标记或取消它所属的整个正交连通块。空区只在下方显示数量，不用染色暗示死活已自动判断。</p><div className="confirmation-steps"><span className={match.scoring.confirmedBy.includes('B')?'done':'current'}>黑方确认</span><span className={match.scoring.confirmedBy.includes('B')?'current':''}>白方确认</span><span>形成最终结果</span></div>{match.scoring.confirmedBy.length===0?<button type="button" className="primary-action" onClick={()=>apply(confirmScoreFor(match,'B'))}>黑方确认当前死子与中立点</button>:<button type="button" className="primary-action" onClick={()=>apply(confirmScoreFor(match,'W'))}>白方确认同一份清单</button>}<div className="dispute-actions"><strong>有争议？由提出方实际演示</strong><button type="button" onClick={()=>apply(resumeDisputedPlay(match,'B'))}>黑方提出争议并恢复</button><button type="button" onClick={()=>apply(resumeDisputedPlay(match,'W'))}>白方提出争议并恢复</button></div><button type="button" className="outline-action" onClick={()=>apply(requestUndo(match))}>申请撤回终局前操作</button></section>}
          {game.phase==='finished'&&!frame&&<section className="finished-actions"><h2>本局已结束</h2><p>{game.result?.reason==='resign'?'认输只记录胜方，不编造面积分。':'双方已确认终局清单；结果和盘面保存在完整历史中。'}</p><button type="button" onClick={()=>apply(requestUndo(match))}>申请悔棋</button><button type="button" onClick={()=>setConfirmAction('restart')}>重开一局</button></section>}
          <section className="save-actions"><h2>保存与交接</h2><div><button type="button" onClick={save}>保存到当前设备</button><button type="button" onClick={download}>导出对局 JSON</button><button type="button" onClick={load}>读取已保存对局</button></div><p>读取时会从起点逐项重放，外部文件自报的提子数、历史和结果不被直接信任。</p></section>
        </>}
        <div className="full-game-message" role="status" aria-live="polite"><strong>当前说明</strong><span>{frame?frame.description:notice??match.message}</span></div>
      </aside>
    </section>


    {!frame&&game?.phase==='scoring'&&preview&&<><ScoreDetails score={preview} captures={game.captures} final={false}/><section className="neutral-list"><h2>当前中立点清单</h2><p>{preview.neutralPoints.length?preview.neutralPoints.map(at=>displayCoord(at,game.size)).join('、'):'当前预览没有中立点。'} 双方确认的是这份由当前死子标记产生的清单；这不是自动死活判断。</p></section></>}
    {!frame&&game?.phase==='finished'&&finalScore&&<ScoreDetails score={finalScore} captures={game.captures} final/>}
    {game&&<KataGoReview analysis={analysis} size={game.size} index={history.index}/>}

    <section className="full-game-about"><h2>从吃子小游戏过渡</h2><p>完整围棋不会在首次提子时结束。双方围绕整盘面积继续行动，连续停手后共同确认；有争议就回到原盘实际演示。</p><a href={CAPTURE_GAME_ROUTE}>返回双人吃子小游戏</a></section>
  </div>;
}

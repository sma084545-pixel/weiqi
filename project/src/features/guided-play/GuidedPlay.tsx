import {useEffect,useMemo,useRef,useState} from 'react';
import {Board} from '../../components/Board';
import {GameTimeline} from '../../components/GameTimeline';
import type {BoardMarker,BoardMatrix} from '../../core/rules';
import {browserStoragePort} from '../../core/unified-persistence';
import {ConfirmDialog,ScoreDetails} from '../full-game/FullGame';
import {confirmScoreFor,resignGame,resumeDisputedPlay,scorePreview,toggleDeadGroup} from '../full-game/model';
import {serializeGameToSgf} from '../file-exchange/sgf';
import {aiServiceOrigin} from '../ai-game/config';
import {GuidedPlaySetup} from './GuidedPlaySetup';
import {HintController,MoveFeedbackCard,PreMoveQuestion} from './TeachingPanel';
import {GuidedPlaySummary} from './GuidedPlaySummary';
import {teachingOverlay} from './TeachingOverlay';
import {guidedSummary} from './model';
import {guidedSessionJson,GUIDED_INTRO_KEY,MAX_GUIDED_BYTES} from './storage';
import {CONCEPT_LABELS,LEVELS} from './types';
import {useGuidedPlay} from './useGuidedPlay';
import '../full-game/FullGame.css';
import './GuidedPlay.css';

function download(text:string,name:string,type='application/json'){
  const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),0);
}
const initialZoom=()=>globalThis.matchMedia?.('(max-width:520px)').matches ? .75 : .85;
export function GuidedPlay({projector=false}:{projector?:boolean}){
  const c=useGuidedPlay(),{game,session,options,history}=c;
  const [introSeen,setIntroSeen]=useState(()=>{try{return JSON.parse(browserStoragePort().getItem(GUIDED_INTRO_KEY)??'null')?.seen===true;}catch{return false;}});
  const [zoom,setZoom]=useState(initialZoom),[viewKey,setViewKey]=useState(0),fileInput=useRef<HTMLInputElement>(null),alive=useRef(true);
  useEffect(()=>{alive.current=true;const old=document.title;document.title='辅助下棋 · Guided Play | 围棋社';return()=>{alive.current=false;document.title=old;};},[]);
  useEffect(()=>{
    if(!session)return;
    const frame=requestAnimationFrame(()=>{
      const node=document.getElementById(game?.phase==='finished'?'guided-summary-title':'guided-board-title');
      node?.focus({preventScroll:true});node?.scrollIntoView({block:'start',behavior:'auto'});
    });
    return()=>cancelAnimationFrame(frame);
  },[session?.id,game?.phase]);
  const intro=()=>{setIntroSeen(true);try{browserStoragePort().setItem(GUIDED_INTRO_KEY,JSON.stringify({schemaVersion:1,id:'LOCAL-GUIDED-INTRO',revision:1,rulesetId:'GO-CLUB-AREA-1',seen:true}));}catch{c.setNotice('首次说明暂时未保存，仍可开始。');}};
  const status=!game?'开局设置':game.phase==='finished'?'本局已结束，先回想学到什么':c.viewing?'只读观察 · 原棋局未改变':game.phase==='scoring'?'共同核对终局':c.waiting?'先看看本手反馈':game.toPlay===options.humanColor?`轮到你（${options.humanColor==='B'?'黑':'白'}棋）`:c.paused?'对手已暂停':c.opponent.phase==='error'?'对手暂未落子，可重试':'对手思考中…';
  const analysis=c.analysis.value;
  const overlay=teachingOverlay(analysis,c.hintLevel,c.showDanger&&options.level===1&&!c.viewing&&game?.toPlay===options.humanColor);
  const board:BoardMatrix=c.beforeView?.board??history.frame?.board??game?.board??[];
  const dead=game?.agreement?.deadStones??session?.match.scoring.deadStones??[];
  const markers:BoardMarker[]=[...(c.beforeView?c.beforeView.lastMove?.type==='place'?[{markerId:'guided-before-last',kind:'last-move' as const,at:c.beforeView.lastMove.at,label:'上一步'}]:[]:history.frame?.markers??[]),...(!history.viewingHistory?overlay.markers:[]),...(!c.viewing&&game?.phase==='scoring'?dead.map((at,i)=>({markerId:`guided-dead-${i}`,kind:'target' as const,at,label:'人工待确认死子'})):[])];
  const preview=useMemo(()=>session&&game&&(game.phase==='scoring'||game.result?.reason==='area')?scorePreview(session.match):null,[session,game]);
  const exportSession=()=>{if(!session)return;try{download(guidedSessionJson(session),'围棋-辅助下棋续玩.json');}catch(e){c.setNotice(e instanceof Error?e.message:'导出未完成，原局保留。');}};
  const exportSgf=()=>{if(!game)return;const r=serializeGameToSgf(game);download(r.text,'围棋-辅助下棋主线.sgf','application/x-go-sgf');if(r.warnings.length)c.setNotice(r.warnings.join('；'));};
  const exportReport=()=>{if(!session||!game||game.phase!=='finished')return;const s=guidedSummary(session);download(`# 辅助下棋 · 本局学习报告\n\n记录编号：${session.id}\n规则：${game.rulesetId}；${game.size}路；你执${options.humanColor==='B'?'黑':'白'}；指导：${LEVELS[options.level].label}。\n\n## 实际记录\n\n棋盘落子${s.humanMoves}手；展开提示${s.hintRequests}次；提子落子${s.capturingMoves}手（${s.capturedStones}颗）；直接合并${s.connections}次；一气棋增气${s.escapes}次。\n\n这些是操作与棋形记录，不推断当时的独立判断或能力水平。\n\n## 下一盘只改进一点\n\n${s.improvement}\n\n## 关键局面\n\n${s.moments.map(m=>`- 第${m.index}步：${m.text}`).join('\n')||'没有可记录的棋盘落子。'}\n\n本报告由本机规则计算生成；没有生成冒充成员的反思、反馈或真实教学成效。\n`,'辅助下棋-本局学习报告.md','text/markdown;charset=utf-8');};
  const readFile=async(file:File|undefined)=>{if(!file)return;if(file.size>MAX_GUIDED_BYTES){c.setNotice('续玩文件超过5 MB，原棋局未替换。');return;}try{const text=await file.text();if(alive.current)c.importText(text);}catch{if(alive.current)c.setNotice('文件读取失败，原局保留。');}};
  return <div className="full-game-page guided-play" data-testid="guided-play" data-phase={game?.phase??'setup'} data-teaching-phase={c.phase} data-turn={game?.toPlay??''} data-move-count={game?.moves.length??0} data-level={options.level} data-opponent={options.opponent}>
    <ConfirmDialog open={c.modal!==null} title={c.modal==='resign'?'结束这盘棋并回顾':'辅助棋局操作'} description={c.modal==='resign'?'本局将以你认输结束，不生成虚构的面积分。随后先显示学习报告。':'这会替换当前页面棋局。请先保存或导出；导入后对手保持暂停。'} confirmLabel={c.modal==='resign'?'确认认输并查看学习报告':c.modal==='restart'?'返回设置':'确认导入辅助棋局'} onClose={()=>{c.setModal(null);c.setIncoming(null);}} onConfirm={()=>{if(c.modal==='resign'&&session){c.clearTeaching();c.apply(resignGame(session.match));c.setModal(null);}else if(c.modal==='restart')c.newSetup();else c.confirmImport();}}/>
    <header className="full-game-hero guided-hero"><p><a href="#/route">← 返回学习路线</a></p><span className="module-kicker">从练习走向实战 · Guided Play</span><h1>辅助下棋</h1><p>每一步仍由你决定。先观察，再比较；需要时打开一点提示，关键着后一起想想原因。</p><p className="guided-mode-note">这里是边下边学的独立模式。普通 AI 对弈与自由对弈仍可照常使用。</p></header>
    {!game&&!introSeen?<section className="guided-onboarding" aria-labelledby="guided-intro-title"><h2 id="guided-intro-title">第一盘，只记住三件事</h2><ol><li><strong>你自己下。</strong>这是一盘正常围棋，你仍然决定每一步。</li><li><strong>提示一点点来。</strong>先给问题，再给区域，最后才是候选。</li><li><strong>只在关键时刻停一停。</strong>看看自己的气，也想想对手在做什么。</li></ol><button type="button" className="primary-action" onClick={intro}>开始第一盘辅助对局</button></section>:!game?<GuidedPlaySetup options={c.settings} colorChoice={c.colorChoice} onColor={c.setColorChoice} onOptions={c.setSettings} onStart={c.start} networkAvailable={!!aiServiceOrigin('relaxed')} completed={c.completed}/>:session&&<>
      <section className="guided-focus" aria-label="本局教学重点"><span>本局只关注</span>{c.focus.map(f=><strong key={f}>{CONCEPT_LABELS[f]}</strong>)}<small>Level {options.level} · {LEVELS[options.level].label} · {options.opponent==='local'?'本地教学机器人':'真实 KataGo'}</small></section>
      <div className="full-game-layout guided-layout"><section className="full-board-panel guided-board-panel" aria-labelledby="guided-board-title"><div className="full-board-heading"><div><span>{game.size}路 · 你执{options.humanColor==='B'?'黑':'白'} · 贴目0</span><h2 id="guided-board-title" tabIndex={-1}>一边下，一边想</h2></div><strong>{status}</strong></div>
        <Board size={game.size} board={board} label={`辅助下棋，${status}`} mode={c.viewing||game.phase==='finished'?'readonly':game.phase==='scoring'?'mark':'play'} disabled={!!c.modal||c.viewing||game.phase==='finished'||(game.phase==='playing'&&!c.humanAllowed)} selected={null} onPlay={at=>c.play(at)} onSelect={at=>{if(game.phase==='scoring'&&!c.viewing)c.apply(toggleDeadGroup(session.match,at));}} markers={markers} showCoordinates zoom={zoom} resetViewKey={viewKey} displayMode={projector?'projector':'standard'}/>
        {overlay.caption&&!history.viewingHistory&&<p className="guided-overlay-caption">{overlay.caption}</p>}
        <div className="guided-actions guided-board-actions"><button type="button" disabled={zoom>=1.5} onClick={()=>setZoom(z=>Math.min(1.5,z+.25))}>放大棋盘</button><button type="button" disabled={zoom<=.75} onClick={()=>setZoom(z=>Math.max(.75,z-.25))}>缩小棋盘</button><button type="button" onClick={()=>{setZoom(initialZoom());setViewKey(k=>k+1);}}>复位视图</button><button type="button" onClick={c.hideHints}>清除教学标记</button></div>
        {c.beforeView&&<div className="guided-preview-notice"><p>正在只读观察你上一手之前。当前棋局保留，想换一手请用“悔棋并重试”。</p><button type="button" onClick={c.continueAfterFeedback}>回到当前局面并继续</button></div>}
        {history.frame&&!c.beforeView&&<details className="guided-timeline"><summary>棋谱回看 · 棋局滑动条</summary><GameTimeline max={history.max} value={history.index} onChange={c.goTo} title={history.frame.title} description={history.frame.description} help="滑动只读回看，不修改棋局；对手会暂停，旧提示会清除。真正重试请用撤回最近回合。"/></details>}
      </section><aside className="full-game-controls guided-teaching-panel" aria-label="教学与对局操作">
        <div className="guided-turn" role="status" aria-live="polite"><strong>{status}</strong>{game.phase==='playing'&&game.toPlay!==options.humanColor&&!c.waiting&&!c.viewing&&<p>{c.paused?'对手暂停，可手动继续。':c.opponent.message||'对手正在准备下一手。'}</p>}</div>
        {game.phase==='playing'&&<>
          {c.analysis.value&&c.analysis.value.question&&c.analysis.phase==='ready'&&<section className="guided-current-goal"><span>当前问题</span><h2>{c.analysis.value.question}</h2></section>}
          {c.pending&&<PreMoveQuestion at={c.pending.at} onConfirm={c.confirmPending} onCancel={c.cancelPending}/>}
          {c.visibleObservation&&<MoveFeedbackCard observation={c.visibleObservation} awaiting={c.waiting} onContinue={c.continueAfterFeedback} onThink={c.inspectBefore} onUndo={()=>c.travel('undo',true)}/>}
          {c.aiExplanation&&!c.viewing&&<section className="guided-ai-explanation"><h3>对手刚刚做了什么？</h3><p>{c.aiExplanation}</p></section>}
          {(game.toPlay===options.humanColor||c.beforeView)&&!history.viewingHistory&&<HintController analysis={analysis} level={c.hintLevel} loading={c.analysis.phase==='loading'} failed={c.analysis.message} disabled={!!c.modal} onHint={()=>c.requestHint()} onFinal={()=>c.requestHint(true)} onHide={c.hideHints} onRetry={c.analysis.retry} previous={!!c.beforeView}/>}
          <section className="guided-game-controls"><h3>按自己的节奏继续</h3><div className="guided-actions"><button type="button" disabled={!c.humanAllowed} onClick={()=>c.play(null)}>停一手</button>{game.toPlay!==options.humanColor&&!c.waiting&&(c.paused||c.opponent.phase==='error'?<button type="button" disabled={c.viewing} onClick={()=>{c.setPaused(false);c.opponent.retry();}}>继续 / 重试对手落子</button>:<button type="button" onClick={c.stop}>暂停对手</button>)}<button type="button" disabled={!c.humanAllowed} onClick={()=>{c.stop();c.setModal('resign');}}>我认输并回顾</button></div></section>
        </>}
        {game.phase==='scoring'&&!c.viewing&&<section className="scoring-actions"><h2>停下来，共同核对</h2><p>连续两停手只代表准备收尾，机器人没有替你判死活。请与同伴核对：点击整块标记或取消死子，再依次接受同一清单。中立点由边界规则列出。</p>{session.match.scoring.confirmedBy.length===0?<button type="button" onClick={()=>c.apply(confirmScoreFor(session.match,'B'))}>已人工核对黑方清单</button>:<button type="button" onClick={()=>c.apply(confirmScoreFor(session.match,'W'))}>已人工核对白方同一清单并结束</button>}<button type="button" onClick={()=>{c.stop();c.clearTeaching();c.apply(resumeDisputedPlay(session.match,options.humanColor));}}>有争议，恢复原盘面</button><p>不确定就继续实际演示。预览标记不会改变历史棋盘。</p></section>}
        {game.phase==='finished'&&<section><h2>先回想，再看结果</h2><p>下面的本局报告只记录实际操作与棋形变化。你可以滑动回看，或从关键局面再试一次。</p><a className="text-link" href="#guided-summary-title" onClick={e=>{e.preventDefault();document.getElementById('guided-summary-title')?.scrollIntoView({block:'start',behavior:'auto'});}}>查看本局学习报告 ↓</a></section>}
        <section className="guided-game-controls"><h3>回退与重试</h3><div className="guided-actions"><button type="button" disabled={!game.undoStack.length} onClick={()=>c.travel('undo')}>撤回一手</button><button type="button" disabled={!game.undoStack.length} onClick={()=>c.travel('undo',true)}>撤回最近回合</button><button type="button" disabled={!game.redoStack.length} onClick={()=>c.travel('redo')}>重做一手</button><button type="button" onClick={()=>{c.stop();c.setModal('restart');}}>另开一局</button></div><p>回退后对手暂停。新落子会清除旧重做分支与旧教学标记。</p></section>
        {session.parentSessionId&&<button type="button" onClick={c.returnOriginal}>返回原局报告，保留当前变化</button>}
        <details className="guided-save"><summary>保存、导出与续玩</summary><p>自动保存与普通 AI、双人对弈和课程12存档分开；刷新后暂停对手。</p><div className="guided-actions"><button type="button" onClick={c.save}>保存辅助棋局</button><button type="button" onClick={exportSession}>导出辅助续玩 JSON</button><button type="button" onClick={exportSgf}>导出 SGF 主线</button><button type="button" onClick={()=>fileInput.current?.click()}>导入辅助续玩</button></div></details>
      </aside></div>
      {game.phase==='finished'&&<GuidedPlaySummary session={session} onRetry={c.retryMoment} onExport={exportReport}/>}
      {preview?.ok&&!c.viewing&&<details className="guided-result"><summary>{game.phase==='finished'?'查看本局结果与人工确认计分':'查看人工确认前的计分预览'}</summary><ScoreDetails score={preview.value} captures={game.captures} final={game.phase==='finished'}/></details>}
      {game.phase==='finished'&&game.result?.reason==='resign'&&<p className="guided-result">本局以{game.result.winner===options.humanColor?'对手':'你'}认输结束，没有编造数子得分。</p>}
    </>}
    {!game&&<div className="guided-restore guided-actions"><button type="button" onClick={c.restore}>继续本机辅助棋局</button><button type="button" onClick={()=>fileInput.current?.click()}>导入辅助续玩</button></div>}
    <input hidden ref={fileInput} type="file" accept=".json,application/json" onChange={e=>{void readFile(e.target.files?.[0]);e.currentTarget.value='';}}/>
    {c.notice&&<p className="guided-notice" role="status">{c.notice}</p>}
    <section className="full-game-about guided-about"><h2>练的是思考方式</h2><p>先问目标 → 数气 → 比较候选 → 自己落子 → 回想对手的回应。教学只解释可核实的局部变化，不给每手打分，不自动判断任意棋块死活。两个空点不等于两个受保护的独立真眼；没有两眼也不能一概判死，双活等情况存在。</p><p>本地教学与记录可在离线准备后使用；选择 KataGo 时，仅对手的新着法需要联网。失败不换手，不会自动切换对手。没有强制通关、计时或排名。</p><div className="guided-actions"><a href="#/route">回到学习路线</a><a href="#/play/ai">普通 AI 对弈</a><a href="#/play/free">自由双人对弈</a></div></section>
  </div>;
}

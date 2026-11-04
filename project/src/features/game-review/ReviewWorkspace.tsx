import {useEffect,useMemo,useRef,useState} from 'react';
import type {Color} from '../../core/content.generated';
import type {StoragePort} from '../../core/persistence';
import {Board} from '../../components/Board';
import {GameTimeline} from '../../components/GameTimeline';
import {createGameHistory} from '../../core/game-history';
import {AI_DIFFICULTIES} from '../../core/analysis/ai-contract';
import {displayCoord} from '../../core/coordinates';
import {AiGame} from '../ai-game/AiGame';
import {createAiSessionStore} from '../ai-game/storage';
import {GuidedPlay} from '../guided-play/GuidedPlay';
import {createGuidedPlayStore} from '../guided-play/storage';
import {useKataGoReview} from '../katago-review/useKataGoReview';
import {KataGoReview} from '../katago-review/KataGoReview';
import {analysisOrigin} from '../katago-review/config';
import {continueHistory,guidedBranch,forkLabel,type BranchMode,type ReviewBranch,type ReviewRecord} from './model';
import {branchStoragePort,saveReviewRecord} from './storage';
import {useWholeGameReview} from './useWholeGameReview';
import {sampleComment} from './analysis';

export function ReviewWorkspace({initialRecord,initialTab,initialDifficulty='standard',port}:{initialRecord:ReviewRecord;initialTab:'overview'|'continue';initialDifficulty?:ReviewBranch['difficulty'];port:StoragePort}){
  const [record,setRecord]=useState(initialRecord),[cursor,setCursor]=useState(initialRecord.cursor),[tab,setTab]=useState<'overview'|'continue'|'branch'>(initialTab),[human,setHuman]=useState<Color>(initialRecord.humanColor),[difficulty,setDifficulty]=useState<ReviewBranch['difficulty']>(initialDifficulty),[issue,setIssue]=useState('');
  const game=record.game,frames=useMemo(()=>createGameHistory(game),[game]),frame=frames[cursor];
  const [active,setActive]=useState<{meta:ReviewBranch;seed:ReturnType<typeof continueHistory>;nonce:number}|null>(null);
  const startGate=useRef(false);
  useEffect(()=>{if(tab!=='branch')startGate.current=false;},[tab]);
  const [opponent,setOpponent]=useState<'local'|'katago'>('local');
  const whole=useWholeGameReview(record,port,analysisOrigin(),tab==='overview');
  const manual=useKataGoReview(game,cursor,tab==='overview'&&whole.phase!=='engine');
  const branchPort=useMemo(()=>active?branchStoragePort(port,active.meta.id):null,[port,active?.meta.id]);
  const change=(next:ReviewRecord)=>{try{saveReviewRecord(port,next);setRecord(next);setIssue('');return true;}catch{setIssue('独立复盘保存失败，原棋谱不受影响。可导出当前复盘报告后重试。');return false;}};
  const jump=(index:number)=>{manual.cancel();setCursor(index);change({...record,cursor:index,revision:record.revision+1});};
  const start=(mode:BranchMode,at=cursor,owner=human,profile=difficulty,partner=opponent)=>{
    if(startGate.current)return;startGate.current=true;
    try{
      if(record.branches.length>=100)throw Error('这份复盘已保存100条分支，请先导出备份。');
      const seed=continueHistory(game,at,mode),meta:ReviewBranch={id:`BRANCH-${crypto.randomUUID()}`,mode,index:at,humanColor:owner,difficulty:profile,floor:seed.floor,createdAt:new Date().toISOString()};
      const scoped=branchStoragePort(port,meta.id);
      const saved=mode==='free'?createAiSessionStore(scoped).save(seed.match,{humanColor:owner,difficulty:profile}):createGuidedPlayStore(scoped).save({...guidedBranch(record,meta,seed.match),options:{...guidedBranch(record,meta,seed.match).options,opponent:partner}});
      if(!saved.ok)throw Error(saved.message);
      if(!change({...record,revision:record.revision+1,branches:[...record.branches,meta]})){startGate.current=false;return;}
      setActive({meta,seed,nonce:0});whole.cancel();manual.cancel();setTab('branch');
    }catch(e){startGate.current=false;setIssue(e instanceof Error?e.message:'分支未能开始，原棋谱不变。');}
  };
  const resume=(meta:ReviewBranch)=>{try{const seed=continueHistory(game,meta.index,meta.mode);setActive({meta,seed,nonce:Date.now()});whole.cancel();manual.cancel();setTab('branch');setIssue('');}catch(e){setIssue(e instanceof Error?e.message:'分支读取失败。');}};
  const embedded=useMemo(()=>{
    if(!active||!branchPort)return null;
    if(active.meta.mode==='free'){const r=createAiSessionStore(branchPort).load();return r.ok&&r.match&&r.options?{type:'free' as const,match:r.match,options:r.options}:null;}
    const r=createGuidedPlayStore(branchPort).load();return r.ok&&r.session?{type:'guided' as const,session:r.session}:null;
  },[active,branchPort,tab]);
  const exportReport=()=>{
    const text=`# ${record.title} · 独立复盘\n\n原棋谱编号：${game.id}；复盘编号：${record.id}；总操作${game.moves.length}步。\n\n${whole.report?.summary??'尚未完成基础巡检。'}\n\n${whole.report?.moments.map(m=>`- 第${m.index}步：${m.text} ${sampleComment(m,whole.samples)??''}`).join('\n')??''}\n\n下一步：${whole.report?.next??'先选一个疑问。'}\n\n基础战术由本机规则核实；真实KataGo仅抽样${whole.samples.length}个局面，不是自动死活裁判。原局结果保持不变。\n`;
    const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`${record.id}-复盘.md`;a.click();setTimeout(()=>URL.revokeObjectURL(url),0);
  };
  return <div className="review-content" data-testid="review-workspace" data-source-id={record.id} data-source-moves={game.moves.length}>
    <nav className="review-tabs" aria-label="复盘工作区"><button type="button" aria-pressed={tab==='overview'} disabled={game.phase!=='finished'} onClick={()=>setTab('overview')}>AI 复盘与总结</button><button type="button" aria-pressed={tab==='continue'} onClick={()=>setTab('continue')}>选择局面并继续</button>{active&&<button type="button" aria-pressed={tab==='branch'} onClick={()=>setTab('branch')}>回到当前分支</button>}</nav>
    {issue&&<p role="alert">{issue}</p>}
    {tab==='overview'&&<section className="review-overview-intro"><h2>本局复盘摘要</h2><p>{whole.report?.summary??'先核查气与提子的实际变化，再比较关键局面。'}</p><p>自动抽样使用标准 KataGo 服务，不是极致模型；下方会注明样本数量与估计边界。</p><p aria-live="polite">{whole.message}</p><button type="button" onClick={()=>document.querySelector('.review-workspace .review-report')?.scrollIntoView({block:'start',behavior:'auto'})}>查看关键手与学习建议 ↓</button></section>}
    {tab==='branch'&&active?<section className="review-branch" aria-label="独立续下分支" data-branch-id={active.meta.id}>
      <div className="review-branch-banner"><h2>{forkLabel(active.meta.index)} · {active.meta.mode==='free'?'自由继续':'辅助下棋'}</h2><p>你执{active.meta.humanColor==='B'?'黑':'白'}；独立分支，原谱 {game.moves.length} 步与结算保留。{active.seed.note}</p><div className="review-buttons"><button type="button" onClick={()=>{setCursor(active.meta.index);setTab('continue');}}>保留分支，返回原局第 {active.meta.index} 步</button><button type="button" onClick={()=>{startGate.current=false;start(active.meta.mode,active.meta.index,active.meta.humanColor,active.meta.difficulty,embedded?.type==='guided'?embedded.session.options.opponent:opponent);}}>重新尝试当前分支起点</button></div></div>
      {embedded&&branchPort?(embedded.type==='free'?<AiGame key={active.meta.id+'-'+active.nonce} initial={{match:embedded.match,options:embedded.options}} storagePort={branchPort} embedded historyFloor={active.meta.floor}/>:<GuidedPlay key={active.meta.id+'-'+active.nonce} initialSession={embedded.session} storagePort={branchPort} embedded/>):<p role="alert">这条分支未通过读取校验，原棋谱保持不变；可回到起点建立新的尝试。</p>}
    </section>:<>
      <div className="review-grid"><div className="review-board"><Board size={game.size} board={frame.board} label={`原棋谱只读复盘，第${cursor}步`} mode="readonly" selected={null} onSelect={()=>{}} showCoordinates zoom={.75} markers={[...frame.markers,...(tab==='overview'?manual.markers:[])]}/><GameTimeline max={frames.length-1} value={cursor} onChange={jump} title={frame.title} description={frame.description} latestLabel="回到原局最后一步" help="这里始终只读。进度以已接受的操作计数，包含停手、认输和终局确认；续下建立独立分支。"/></div>
        <aside className="review-side"><h2>{forkLabel(cursor)}</h2><p>默认沿用你原本的执色；轮到 AI 时，它会先走。原局第 0 步至最后一步均可选择。</p><label>你的执色<select value={human} onChange={e=>setHuman(e.target.value as Color)}><option value="B">黑棋</option><option value="W">白棋</option></select></label><label>自由继续的 AI 难度<select value={difficulty} onChange={e=>setDifficulty(e.target.value as ReviewBranch['difficulty'])}>{Object.entries(AI_DIFFICULTIES).map(([id,p])=><option key={id} value={id}>{p.label}</option>)}</select></label><label>辅助下棋的伙伴<select value={opponent} onChange={e=>setOpponent(e.target.value as 'local'|'katago')}><option value="local">本地教学伙伴（可离线）</option><option value="katago">真实 KataGo（需联网）</option></select></label><div className="review-buttons"><button type="button" className="primary-action" onClick={()=>start('free')}>自由继续</button><button type="button" onClick={()=>start('guided')}>辅助下棋继续</button></div><p>新分支只撤除终局结束标记；从双停局面恢复时清零连续停手，真实落子、提子和超级劫历史保留。</p></aside></div>
      {tab==='overview'&&<section className="review-report" aria-labelledby="review-summary"><h2 id="review-summary">本局 AI 复盘 · 先找一个值得重试的地方</h2><p role="status" data-testid="whole-review-status" data-state={whole.phase}>{whole.message||'准备复盘…'}</p><p>自动核查完整棋谱的基础战术，再以真实 KataGo 抽样最多4个局面。抽样用于比较，不能冒充逐手精准评判；胜负仍取原局结果。</p><div className="review-buttons">{(whole.phase==='engine'||whole.phase==='local')&&<button type="button" onClick={whole.cancel}>取消自动分析</button>}{['error','cancelled'].includes(whole.phase)&&<button type="button" onClick={whole.retry}>重试未完成的分析</button>}<button type="button" onClick={exportReport}>导出复盘报告</button></div>
        {whole.report&&<><p>{whole.report.summary}</p><h3>做到了什么</h3><p>{whole.report.positives?`发现${whole.report.positives}次可核实的提子、连接、增气或打吃变化，下面选择关键处。`:'没有足够证据列出明显的局部成功；不会补造表扬。'}</p><h3>最值得留意的一点</h3><p>{whole.report.next}</p><div className="review-moments">{whole.report.moments.map(m=><article key={m.index} data-moment-index={m.index}><span>第 {m.index} 步 · {m.kind==='positive'?'局部变化':'值得检查'}</span><h3>{m.title}</h3><p>{m.text}</p>{m.refutation&&<p>已验证的下一手：对手可在 {displayCoord(m.refutation.at,game.size)} 提走 {m.refutation.captured} 颗棋。</p>}{sampleComment(m,whole.samples)&&<p className="review-engine-note">{sampleComment(m,whole.samples)}</p>}<div className="review-buttons"><button type="button" onClick={()=>jump(m.index)}>查看这一手</button><button type="button" onClick={()=>{jump(m.beforeIndex);setTab('continue');}}>重新尝试（回到落子前）</button></div></article>)}</div>{!whole.report.moments.length&&<p>本次没有发现可核实的基础战术关键手。仍可自由选一个局面继续，不等于已经下得完美。</p>}<p>学习建议：<a href="#/learn/liberties">气实验室</a> · <a href="#/route/STAGE-04">连接与切断</a> · <a href="#/play/guided">再下一盘辅助对局</a></p></>}
        {whole.phase!=='engine'&&<KataGoReview analysis={manual} size={game.size} index={cursor}/>}
      </section>}
    </>}
    {record.branches.length>0&&<details className="review-saved"><summary>本局已保存的独立分支（{record.branches.length}）</summary>{record.branches.map(b=><div key={b.id}><span>{forkLabel(b.index)} · {b.mode==='free'?'自由继续':'辅助下棋'} · {b.humanColor==='B'?'黑':'白'}</span><button type="button" onClick={()=>resume(b)}>恢复这条分支</button></div>)}</details>}
  </div>;
}

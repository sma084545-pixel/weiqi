import {Board} from '../../components/Board';
import {FOCUS,CONCEPT_LABELS,type GuidedSession} from './types';
import {guidedSummary,nextLearningRoute} from './model';

export function GuidedPlaySummary({session,onRetry,onExport}:{session:GuidedSession;onRetry:(beforeIndex:number)=>void;onExport:()=>void}){
  const game=session.match.game;if(!game||game.phase!=='finished')return null;
  const summary=guidedSummary(session),next=nextLearningRoute(FOCUS[session.options.goal]);
  const strengths=[summary.capturingMoves?`有 ${summary.capturingMoves} 手实际提子，共提走 ${summary.capturedStones} 颗。`:null,summary.connections?`有 ${summary.connections} 次直接合并同色棋块。`:null,summary.escapes?`有 ${summary.escapes} 块一气棋在落子后增加了气。`:null].filter(Boolean);
  return <section className="guided-summary" aria-labelledby="guided-summary-title" data-testid="guided-summary">
    <span className="module-kicker">先回想学到什么</span><h2 id="guided-summary-title" tabIndex={-1}>本局学习报告</h2><p>你完成了 {summary.humanMoves} 手棋盘落子，主动展开提示 {summary.hintRequests} 次。这些是本设备上的操作与棋形记录，不推断你当时是否独立发现，也不是能力评分。</p>
    <div className="guided-report-grid"><section><h3>这盘出现的积极变化</h3>{strengths.length?<ul>{strengths.map((s,i)=><li key={i}>{s}</li>)}</ul>:<p>这盘还没有记录到提子、救一气棋或直接合并。可以从下面的一手重新观察；没有数据时不会补造表现。</p>}</section><section><h3>下一盘只改进一点</h3><p>{summary.improvement}</p></section></div>
    <section><h3>关键局面 · 再作一次选择</h3><p>重试会保存原局，再创建一个保留原来合法历史的变化；原局结果不会被覆盖。</p>{summary.moments.length?<div className="guided-moments">{summary.moments.map(moment=>{const before=game.undoStack[moment.index-1];return <article key={moment.index}><h4>第 {moment.index} 步之前</h4><Board size={game.size} board={before.board} label={`第${moment.index}步之前，轮到你，教学快照`} mode="readonly" selected={null} onSelect={()=>{}} showCoordinates zoom={.75}/><p>{moment.text}</p><button type="button" onClick={()=>onRetry(moment.index-1)}>重新尝试这个局面</button></article>;})}</div>:<p>本局没有棋盘落子，暂时没有关键快照。再下一盘就能留下可回看的局面。</p>}</section>
    <section><h3>本局接触的概念</h3><p>下列数量表示程序记录到的局部现象；0不表示不会，也不等于熟练度。</p><dl className="guided-concepts">{summary.concepts.map(c=><div key={c.concept}><dt>{CONCEPT_LABELS[c.concept]}</dt><dd>{c.count} 次相关变化</dd></div>)}</dl></section>
    <section><h3>下一步</h3><p><a href={next.route}>再观察：{next.label} →</a></p><div className="guided-actions"><a href="#/route">返回学习路线</a><a href="#/play/ai">去普通 AI 对弈</a><a href="#/play/free">和伙伴自由对弈</a><button type="button" onClick={onExport}>导出本局教学报告</button></div></section>
  </section>;
}

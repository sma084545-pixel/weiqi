import type {Size} from '../../core/content.generated';
import type {AnalysisMove} from '../../core/analysis/contract';
import {displayCoord} from '../../core/coordinates';
import type {useKataGoReview} from './useKataGoReview';
import './KataGoReview.css';

const moveText=(move:AnalysisMove,size:Size)=>move.type==='pass'?'停一手':displayCoord(move.at,size);
const rate=(value:number)=>`${(value*100).toFixed(1)}%`;
const lead=(value:number)=>value===0?'预计双方持平':`预计${value>0?'黑方':'白方'}领先 ${Math.abs(value).toFixed(1)} 目`;
export function KataGoReview({analysis,size,index}:{analysis:ReturnType<typeof useKataGoReview>;size:Size;index:number}){
  if(!analysis.allowed)return null;
  const pending=analysis.phase==='loading',result=analysis.result;
  return <section className="katago-review" aria-labelledby="katago-title" data-testid="katago-review" data-state={analysis.phase}>
    <header><div><span className="module-kicker">本局结束后 · 自选复盘</span><h2 id="katago-title">KataGo 复盘分析</h2></div><span className="katago-position">第 {index} 步局面</span></header>
    <p>拖动棋局滑动条选一手，再手动分析。只发送本局起点、着法和贴目；学习记录与反馈不上传。</p>
    {!analysis.configured?<p className="katago-status" role="status">分析服务尚未接通。基本对弈、保存和逐手复盘可正常使用。</p>:<>
      <div className="katago-actions"><button type="button" className="primary-action" disabled={pending} onClick={()=>void analysis.analyze()}>{pending?'分析中…':result?'重新分析当前局面':'分析当前复盘局面'}</button>{pending&&<button type="button" className="outline-action" onClick={analysis.cancel}>取消分析</button>}</div>
      <p className="katago-status" role="status" aria-live="polite" aria-atomic="true">{analysis.message??(pending?'正在请求真实引擎。休眠后的首次请求可能需要更久；不会自动反复重试。':result?'分析完成，推荐点已用数字标在棋盘上。':'分析由你主动发起。切换局面会清除旧结果。')}</p>
    </>}
    {result&&<div className="katago-results" data-testid="katago-result"><div className="katago-summary"><div><span>黑方胜率</span><strong>{rate(result.blackWinrate)}</strong></div><div><span>预计目差 · 黑减白</span><strong>{result.blackScoreLead>0?'+':''}{result.blackScoreLead.toFixed(1)}</strong><small>{lead(result.blackScoreLead)}</small></div></div>
      <p className="katago-caution">胜率和目差是该局面的搜索估计，不是终局裁判，也不改变双方已确认的结果。少量搜索与小模型有局限。</p>
      {result.candidates.length?<ol className="katago-candidates" aria-label="KataGo 候选变化">{result.candidates.map((candidate,rank)=><li key={rank}><div className="katago-candidate-title"><strong>候选 {rank+1} · {moveText(candidate.move,size)}</strong><span>黑方胜率 {rate(candidate.blackWinrate)}</span></div><p>{lead(candidate.blackScoreLead)} · 搜索 {candidate.visits} 次</p><details><summary>查看候选变化</summary><p className="katago-pv">{candidate.pv.length?candidate.pv.map((move,step)=>`${step+1}. ${((step%2===0)===(result.toPlay==='B'))?'黑':'白'} ${moveText(move,size)}`).join(' → '):'此次搜索未提供后续变化。'}</p></details></li>)}</ol>:<p>此次搜索没有返回可显示的候选。可切换到更早的一手复盘。</p>}
      <p className="katago-diagnostics">真实 KataGo {result.engine.version} · 搜索 {result.visits} 次 · 本次 {(result.elapsedMs/1000).toFixed(1)} 秒。所有数值统一以黑方为视角。</p>
    </div>}
  </section>;
}

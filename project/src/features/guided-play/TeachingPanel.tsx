import type {Coord} from '../../core/content.generated';
import type {TeachingAnalysis,MoveObservation} from './types';

export function HintController({analysis,level,loading,failed,disabled,onHint,onFinal,onHide,onRetry,previous=false}:{analysis:TeachingAnalysis|null;level:number;loading:boolean;failed:string;disabled:boolean;onHint:()=>void;onFinal:()=>void;onHide:()=>void;onRetry:()=>void;previous?:boolean}){
  return <section className="guided-hints" aria-label="分级提示" data-hint-level={level}>
    <h3>{previous?'回看上一手的思路':'需要时，再多看一点'}</h3>
    <p>先想一想，再按自己的需要逐级打开。提示不会替你落子。</p>
    {loading&&<p>正在检查局部棋块与合法候选…</p>}
    {failed&&<div role="status"><p>{failed}</p><button type="button" onClick={onRetry}>重新检查提示</button></div>}
    {analysis&&level>=1&&<div className="guided-hint-card"><strong>1 · 思考方向</strong><p>{analysis.hint1}</p></div>}
    {analysis&&level>=2&&<div className="guided-hint-card"><strong>2 · 观察区域</strong><p>{analysis.region.length?'棋盘上已标出一小片区域。先看那里与附近棋子的关系。':'暂时没有找到可提示的落点。可以检查是否需要停一手。'}</p></div>}
    {analysis&&level>=3&&<div className="guided-hint-card"><strong>3 · 比较候选</strong><p>{analysis.candidates.length?`棋盘上有 ${analysis.candidates.length} 个候选。哪一个能照顾自己的气、连接或发展？`:'这里没有已核实的候选。不会为了给答案而伪造落点。'}</p></div>}
    {analysis&&level===4&&<div className="guided-final-hint"><strong>建议尝试</strong><p>{analysis.recommended?analysis.recommended.reason:'先检查还有没有需要继续争取的地方；停一手也是合法选择。'}</p><p>“试”标记仅供考虑，决定仍由你作出。</p></div>}
    <div className="guided-actions"><button type="button" disabled={disabled||loading||!analysis||level>=3} onClick={onHint}>{level===0?'Hint · 给我一个思考方向':level===1?'再给一点：观察区域':'再给一点：候选 A / B / C'}</button>{level===3&&<button type="button" disabled={disabled||!analysis} onClick={onFinal}>我还需要帮助：显示建议点</button>}<button type="button" disabled={level===0} onClick={onHide}>隐藏提示与标记</button></div>
    {level>0&&analysis&&<small>{analysis.boundary}</small>}
  </section>;
}
export function MoveFeedbackCard({observation,awaiting,onContinue,onThink,onUndo}:{observation:MoveObservation;awaiting:boolean;onContinue:()=>void;onThink:()=>void;onUndo:()=>void}){
  return <section className={`guided-feedback feedback-${observation.kind}`} aria-label="本手教学反馈" data-feedback-kind={observation.kind}>
    <h3>{observation.kind==='good'?'✓ ':observation.kind==='danger'?'! ':'○ '}{observation.title}</h3><p>{observation.text}</p><p className="guided-question">{observation.question}</p>
    {awaiting&&<div className="guided-actions"><button type="button" onClick={onContinue}>继续下，让对手回应</button><button type="button" onClick={onThink}>{observation.kind==='good'?'回看这手的思路':'看看更好的思路'}</button><button type="button" onClick={onUndo}>悔棋并重试</button></div>}
  </section>;
}
export function PreMoveQuestion({at,onConfirm,onCancel}:{at:Coord;onConfirm:()=>void;onCancel:()=>void}){
  return <section className="guided-precheck" aria-label="落子前的小问题" data-pending-row={at.row} data-pending-col={at.col}>
    <h3>落子前，先检查一眼</h3><p>这手合法，但落子所在棋块会只剩一口气。能不能先增加气？棋局还没有改变。</p><div className="guided-actions"><button type="button" onClick={onConfirm}>我还是要下这里</button><button type="button" onClick={onCancel}>再想一想</button></div>
  </section>;
}

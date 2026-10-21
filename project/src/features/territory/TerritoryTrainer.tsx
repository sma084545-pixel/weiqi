import {useMemo,useState} from 'react';
import {Board} from '../../components/Board';
import type {AreaScore,Coord,TerminalFixture} from '../../core/content.generated';
import TERRITORY_CARD from '../../../materials/t13/territory-counting-card.md?raw';
import {
  END_FIXTURES,boardMarkers,captureComparison,commitLabels,coordText,emptyLabelHistory,
  fixtureBoard,gradeRegions,labelPoint,regionEvidence,terminalDecision,undoLabels,
  verifiedFixtureScore,type AreaOwner,type LabelHistory,type TerminalDecision,
} from './model';
import './TerritoryTrainer.css';

export {TERRITORY_CARD};

const ownerOptions:{value:AreaOwner;label:string}[]=[
  {value:'B',label:'黑方空点'},{value:'W',label:'白方空点'},{value:'neutral',label:'中立点'},
];
const decisionOptions:{value:TerminalDecision;label:string;help:string}[]=[
  {value:'ready',label:'可按给定假设试算',help:'只用于明确完成或明确教学假设的示例。'},
  {value:'continue-play',label:'继续对弈',help:'局面未完或有争议时，用实际着法解决。'},
  {value:'confirm-dispute',label:'先确认争议棋块',help:'两次停手后，双方先核对死子与中立点。'},
];
const winner=(score:AreaScore)=>score.winner==='B'?'黑方':score.winner==='W'?'白方':'和棋';

function ScoreTable({score}:{score:AreaScore}){
  return <table className="score-table"><caption>面积计分明细</caption><thead><tr><th scope="col">项目</th><th scope="col">黑方</th><th scope="col">白方</th></tr></thead><tbody>
    <tr><th scope="row">剩余活子</th><td>{score.blackStones}</td><td>{score.whiteStones}</td></tr>
    <tr><th scope="row">围住空点</th><td>{score.blackTerritory.length}</td><td>{score.whiteTerritory.length}</td></tr>
    <tr><th scope="row">贴目</th><td>0</td><td>{score.komi}</td></tr>
    <tr className="score-total"><th scope="row">总分</th><td>{score.blackTotal}</td><td>{score.whiteTotal}</td></tr>
  </tbody></table>;
}

function DownloadCard(){
  const download=()=>{const blob=new Blob([TERRITORY_CARD],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='T13-实体棋盘围地操作卡.md';anchor.click();URL.revokeObjectURL(url);};
  return <button type="button" className="quiet-button" onClick={download}>下载实体棋盘操作卡</button>;
}

export function TerritoryTrainer({projector=false}:{projector?:boolean}){
  const [fixtureId,setFixtureId]=useState('END-001');
  const fixture=END_FIXTURES.find(item=>item.id===fixtureId)??END_FIXTURES[0];
  const [decision,setDecision]=useState<TerminalDecision|null>(null);
  const [decisionResult,setDecisionResult]=useState<ReturnType<typeof terminalDecision>|null>(null);
  const [labels,setLabels]=useState<LabelHistory>(emptyLabelHistory);
  const [owner,setOwner]=useState<AreaOwner>('B');
  const [wholeRegion,setWholeRegion]=useState(true);
  const [submitted,setSubmitted]=useState(false);
  const [revealStep,setRevealStep]=useState(0);
  const [trialKomi,setTrialKomi]=useState<number>(fixture.komi);
  const [message,setMessage]=useState('先判断这个示例是否已经具备计分条件。');
  const [completed,setCompleted]=useState<Set<string>>(new Set());
  const regions=useMemo(()=>regionEvidence(fixture),[fixture]);
  const score=useMemo(()=>verifiedFixtureScore(fixture),[fixture]);
  const trialScore=useMemo(()=>verifiedFixtureScore(fixture,trialKomi),[fixture,trialKomi]);
  const ready=Boolean(decisionResult?.ok&&fixture.status!=='unsettled');
  const feedback=submitted?gradeRegions(regions,labels.present):[];
  const allCorrect=submitted&&feedback.every(item=>item.status==='correct');
  const board=fixtureBoard(fixture,ready);

  const reset=(id=fixture.id)=>{
    const next=END_FIXTURES.find(item=>item.id===id)??END_FIXTURES[0];
    setFixtureId(next.id);setDecision(null);setDecisionResult(null);setLabels(emptyLabelHistory());
    setOwner('B');setWholeRegion(true);setSubmitted(false);setRevealStep(0);setTrialKomi(next.komi);
    setMessage('先判断这个示例是否已经具备计分条件。');
  };
  const choosePoint=(point:Coord)=>{
    if(!ready||submitted)return;
    if(board[point.row][point.col]!==null){setMessage('这里是活子，不是空点；请在空交叉点标记归属。');return;}
    setLabels(current=>commitLabels(current,labelPoint(current.present,point,owner,regions,wholeRegion)));
    setMessage(wholeRegion?'已按同一连通空区标记；可以撤回。':'已标记 '+coordText(point,fixture.position.size)+'；可以继续或撤回。');
  };
  const checkDecision=()=>{
    if(!decision){setMessage('请先选择一种判断。');return;}
    const result=terminalDecision(fixture,decision);setDecisionResult(result);setMessage(result.message);
    if(result.ok&&fixture.status==='unsettled')setCompleted(current=>new Set(current).add(fixture.id));
  };
  const submitRegions=()=>{
    setSubmitted(true);setRevealStep(0);setCompleted(current=>new Set(current).add(fixture.id));
    const result=gradeRegions(regions,labels.present);
    setMessage(result.every(item=>item.status==='correct')?'全部连通空区都与本例的已核查结果一致。现在可按顺序查看面积构成。':'已显示逐区边界证据；修正前可重试本例。');
  };
  const marks=submitted&&score
    ?[...score.blackTerritory.map((at,index)=>({markerId:'correct-b-'+index,kind:'ownership' as const,at,owner:'B' as const,label:'正确归属：黑方空点'})),...score.whiteTerritory.map((at,index)=>({markerId:'correct-w-'+index,kind:'ownership' as const,at,owner:'W' as const,label:'正确归属：白方空点'})),...score.neutralPoints.map((at,index)=>({markerId:'correct-n-'+index,kind:'ownership' as const,at,owner:'neutral' as const,label:'正确归属：中立点'}))]
    :boardMarkers(labels.present);

  return <section className={'territory-trainer'+(projector?' territory-projector':'')}>
    <header className="territory-hero"><div><p className="eyebrow">T13 · 围地与数子</p><h1>先确认，再逐区数面积</h1><p>先判断能否计分，再标记黑方空点、白方空点和中立点。这里没有胜率预测，也不会自动猜任意棋块的生死。</p></div><div className="territory-rule"><strong>面积公式</strong><span>活子 + 围空；白方再加开局贴目</span><small>提子记录不重复加分</small></div></header>
    <nav className="territory-nav" aria-label="终局示例">{END_FIXTURES.map(item=><button type="button" key={item.id} aria-pressed={item.id===fixture.id} onClick={()=>reset(item.id)}><strong>{item.id}</strong><span>{item.title}</span></button>)}</nav>
    <div className="territory-layout">
      <section className="territory-board-card" aria-labelledby="fixture-title"><div className="fixture-heading"><div><p>{fixture.status==='unsettled'?'待处理反例':'给定教学假设'} · revision {fixture.revision}</p><h2 id="fixture-title">{fixture.id} · {fixture.title}</h2></div><button type="button" className="quiet-button" onClick={()=>reset()}>重置本例</button></div>
        <Board size={fixture.position.size} board={board} label={fixture.id+' 完整 '+fixture.position.size+' 路棋盘；纸面显示没有裁切'} mode={ready&&!submitted?'mark':'readonly'} selected={null} onSelect={choosePoint} markers={marks} showCoordinates/>
        <p className="board-boundary-note"><strong>完整棋盘：</strong>边和角可以参与围空；此处没有把图片裁边当作棋盘边。</p>
      </section>
      <section className="territory-workbench">
        <div className="exercise-step"><span>1</span><div><h2>这个局面能直接计分吗？</h2><p>先选判断。答案和分数此时不会出现在页面内容或辅助说明中。</p></div></div>
        <fieldset className="decision-field"><legend>选择当前处理方式</legend>{decisionOptions.map(option=><label key={option.value}><input type="radio" name="terminal-decision" checked={decision===option.value} onChange={()=>setDecision(option.value)}/><span><strong>{option.label}</strong><small>{option.help}</small></span></label>)}</fieldset>
        <button type="button" className="primary-button" onClick={checkDecision}>提交终局判断</button>
        <p className={'territory-status '+(decisionResult?.ok?'good':'')} role="status" aria-live="polite">{message}</p>
        {decisionResult?.ok&&fixture.status==='unsettled'&&<div className="unsettled-path"><h3>本例停止在争议处理</h3><p>没有最终分数，也不染色暗示胜负。可回到完整对弈，在双方确认页恢复原盘继续下。</p><a className="primary-link" href="#/play/full-game">打开完整小棋盘对弈</a></div>}
        {ready&&<><div className="exercise-step"><span>2</span><div><h2>给所有空点标归属</h2><p>本例已按题面约定移除确认死子。点击活子只会说明原因，不会改变标记。</p></div></div>
          <fieldset className="owner-field"><legend>当前标记</legend>{ownerOptions.map(option=><label key={option.value}><input type="radio" name="owner" checked={owner===option.value} onChange={()=>setOwner(option.value)}/><span>{option.label}</span></label>)}</fieldset>
          <label className="whole-toggle"><input type="checkbox" checked={wholeRegion} onChange={event=>setWholeRegion(event.target.checked)}/><span><strong>点击时标记整块连通空区</strong><small>关闭后可逐点标记；两种方式都能撤回。</small></span></label>
          <div className="territory-actions"><button type="button" className="outline-button" disabled={!labels.past.length||submitted} onClick={()=>{setLabels(undoLabels);setMessage('已撤回上一次区域标记。');}}>撤回标记</button><button type="button" className="primary-button" disabled={submitted} onClick={submitRegions}>提交区域答案</button></div>
        </>}
      </section>
    </div>
    {submitted&&score&&<section className="region-feedback" aria-labelledby="region-feedback-title"><div><p className="eyebrow">逐区核对</p><h2 id="region-feedback-title">{allCorrect?'区域归属一致':'查看边界后再试'}</h2></div><ol>{feedback.map(item=><li key={item.region.id} className={item.status}><strong>{item.region.id} · {item.region.points.map(point=>coordText(point,fixture.position.size)).join('、')}</strong><span>{item.message}</span>{item.region.touchesBoardEdge&&<small>这个空区接触真实棋盘边；棋盘边可以参与封闭。</small>}</li>)}</ol><div className="feedback-actions"><button type="button" className="outline-button" onClick={()=>{setSubmitted(false);setRevealStep(0);setMessage('答案已重新隐藏，可修改标记后再提交。');}}>隐藏答案后重试</button><button type="button" className="primary-button" onClick={()=>setRevealStep(Math.max(1,revealStep))}>按顺序查看面积构成</button></div></section>}
    {submitted&&score&&revealStep>0&&<section className="score-reveal" aria-labelledby="score-reveal-title"><div className="reveal-head"><div><p className="eyebrow">第 {revealStep} / 6 步</p><h2 id="score-reveal-title">面积明细按顺序展开</h2></div><div><button type="button" className="quiet-button" disabled={revealStep<=1} onClick={()=>setRevealStep(step=>step-1)}>上一步</button><button type="button" className="primary-button" disabled={revealStep>=6} onClick={()=>setRevealStep(step=>step+1)}>下一步</button></div></div>
      <ol className="reveal-list">
        {revealStep>=1&&<li><strong>1. 确认死子</strong><span>{fixture.agreement.deadStones.length?fixture.agreement.deadStones.map(point=>coordText(point,fixture.position.size)).join('、'):'本例没有标记死子'}。这是题面给定的教学假设，不是自动判断。</span></li>}
        {revealStep>=2&&<li><strong>2. 剩余活子</strong><span>黑 {score.blackStones} 子，白 {score.whiteStones} 子。</span></li>}
        {revealStep>=3&&<li><strong>3. 围住空点</strong><span>黑 {score.blackTerritory.length} 点，白 {score.whiteTerritory.length} 点。</span></li>}
        {revealStep>=4&&<li><strong>4. 中立点</strong><span>{score.neutralPoints.length} 点，不归任何一方。</span></li>}
        {revealStep>=5&&<li><strong>5. 贴目</strong><span>白方加 {score.komi}；这是本例开局确定的数值。</span></li>}
        {revealStep>=6&&<li><strong>6. 总分</strong><span>黑 {score.blackTotal}，白 {score.whiteTotal}；结果：{winner(score)}{score.winner==='draw'?'':'领先 '+Math.abs(score.difference)}。</span></li>}
      </ol>
      {revealStep>=6&&<><ScoreTable score={score}/><p className="capture-note">提子记录：黑 {fixture.captureCountsForComparison.B}、白 {fixture.captureCountsForComparison.W}。它只作比较，不进入上表公式。</p>
        <section className="komi-lab" aria-labelledby="komi-title"><div><h3 id="komi-title">复制成教学试算</h3><p>只改变这份临时计算；正式 {fixture.id} 的贴目仍是 {fixture.komi}。</p></div><label>试算贴目 <input type="number" step="0.5" value={trialKomi} onChange={event=>{const value=event.currentTarget.valueAsNumber;if(Number.isFinite(value))setTrialKomi(value);}}/></label><button type="button" className="outline-button" onClick={()=>setTrialKomi(fixture.komi)}>恢复原示例</button>{trialScore&&<p role="status">教学试算：黑 {trialScore.blackTotal}，白 {trialScore.whiteTotal}，结果 {winner(trialScore)}。原示例未改动。</p>}</section>
      </>}
    </section>}
    <section className="capture-comparison" aria-labelledby="capture-compare-title"><div><p className="eyebrow">两个预设实例</p><h2 id="capture-compare-title">提子账本不能单独决定赢家</h2><p>完成 END-001 和 END-005 的预测后，才能展开它们的面积结果，避免提前泄题。</p></div>
      {(['END-001','END-005'] as const).every(id=>completed.has(id))?<div className="comparison-grid">{captureComparison().map(({fixture:item,score:itemScore})=><article key={item.id}><h3>{item.id}</h3><p>黑提 {item.captureCountsForComparison.B}，白提 {item.captureCountsForComparison.W}</p><strong>面积：黑 {itemScore.blackTotal} · 白 {itemScore.whiteTotal}</strong><span>{winner(itemScore)}</span></article>)}<p className="comparison-conclusion">相同终局盘面与贴目产生相同面积分，即使提子账本不同。提子在对局中会改变盘面，但不能在面积公式里再次加分。</p></div>:<p className="comparison-locked">尚未完成这两个示例。你可以从上方题号自由切换；这不是通关门槛。</p>}
    </section>
    <section className="offline-card"><div><h2>没有个人设备时</h2><p>下载同一规则的 Markdown 操作卡，用实体棋盘分工标空点和数子。正式任意棋局仍回到 T08 的双方确认流程。</p></div><DownloadCard/></section>
  </section>;
}

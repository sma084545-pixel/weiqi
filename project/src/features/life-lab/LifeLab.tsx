import {useMemo,useState} from 'react';
import {Board} from '../../components/Board';
import type {BoardMarker} from '../../components/board.types';
import type {Coord,StoneValue} from '../../core/content.generated';
import {RULE_ERROR_ZH} from '../../core/rules';
import {PuzzleRunner} from '../puzzle-runner/PuzzleRunner';
import {PUZZLE_CATALOG,positionBoard} from '../puzzle-runner/catalog';
import {FULL_GAME_ROUTE} from '../learning-hub/registry';
import {LIFE_BY_ID,LIFE_REFERENCES,LIFE_SCENARIOS,OUTER_LIBERTY_FRAMES,boardForPosition,puzzleForScenario,runLifeScenario,samePoint,targetGroupPoints,type LifeScenarioId} from './model';
import './LifeLab.css';

const COLOR_LABEL={B:'黑方',W:'白方'} as const;
const pointLabel=(point:Coord,size:number)=>`${'ABCDEFGHJKLMNOPQRST'[point.col]}${size-point.row}`;
const groupMarkers=(scenarioId:LifeScenarioId):BoardMarker[]=>{
  const scenario=LIFE_SCENARIOS[scenarioId],puzzle=puzzleForScenario(scenario);
  return [
    ...targetGroupPoints(puzzle).map((at,index)=>({markerId:`target-group-${index}`,kind:'group' as const,at,label:'目标棋块'})),
    {markerId:'candidate',kind:'candidate' as const,at:scenario.candidate,label:`候选点 ${pointLabel(scenario.candidate,puzzle.initialPosition.size)}`},
  ];
};

function GuessLab(){
  const [scenarioId,setScenarioId]=useState<LifeScenarioId>('false-eye');
  const [guess,setGuess]=useState<'legal'|'illegal'|null>(null);
  const [selected,setSelected]=useState<Coord|null>(null);
  const [result,setResult]=useState<ReturnType<typeof runLifeScenario>|null>(null);
  const [pointIssue,setPointIssue]=useState('');
  const scenario=LIFE_SCENARIOS[scenarioId],puzzle=puzzleForScenario(scenario);
  const board=result?.ok?result.trial.nextState.board:positionBoard(puzzle);
  const choose=(id:LifeScenarioId)=>{setScenarioId(id);setGuess(null);setSelected(null);setResult(null);setPointIssue('');};
  const verify=()=>{if(!guess||!selected)return;if(!samePoint(selected,scenario.candidate)){setPointIssue(`这一步要核对 ${pointLabel(scenario.candidate,puzzle.initialPosition.size)}。请在棋盘上重新选择带圆点的候选点。`);setResult(null);return;}setPointIssue('');setResult(runLifeScenario(scenario));};
  const actualLegal=result?.ok===true;
  const matched=result?(guess==='legal')===actualLegal:false;
  const actual=result?(actualLegal?`规则结果：可以合法落子${result.trial.event.captured.length?`，提走 ${result.trial.event.captured.length} 子`:''}。`:`规则结果：不能落子（${RULE_ERROR_ZH[result.error.code]}）。`):'';
  return <section className="life-section guess-lab" aria-labelledby="guess-title">
    <div className="life-section-heading"><div><p className="eyebrow">第 1 步 · 先猜再验证</p><h2 id="guess-title">对方能落在被围住的空点吗？</h2></div><span className="evidence-chip">引擎实时核对</span></div>
    <div className="scenario-switch" role="group" aria-label="选择真眼或假眼对照">
      <button type="button" aria-pressed={scenarioId==='false-eye'} onClick={()=>choose('false-eye')}>先看假眼</button>
      <button type="button" aria-pressed={scenarioId==='two-eyes'} onClick={()=>choose('two-eyes')}>再看两个真眼</button>
    </div>
    <div className="life-board-grid">
      <div className="life-board-card">
        <div className="board-facts"><span>当前轮次：<strong>{COLOR_LABEL[scenario.toPlay]}</strong></span><span>目标：<strong>黑方标记棋块</strong></span></div>
        <Board size={puzzle.initialPosition.size} board={board} label={`${scenario.title}，${scenario.question}`} mode={result?'readonly':'select'} selected={selected} onSelect={at=>{setSelected(at);setResult(null);setPointIssue('');}} markers={groupMarkers(scenarioId)} showCoordinates/>
      </div>
      <div className="guess-card">
        <p className="lesson-kicker">{scenario.title}</p><h3>{scenario.question}</h3>
        <fieldset><legend>先选你的预测</legend><label><input type="radio" name="eye-guess" checked={guess==='legal'} onChange={()=>{setGuess('legal');setResult(null);}}/>可以合法落子</label><label><input type="radio" name="eye-guess" checked={guess==='illegal'} onChange={()=>{setGuess('illegal');setResult(null);}}/>不能合法落子</label></fieldset>
        <p className="selection-instruction">再在棋盘上选择带圆点的候选交叉点。当前：{selected?pointLabel(selected,puzzle.initialPosition.size):'尚未选点'}</p>
        <button type="button" className="primary-button" onClick={verify} disabled={!guess||!selected}>验证这一步</button>{pointIssue&&<p className="point-issue" role="status">{pointIssue}</p>}
        {result&&<div className={`life-feedback ${matched?'matched':'rethink'}`} role="status" aria-live="polite"><strong>{matched?'预测与规则结果一致':'结果和预测不同，可以重看原因'}</strong><p>{actual}</p><p>{scenario.explanation}</p></div>}
      </div>
    </div>
  </section>;
}

function ShapeComparison(){
  const trueEye=LIFE_BY_ID.get('LIFE-001')!,connected=LIFE_BY_ID.get('LIFE-005')!;
  const cards=[
    {kind:'safe',title:'两个独立眼',puzzle:trueEye,points:[{row:1,col:1},{row:1,col:3}],copy:'B4 与 D4 互不相通，眼壁属于同一个黑连通块。白若先填一个眼，另一眼仍给黑块留气。'},
    {kind:'warning',title:'两个相连空点',puzzle:connected,points:[{row:0,col:1},{row:0,col:2}],copy:'B5 与 C5 正交相邻，属于一个两点空区。LIFE-005 只在完整 5×5、最多三手的已核查变化内证明标记原黑块会被提。'},
  ] as const;
  return <section className="life-section" aria-labelledby="shape-title"><div className="life-section-heading"><div><p className="eyebrow">第 2 步 · 比较结构</p><h2 id="shape-title">两个空点，不一定是两只眼</h2></div><span className="evidence-chip">完整 5×5</span></div><div className="shape-cards">{cards.map(card=><article className={`shape-card ${card.kind}`} key={card.title}><div><span className="shape-label">{card.kind==='safe'?'结构 A':'结构 B'}</span><h3>{card.title}</h3><p>{card.copy}</p></div><Board size={5} board={positionBoard(card.puzzle)} label={`${card.title}对照，引用${card.puzzle.id}修订${card.puzzle.revision}`} mode="readonly" selected={null} onSelect={()=>{}} markers={card.points.map((at,index)=>({markerId:`space-${index}`,kind:'candidate',at,label:card.title}))} showCoordinates={false} zoom={.75}/><small>引用 {card.puzzle.id} · 修订 {card.puzzle.revision}</small></article>)}</div></section>;
}

function OuterLibertyStepper(){
  const [step,setStep]=useState(0),frame=OUTER_LIBERTY_FRAMES[step];
  const puzzle=LIFE_BY_ID.get('LIFE-002')!;
  const markers:BoardMarker[]=[...targetGroupPoints(puzzle).map((at,index)=>({markerId:`outer-target-${index}`,kind:'group',at,label:'目标棋块'} as const)),...frame.remaining.map((at,index)=>({markerId:`remaining-${index}`,kind:'liberty',at,label:'尚未填的外气'} as const)),{markerId:'shared-last',kind:'candidate',at:{row:2,col:2},label:'共同候选点 C3'}];
  return <section className="life-section" aria-labelledby="outer-title"><div className="life-section-heading"><div><p className="eyebrow">条件演示</p><h2 id="outer-title">为什么要先填外气？</h2></div><span className="evidence-chip">4 个可回看步骤</span></div><div className="outer-grid"><div className="life-board-card"><Board size={5} board={boardForPosition(frame.position)} label={`填外气第${step+1}步：${frame.title}`} mode="readonly" selected={null} onSelect={()=>{}} markers={markers} showCoordinates/></div><div className="step-copy"><ol className="mini-progress" aria-label="填外气步骤">{OUTER_LIBERTY_FRAMES.map(item=><li key={item.step} aria-current={item.step===step?'step':undefined}><button type="button" onClick={()=>setStep(item.step)} aria-label={`查看第${item.step+1}步：${item.title}`}>{item.step+1}</button></li>)}</ol><p className="lesson-kicker">第 {step+1} 步</p><h3>{frame.title}</h3><p>{frame.description}</p><p className="scope-note"><strong>条件：</strong>这里只跟踪 LIFE-002 标记的三个黑块。填外气的用途是把 C3 变成它们的最后一气；它不是“看见眼就先填外围”的通用策略。</p><div className="step-actions"><button type="button" className="outline-button" onClick={()=>setStep(value=>Math.max(0,value-1))} disabled={step===0}>上一步</button><button type="button" className="primary-button" onClick={()=>setStep(value=>Math.min(OUTER_LIBERTY_FRAMES.length-1,value+1))} disabled={step===OUTER_LIBERTY_FRAMES.length-1}>下一步</button></div></div></div></section>;
}

function KeyPointComparison(){
  const views=(['key-black','key-white'] as const).map(id=>({scenario:LIFE_SCENARIOS[id],result:runLifeScenario(LIFE_SCENARIOS[id])}));
  return <section className="life-section" aria-labelledby="key-title"><div className="life-section-heading"><div><p className="eyebrow">第 3 步 · 更换先手</p><h2 id="key-title">同一个关键点，轮次会改变结果</h2></div><span className="evidence-chip">两次独立重放</span></div><div className="key-cards">{views.map(({scenario,result})=>{const puzzle=puzzleForScenario(scenario);const board=result.ok?result.trial.nextState.board:positionBoard(puzzle);const markers:BoardMarker[]=[...targetGroupPoints(puzzle).map((at,index)=>({markerId:`key-target-${index}`,kind:'group',at,label:'目标黑棋块'} as const)),{markerId:'key',kind:'last-move',at:scenario.candidate,label:'关键点 B5'}];return <article key={scenario.id}><div className="turn-badge">{COLOR_LABEL[scenario.toPlay]}先 · 目标黑棋块</div><h3>{scenario.title}</h3><Board size={5} board={board} label={`${scenario.title}，在B5落子后的完整棋盘`} mode="readonly" selected={null} onSelect={()=>{}} markers={markers} showCoordinates={false} zoom={.75}/><p>{scenario.explanation}</p></article>;})}</div><p className="scope-note"><strong>不越界的结论：</strong>黑先的这一手满足 LIFE-003 的“本手做出两眼”目标；白先只证明白 B5 合法并占住关键点。它不等于对整个棋块作永久死活裁判。</p></section>;
}

function EvidenceBoundary({onPractice}:{onPractice:(id:string|null)=>void}){
  return <section className="life-section evidence-section" aria-labelledby="evidence-title"><div className="life-section-heading"><div><p className="eyebrow">继续练习</p><h2 id="evidence-title">进入原题的提示与变化树</h2></div><span className="evidence-chip">不复制答案</span></div><p>LIFE 正式题继续使用 T10 的三层提示、已核查变化树和 unknown 处理。本专题没有建立第二套判题。</p><div className="life-reference-list">{LIFE_REFERENCES.map(reference=><button type="button" key={reference.id} onClick={()=>onPractice(reference.id)}><strong>{reference.id}</strong><span>修订 {reference.revision}</span></button>)}</div><div className="boundary-box"><strong>证据边界</strong><p>LIFE-005 的 <code>verified-dead</code> 只对应完整 5×5、最多白黑白三手、提掉标记原黑块的已核查终点。其他合法但未收录的手保持未知。两个受保护的独立真眼是基础活形的充分结构；没有两眼不自动等于死亡，双活等情形存在。</p><p>自动规则与模型推导已经核对；人类教师复核仍为空，不能写成教师已审。</p></div><div className="life-end-actions"><button type="button" className="primary-button" onClick={()=>onPractice('LIFE-001')}>从 LIFE-001 开始</button><a className="outline-link" href={FULL_GAME_ROUTE}>返回自由对弈</a></div></section>;
}

export function LifeLab(){
  const [practiceId,setPracticeId]=useState<string|null|undefined>(undefined);
  const lifeCatalog=useMemo(()=>PUZZLE_CATALOG.filter(item=>item.puzzle.category==='LIFE'),[]);
  if(practiceId!==undefined)return <section className="life-practice-shell"><button type="button" className="back-link life-back" onClick={()=>setPracticeId(undefined)}>← 返回眼与死活小课</button><PuzzleRunner catalog={lifeCatalog} initialSelectedId={practiceId}/></section>;
  return <article className="life-lab" data-testid="life-lab"><header className="life-hero"><div><p><a href="#/route/STAGE-05">← 返回第 5 阶段</a></p><p className="eyebrow">眼与基础死活 · 可自由跳过</p><h1>先问一手能不能下，再谈“活”与“死”</h1><p>从一块被围的棋开始：先猜对方能否落进空点，再让规则引擎重放。每个结论都只适用于写明的完整棋盘与轮次。</p><div className="hero-actions"><a className="primary-link" href="#first-eye-check">开始短课</a><a className="outline-link" href={FULL_GAME_ROUTE}>返回自由对弈</a></div></div><div className="hero-eye-diagram" aria-hidden="true"><span className="eye-stone s1"/><span className="eye-stone s2"/><span className="eye-stone s3"/><span className="eye-stone s4"/><i>眼</i></div></header><nav className="life-progress" aria-label="短课步骤"><ol><li><span>1</span><a href="#first-eye-check">能否落子</a></li><li><span>2</span><a href="#shape-compare">比较眼形</a></li><li><span>3</span><a href="#formal-life">原题练习</a></li></ol></nav><div id="first-eye-check"><GuessLab/></div><div id="shape-compare"><ShapeComparison/></div><OuterLibertyStepper/><KeyPointComparison/><div id="formal-life"><EvidenceBoundary onPractice={setPracticeId}/></div></article>;
}

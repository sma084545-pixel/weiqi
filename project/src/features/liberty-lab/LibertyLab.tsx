import {useMemo,useState} from 'react';
import {Board} from '../../components/Board';
import type {BoardMarker} from '../../components/board.types';
import type {Coord,Size} from '../../core/content.generated';
import {displayCoord} from '../../core/coordinates';
import {rulesEngine} from '../../core/rules';
import {CAPTURE_LAB_ROUTE,ROUTE_ROUTE} from '../learning-hub/registry';
import {LIBERTY_DEMOS} from './demos';
import {evaluateLibertyCount,evaluateLibertySet,pointList} from './evaluation';
import './LibertyLab.css';

type LabMode='observe'|'circle'|'predict';
type Feedback={tone:'neutral'|'good'|'try';message:string}|null;
const same=(a:Coord,b:Coord)=>a.row===b.row&&a.col===b.col;
const key=(point:Coord)=>`${point.row},${point.col}`;

export function LibertyLab({projector=false}:{projector?:boolean}){
  const [demoIndex,setDemoIndex]=useState(0);
  const [phaseIndex,setPhaseIndex]=useState(0);
  const [mode,setMode]=useState<LabMode>('observe');
  const [selectedAt,setSelectedAt]=useState<Coord|null>(null);
  const [selectedPoints,setSelectedPoints]=useState<Coord[]>([]);
  const [prediction,setPrediction]=useState('');
  const [revealed,setRevealed]=useState(false);
  const [feedback,setFeedback]=useState<Feedback>(null);
  const [completed,setCompleted]=useState(false);
  const [resetViewKey,setResetViewKey]=useState(0);

  const demo=LIBERTY_DEMOS[demoIndex];
  const phase=demo.phases[phaseIndex]??demo.phases[0];
  const target=selectedAt??phase.target;
  const groupResult=rulesEngine.getGroup(phase.board,target);
  const libertyResult=rulesEngine.getLiberties(phase.board,target);
  const group=groupResult.ok&&groupResult.value?groupResult.value.stones:[];
  const liberties=libertyResult.ok?libertyResult.value:[];
  const isDefaultTarget=same(target,phase.target);

  const clearResponse=()=>{setSelectedPoints([]);setPrediction('');setRevealed(false);setFeedback(null);setCompleted(false);};
  const resetTask=()=>{setSelectedAt(null);clearResponse();setResetViewKey(value=>value+1);};
  const changeMode=(next:LabMode)=>{setMode(next);clearResponse();};
  const changeDemo=(index:number)=>{setDemoIndex(index);setPhaseIndex(0);setSelectedAt(null);clearResponse();setResetViewKey(value=>value+1);};
  const changePhase=(index:number)=>{setPhaseIndex(index);setSelectedAt(null);clearResponse();setResetViewKey(value=>value+1);};

  const markers=useMemo<BoardMarker[]>(()=>{
    const result:BoardMarker[]=group.map((at,index)=>({markerId:`group-${index}`,kind:'group',at,label:'已选中的整块棋'}));
    for(const [index,at] of selectedPoints.entries())result.push({markerId:`choice-${index}`,kind:'candidate',at,label:'你圈选的点'});
    if(revealed)for(const [index,at] of liberties.entries())result.push({markerId:`liberty-${index}`,kind:'liberty',at,label:'核对后的气'});
    return result;
  },[group,liberties,revealed,selectedPoints]);

  const selectPoint=(at:Coord)=>{
    const value=phase.board[at.row]?.[at.col]??null;
    if(value){setSelectedAt(at);clearResponse();setFeedback({tone:'neutral',message:'已选中这颗棋子所在的整个棋块。请继续观察。'});return;}
    if(mode!=='circle'){setFeedback({tone:'neutral',message:`${displayCoord(at,demo.puzzle.initialPosition.size)} 是空点。请先选择一颗棋子来选中整个棋块。`});return;}
    setRevealed(false);setFeedback(null);setCompleted(false);
    setSelectedPoints(previous=>previous.some(point=>same(point,at))?previous.filter(point=>!same(point,at)):[...previous,at]);
  };

  const submitCircle=()=>{
    const result=evaluateLibertySet(liberties,selectedPoints);
    setRevealed(true);setCompleted(result.correct);
    if(result.correct){setFeedback({tone:'good',message:'你圈出的点与这块棋的去重气集合完全一致。'});return;}
    const size=demo.puzzle.initialPosition.size;
    const parts=[`漏选：${pointList(result.missing,size)}`,`误选：${pointList(result.extra,size)}`];
    if(result.duplicates.length)parts.push(`重复提交：${pointList(result.duplicates,size)}；同一点只记一次`);
    setFeedback({tone:'try',message:`还需要调整。${parts.join('；')}。`});
  };

  const submitPrediction=()=>{
    const result=evaluateLibertyCount(liberties.length,prediction);
    if(!result.valid){setRevealed(false);setCompleted(false);setFeedback({tone:'try',message:result.message});return;}
    setRevealed(true);setCompleted(result.correct);
    setFeedback({tone:result.correct?'good':'try',message:result.message});
  };

  const retry=()=>{clearResponse();};
  const size=demo.puzzle.initialPosition.size as Size;
  const explanation=isDefaultTarget?demo.puzzle.answer.type==='point-set'?demo.puzzle.answer.explanation:'':`你选择了演示中的另一个棋块；上方结果按当前完整棋盘重新核对。`;

  return <div className="liberty-lab-page">
    <section className="liberty-hero">
      <p><a href={ROUTE_ROUTE}>← 返回学习路线</a></p>
      <h1>气实验室</h1>
      <p className="liberty-lead">选棋块，圈出气，先猜再验证。这里练习观察，不记录分数，也不会限制你打开其他活动。</p>
    </section>

    <section className="demo-picker" aria-labelledby="demo-picker-title">
      <div><h2 id="demo-picker-title">选择演示</h2><p>{demo.id} · 开发演示，不计入正式题库</p></div>
      <ol>{LIBERTY_DEMOS.map((item,index)=><li key={item.id}><button type="button" aria-pressed={index===demoIndex} onClick={()=>changeDemo(index)}><span>{String(index+1).padStart(2,'0')}</span>{item.title}</button></li>)}</ol>
    </section>

    <fieldset className="mode-picker"><legend>选择观察方式</legend>
      <label><input type="radio" name="liberty-mode" checked={mode==='observe'} onChange={()=>changeMode('observe')}/><span><strong>自由观察</strong><small>点棋子，再按需显示。</small></span></label>
      <label><input type="radio" name="liberty-mode" checked={mode==='circle'} onChange={()=>changeMode('circle')}/><span><strong>圈出全部气</strong><small>用点集提交你的观察。</small></span></label>
      <label><input type="radio" name="liberty-mode" checked={mode==='predict'} onChange={()=>changeMode('predict')}/><span><strong>先猜气数再验证</strong><small>提交前隐藏答案。</small></span></label>
    </fieldset>

    <section className="liberty-workspace" data-demo-id={demo.id} data-mode={mode} data-complete={completed||undefined}>
      <div className="liberty-board-panel">
        {demo.phases.length>1&&<div className="phase-switch" role="group" aria-label="连接前后棋形"><span>比较棋形</span>{demo.phases.map((item,index)=><button type="button" key={item.id} aria-pressed={phaseIndex===index} onClick={()=>changePhase(index)}>{item.label}</button>)}</div>}
        <Board size={size} board={phase.board} label={`${demo.title}，完整${size}路观察棋盘`} mode="select" selected={target} onSelect={selectPoint} markers={markers} showCoordinates displayMode={projector?'projector':'standard'} resetViewKey={resetViewKey}/>
        <p className="board-selection-note" role="status">双线轮廓表示当前选中的整个棋块。空点可在“圈出全部气”模式中选择；重复点一次会取消。</p>
      </div>

      <div className="task-panel">
        <div className="task-heading"><div><span className="eyebrow">{demo.id} · {phase.label}</span><h2>{demo.title}</h2></div><span className="demo-count">{demoIndex+1} / 8</span></div>
        <p>{demo.puzzle.prompt}</p>
        <div className="safe-prompt"><strong>当前任务</strong><p>{mode==='observe'?'点任一棋子可改选棋块；准备好后再显示气。':mode==='circle'?'在棋盘上圈出这个棋块的全部气，然后提交点集。':'先在心里沿整块外缘检查，再写下你的预测。'}</p></div>

        {mode==='observe'&&<button type="button" className="primary-action" onClick={()=>{setRevealed(true);setFeedback({tone:'neutral',message:'气环与去重数量已显示；可改选另一棋块继续观察。'});}}>显示全部气</button>}
        {mode==='circle'&&<div className="task-actions"><button type="button" className="primary-action" onClick={submitCircle}>提交圈选并核对</button><button type="button" className="quiet-action" onClick={()=>{setSelectedPoints([]);setFeedback(null);setRevealed(false);}}>清空圈选</button></div>}
        {mode==='predict'&&<form className="prediction-form" onSubmit={event=>{event.preventDefault();submitPrediction();}} noValidate>
          <label htmlFor="liberty-prediction">我预测这个棋块的气数</label>
          <input id="liberty-prediction" value={prediction} onChange={event=>{setPrediction(event.target.value);setFeedback(null);setRevealed(false);setCompleted(false);}} inputMode="decimal" autoComplete="off" aria-describedby="prediction-help"/>
          <span id="prediction-help">请输入非负整数；提交前页面不会显示正确数量或气环。</span>
          <button type="submit" className="primary-action">提交预测并验证</button>
        </form>}

        <div className={`lab-feedback${feedback?` ${feedback.tone}`:''}`} role="status" aria-live="polite">
          <strong>观察反馈</strong>
          <p>{feedback?.message??'还没有提交答案。先观察棋形，想一想，再验证。'}</p>
          {revealed&&<p className="revealed-result">核对结果：共有 <strong>{liberties.length}</strong> 口气；坐标为 {pointList(liberties,size)}。</p>}
        </div>
        {revealed&&<div className="teacher-note"><strong>教师说明</strong><p>{explanation}</p></div>}
        {revealed&&<button type="button" className="retry-action" onClick={retry}>隐藏提示后重试</button>}
        <button type="button" className="reset-action" onClick={resetTask}>重置当前演示</button>
      </div>
    </section>

    {completed&&<section className="physical-followup" aria-labelledby="physical-followup-title">
      <div><span aria-hidden="true">双</span></div><div><h2 id="physical-followup-title">和伙伴在实体棋盘继续</h2><p>把当前棋形摆在完整 5 路区域：一人指出一个棋块，另一人用备用棋子或手指标出每个不同的气；互相核对后交换角色。</p></div>
      <a className="outline-link" href={CAPTURE_LAB_ROUTE}>进入提子实验室</a>
    </section>}
  </div>;
}

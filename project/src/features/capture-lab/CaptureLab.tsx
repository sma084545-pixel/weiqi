import {useCallback,useMemo,useState} from 'react';
import {Board} from '../../components/Board';
import type {BoardMarker} from '../../components/board.types';
import type {Coord,GameState,Size} from '../../core/content.generated';
import {displayCoord} from '../../core/coordinates';
import {RULE_ERROR_ZH,rulesEngine,type Trial} from '../../core/rules';
import {BOARD_LAB_ROUTE,CAPTURE_GAME_ROUTE,ROUTE_ROUTE} from '../learning-hub/registry';
import {CAPTURE_DEMOS} from './demos';
import {evaluateCapturePrediction,type CaptureEvaluation} from './evaluation';
import {createCaptureFrames} from './frames';
import {StepPlayer} from './StepPlayer';
import './CaptureLab.css';

const same=(a:Coord,b:Coord)=>a.row===b.row&&a.col===b.col;
const pointKey=(at:Coord)=>`${at.row},${at.col}`;

function startDemo(index:number):GameState{
  const demo=CAPTURE_DEMOS[index];
  const result=rulesEngine.startGame(demo.puzzle.initialPosition,{mode:'full-game',komi:0,gameId:`GAME-${demo.id}`});
  if(!result.ok)throw new Error(`${demo.id} 不能建立规则起点：${result.error.code}`);
  return result.value;
}

function pointText(points:readonly Coord[],size:Size):string{return points.length?points.map(point=>displayCoord(point,size)).join('、'):'无';}

export function CaptureLab({projector=false}:{projector?:boolean}){
  const [demoIndex,setDemoIndex]=useState(0);
  const [state,setState]=useState(()=>startDemo(0));
  const [candidate,setCandidate]=useState<Coord|null>(null);
  const [trial,setTrial]=useState<Trial|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [prediction,setPrediction]=useState<Coord[]>([]);
  const [explicitNone,setExplicitNone]=useState(false);
  const [evaluation,setEvaluation]=useState<CaptureEvaluation|null>(null);
  const [started,setStarted]=useState(false);
  const [step,setStep]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [committed,setCommitted]=useState(false);
  const [reducedMotion,setReducedMotion]=useState(()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [resetViewKey,setResetViewKey]=useState(0);
  const demo=CAPTURE_DEMOS[demoIndex];
  const size=demo.puzzle.initialPosition.size as Size;
  const targets=demo.puzzle.targetMarkers.flatMap(marker=>marker.points);
  const trialColor=trial?.nextState.lastMove?.type==='place'?trial.nextState.lastMove.color:state.toPlay;
  const frames=useMemo(()=>trial?createCaptureFrames(trial,trialColor,size):[],[size,trial,trialColor]);
  const activeFrame=started&&frames.length?frames[Math.min(step,frames.length-1)]:null;

  const clearAttempt=()=>{setCandidate(null);setTrial(null);setError(null);setPrediction([]);setExplicitNone(false);setEvaluation(null);setStarted(false);setStep(0);setPlaying(false);setCommitted(false);};
  const changeDemo=(index:number)=>{setDemoIndex(index);setState(startDemo(index));clearAttempt();setResetViewKey(value=>value+1);};

  const chooseCandidate=(at:Coord)=>{
    if(started)return;
    const snapshot=JSON.stringify(state);
    const result=rulesEngine.tryMove(state,{type:'place',color:state.toPlay,at});
    setCandidate(at);setPrediction([]);setExplicitNone(false);setEvaluation(null);setCommitted(false);
    if(!result.ok){setTrial(null);setError(`${displayCoord(at,size)}：${RULE_ERROR_ZH[result.error.code]}`);if(JSON.stringify(state)!==snapshot)throw new Error('非法试下改变了输入状态');return;}
    setTrial(result.value);setError(null);
  };

  const toggleTarget=(at:Coord)=>{setExplicitNone(false);setEvaluation(null);setPrediction(previous=>previous.some(point=>same(point,at))?previous.filter(point=>!same(point,at)):[...previous,at]);};
  const chooseNone=()=>{setPrediction([]);setExplicitNone(true);setEvaluation(null);};
  const begin=()=>{
    if(!trial){setError('请先在棋盘上选择一个合法候选落点。');return;}
    const result=evaluateCapturePrediction(trial.event.captured,{selected:prediction,explicitNone});
    setEvaluation(result);if(!result.valid)return;
    setStarted(true);setStep(0);setPlaying(!reducedMotion);
    if(reducedMotion)setStep(3);
  };
  const complete=useCallback(()=>{
    if(!trial||committed)return;
    setState(trial.nextState);setCommitted(true);setPlaying(false);
  },[committed,trial]);
  const undoAttempt=()=>{
    const result=rulesEngine.undo(state);
    if(result.ok)setState(result.value);
    clearAttempt();setResetViewKey(value=>value+1);
  };
  const reset=()=>{setState(startDemo(demoIndex));clearAttempt();setResetViewKey(value=>value+1);};
  const changeReduced=(checked:boolean)=>{setReducedMotion(checked);if(checked&&started){setPlaying(false);setStep(3);}};

  const markers=useMemo<BoardMarker[]>(()=>{
    if(activeFrame)return [...activeFrame.markers];
    const result:BoardMarker[]=targets.map((at,index)=>({markerId:`target-${index}`,kind:'target',at,label:'本演示要求预测的目标棋'}));
    if(candidate)result.push({markerId:'candidate',kind:'candidate',at:candidate,label:'你选择的候选落点'});
    return result;
  },[activeFrame,candidate,targets]);
  const board=activeFrame?.board??state.board;
  const finished=committed&&step===3;

  return <div className="capture-lab-page" data-demo-id={demo.id} data-playing={started||undefined} data-committed={committed||undefined}>
    <section className="capture-hero">
      <p><a href={ROUTE_ROUTE}>← 返回学习路线</a></p><h1>提子实验室</h1>
      <p>选择落点，预测会被提的棋。先猜再验证，逐步观察气的变化，理解提子的条件。</p>
    </section>
    <section className="capture-demo-picker" aria-labelledby="capture-demo-title">
      <div><h2 id="capture-demo-title">选择演示</h2><p>{demo.id} · 开发演示，不计入正式题库</p></div>
      <ol>{CAPTURE_DEMOS.map((item,index)=><li key={item.id}><button type="button" aria-pressed={index===demoIndex} onClick={()=>changeDemo(index)}><span>{String(index+1).padStart(2,'0')}</span>{item.shortTitle}</button></li>)}</ol>
    </section>

    <section className="capture-workspace">
      <div className="capture-board-panel">
        <div className="capture-panel-heading"><div><span>{demo.id} · 当前棋形</span><h2>{demo.title}</h2></div><strong>{demoIndex+1} / 6</strong></div>
        <Board size={size} board={board} label={`${demo.title}，完整${size}路提子演示棋盘`} mode="select" disabled={started} selected={candidate} onSelect={chooseCandidate} markers={markers} showCoordinates displayMode={projector?'projector':'standard'} resetViewKey={resetViewKey}/>
        <p className="capture-board-note" role="status">{activeFrame?<><strong>{activeFrame.title}：</strong>{activeFrame.explanation}</>:started?'演示进行中，棋盘已锁定，不能接受第二次落子。':'三角标记是要预测的目标棋；绿色加号是候选落点。'}</p>
      </div>

      <div className="capture-task-panel">
        <h2>选择你的落点</h2><p>{demo.puzzle.prompt}</p>
        <div className="recommended-row"><button type="button" disabled={started} onClick={()=>chooseCandidate(demo.recommended)}>使用建议点 {displayCoord(demo.recommended,size)}</button>{demo.illegalComparison&&<button type="button" disabled={started} onClick={()=>chooseCandidate(demo.illegalComparison!)}>先试自杀点 {displayCoord(demo.illegalComparison,size)}</button>}</div>
        <div className={`candidate-status${error?' error':trial?' ready':''}`} role="status"><strong>候选落点</strong><p>{error??(trial&&candidate?`${displayCoord(candidate,size)} 合法。现在预测哪些目标棋会被提。`:'点击棋盘空点，或使用上方建议点。')}</p></div>

        <fieldset disabled={!trial||started}><legend>预测被提的棋（你的判断）</legend><p>可选目标棋，也可明确选择“不会提子”。</p>
          <div className="prediction-targets">{targets.map(at=><label key={pointKey(at)}><input type="checkbox" checked={prediction.some(point=>same(point,at))} onChange={()=>toggleTarget(at)}/><span>{displayCoord(at,size)} 目标棋</span></label>)}</div>
          <label className="none-choice"><input type="radio" name={`none-${demo.id}`} checked={explicitNone} onChange={chooseNone}/><span>不会提子</span></label>
        </fieldset>
        <button type="button" className="capture-primary" disabled={!trial||started} onClick={begin}>验证我的预测并播放</button>
        {evaluation&&!evaluation.valid&&<p className="prediction-warning" role="alert">{evaluation.message}</p>}
        <label className="reduce-control"><input type="checkbox" checked={reducedMotion} onChange={event=>changeReduced(event.target.checked)}/><span><strong>减少动画</strong><small>跳到已验证的最终状态。</small></span></label>
        <button type="button" className="capture-reset" onClick={reset}>重置当前演示</button>
      </div>
    </section>

    {started&&trial&&<StepPlayer frames={frames} step={step} onStepChange={setStep} playing={playing} onPlayingChange={setPlaying} reducedMotion={reducedMotion} onComplete={complete}/>} 

    {finished&&evaluation&&<section className="capture-result" aria-labelledby="capture-result-title">
      <div><h2 id="capture-result-title">预测与实际</h2><p className={evaluation.correct?'correct':'needs-work'}>{evaluation.correct?'预测一致。':'可以对照后重试。'}</p></div>
      <dl><div><dt>实际被提（{trial!.event.captured.length} 颗）</dt><dd>{pointText(trial!.event.captured,size)}</dd></div><div><dt>漏选</dt><dd>{pointText(evaluation.missing,size)}</dd></div><div><dt>误选</dt><dd>{pointText(evaluation.extra,size)}</dd></div></dl>
      <div className="cause-note"><strong>因果说明</strong><p>{demo.teacherNote}</p></div>
      <button type="button" className="capture-undo" onClick={undoAttempt}>撤回到动画前并重试</button>
    </section>}

    {finished&&<section className="capture-followup"><div><h2>和伙伴讨论</h2><p>{demo.discussion}</p></div><div><a className="primary-link" href={CAPTURE_GAME_ROUTE}>开始双人吃子小游戏</a><a href={BOARD_LAB_ROUTE}>打开互动棋盘练习</a><small>两项活动当前都可直接打开。</small></div></section>}
  </div>;
}

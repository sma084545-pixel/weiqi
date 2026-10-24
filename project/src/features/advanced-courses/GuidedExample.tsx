import {useCallback,useMemo,useState} from 'react';
import {Board} from '../../components/Board';
import {GameTimeline} from '../../components/GameTimeline';
import {StepPlayer} from '../capture-lab/StepPlayer';
import {replayLine} from './model';
import type {CourseScene} from './types';
export function GuidedExample({scene,projector=false}:{scene:CourseScene;projector?:boolean}){
 const [lineIndex,setLineIndex]=useState(0);
 if(!scene.lines.length)return <p>此概念使用上下棋形对比，请在练习中先作判断再验证。</p>;
 return <div className="adv-guided"><label htmlFor={`line-${scene.id}`}>选择核查分支<select id={`line-${scene.id}`} value={lineIndex} onChange={e=>setLineIndex(Number(e.target.value))}>{scene.lines.map((line,i)=><option key={line.id} value={i}>{line.label}</option>)}</select></label><LinePlayer key={`${scene.id}:${lineIndex}`} scene={scene} index={lineIndex} projector={projector}/></div>;
}
function LinePlayer({scene,index,projector}:{scene:CourseScene;index:number;projector:boolean}){
 const line=scene.lines[index];
 const frames=useMemo(()=>replayLine(scene,line),[scene,line]);
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false);
 const [reduced,setReduced]=useState(()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false);
 const complete=useCallback(()=>setPlaying(false),[]);
 const state=frames.states[step];
 const title=step===0?'原始局面':`${step}. ${line.moves[step-1].color==='B'?'黑':'白'}方落子`;
 return <><p className="adv-small-note">这是已核查的演示线，可暂停回看；不写入你正在进行的对局。它说明指定条件，不是通用死活裁判。</p><Board size={state.size} board={state.board} label={`${scene.title}演示第${step}手`} mode="readonly" selected={null} onSelect={()=>{}} markers={[...scene.targets.filter(t=>state.board[t.at.row][t.at.col]!==null).map((t,i)=>({markerId:`target-${i}`,kind:'target' as const,at:t.at,label:t.label})),...(state.lastMove?.type==='place'?[{markerId:'demo-last',kind:'last-move' as const,at:state.lastMove.at,label:'本步骤最后一手'}]:[])]} zoom={.85} displayMode={projector?'projector':'standard'}/><p className="adv-step-explanation" aria-live="polite">{step===0?scene.prompt:line.notes[step-1]}{step>0&&` 本手提 ${frames.events[step-1].captured.length} 子。`}</p><label className="adv-reduce"><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/>减少动画（播放时直接到终点）</label><StepPlayer frames={frames.states.map((_,i)=>({id:String(i),title:i===0?'起点':`第${i}手`}))} step={step} onStepChange={setStep} playing={playing} onPlayingChange={setPlaying} reducedMotion={reduced} onComplete={complete} title="Guided Example · 逐步核查" description="观察落子、提子与最后的气；可随时停下。"/><GameTimeline max={frames.states.length-1} value={step} onChange={value=>{setPlaying(false);setStep(value);}} title={title} help="滑动只改变演示显示，不改变任何真实对局历史。" latestLabel="看演示终点"/>{step===line.moves.length&&<p className="adv-line-outcome">{line.outcome}</p>}</>;
}

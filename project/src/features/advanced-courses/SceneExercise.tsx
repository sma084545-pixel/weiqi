import {useMemo,useState} from 'react';
import {Board} from '../../components/Board';
import {boardFromPosition,displayCoord} from '../../core/coordinates';
import {getGroup,type BoardMarker} from '../../core/rules';
import type {Coord} from '../../core/content.generated';
import {judgeScene,replayResponse,responseBoard,samePoint,sceneState} from './model';
import type {CourseScene,SceneAttempt,SceneFeedback,SceneResponse} from './types';
import {GuidedExample} from './GuidedExample';

const titles={success:'正确 · 达到本题目标',suboptimal:'次优 · 可行，还可比较',failure:'有已核查的问题',unknown:'合法但未判断优劣',illegal:'非法动作',incomplete:'继续观察'};
export function SceneExercise({scene,attempt,onRecord,projector=false}:{scene:CourseScene;attempt?:SceneAttempt;onRecord:(a:SceneAttempt|undefined)=>void;projector?:boolean}){
 const [response,setResponse]=useState<SceneResponse|null>(attempt?.response??null);
 const [feedback,setFeedback]=useState<SceneFeedback|null>(()=>attempt?judgeScene(scene,attempt.response):null);
 const [hint,setHint]=useState(0),[showLine,setShowLine]=useState(false),[showLiberties,setShowLiberties]=useState(false),[zoom,setZoom]=useState(.85),[viewKey,setViewKey]=useState(0);
 const root=useMemo(()=>sceneState(scene),[scene]);
 const inputState=scene.interaction==='sequence'&&response?.kind==='sequence'?replayResponse(scene,response.moves):null;
 const preview=feedback&&!['illegal','incomplete'].includes(feedback.verdict)?responseBoard(scene,response):null;
 if(!root.ok)return <div className="adv-recovery" role="alert"><h3>本题起点无法验证</h3><p>请返回路线选择其他课程，现有对局没有被修改。</p><a href="#/route">返回学习路线</a></div>;
 const board=inputState?.ok?inputState.value.board:preview?.board??root.value.board;
 const selected=response&&(response.kind==='point'||response.kind==='group')?response.at:null;
 const selectedGroup=selected&&scene.interaction==='group'?getGroup(root.value.board,selected):null;
 const markers:BoardMarker[]=[
  ...scene.targets.map((t,i)=>({markerId:`target-${i}`,kind:'target' as const,at:t.at,label:t.label})),
  ...scene.choices.flatMap((c,i)=>c.at?[{markerId:`candidate-${i}`,kind:'candidate' as const,at:c.at,label:`候选 ${c.id} · ${c.label}`,text:String.fromCharCode(65+i)}]:[]),
  ...(response?.kind==='points'?response.points.map((at,i)=>({markerId:`chosen-${i}`,kind:'group' as const,at,label:'已选空点'})):[]),
  ...(selectedGroup?.ok&&selectedGroup.value?selectedGroup.value.stones.map((at,i)=>({markerId:`group-${i}`,kind:'group' as const,at,label:'已选整块'})):[]),
  ...(feedback?.highlight??[]).map((at,i)=>({markerId:`evidence-${i}`,kind:'liberty' as const,at,label:feedback?.missing?.some(p=>samePoint(p,at))?'漏选点':feedback?.extra?.some(p=>samePoint(p,at))?'误选点':'反馈指出的关键点'})),
 ];
 if(showLiberties&&feedback&&scene.libertyTargets){
  const [b,w]=scene.libertyTargets;const bSet=b?.expected??[],wSet=w?.expected??[];
  const all=[...bSet,...wSet.filter(p=>!bSet.some(q=>samePoint(p,q)))];
  markers.push(...all.map((at,i)=>{const both=bSet.some(p=>samePoint(p,at))&&wSet.some(p=>samePoint(p,at));const owner: 'B'|'W'|'neutral'=both?'neutral':bSet.some(p=>samePoint(p,at))?'B':'W';return {markerId:`lib-${i}`,kind:'liberty' as const,at,label:both?'公气':owner==='B'?'黑独有气':'白独有气',owner,text:both?'公':owner==='B'?'黑':'白'};}));
 }
 const choose=(at:Coord)=>{
  setShowLine(false);setShowLiberties(false);
  if(scene.interaction==='points'){
   if(root.value.board[at.row][at.col]!==null){setFeedback({verdict:'incomplete',message:'这是棋子，请圈空点。',detail:'气是正交相邻的空点，不包含棋子本身。'});return;}
   const points=response?.kind==='points'?response.points:[];setResponse({kind:'points',points:points.some(p=>samePoint(p,at))?points.filter(p=>!samePoint(p,at)):[...points,at]});setFeedback(null);return;
  }
  if(scene.interaction==='sequence'){
   const moves=response?.kind==='sequence'?response.moves:[];
   if(moves.length>=64){setFeedback({verdict:'incomplete',message:'本次试下已达64手，请重置或撤回。',detail:'这不是完整对弈，请在本题范围内比较。'});return;}
   const next={kind:'sequence' as const,moves:[...moves,at]},valid=replayResponse(scene,next.moves);
   if(!valid.ok){setFeedback(judgeScene(scene,next));return;}
   setResponse(next);setFeedback(null);return;
  }
  if(scene.interaction==='group'){const g=getGroup(root.value.board,at);if(!g.ok||!g.value){setFeedback({verdict:'incomplete',message:'请点一颗棋子来选整块。',detail:'空点不是棋块。'});return;}setResponse({kind:'group',at});}
  else setResponse({kind:'point',at});setFeedback(null);
 };
 const submit=()=>{
  const value=response??(scene.interaction==='points'?{kind:'points' as const,points:[]}:null);
  if(!value){setFeedback({verdict:'incomplete',message:'先作出自己的选择，再验证。',detail:'不用计时，也可以先看一层提示。'});return;}
  const result=judgeScene(scene,value);setFeedback(result);setShowLine(false);
  if(!['illegal','incomplete'].includes(result.verdict))onRecord({sceneRevision:scene.revision,response:value,verdict:result.verdict as SceneAttempt['verdict'],hintsUsed:hint});
 };
 const reset=()=>{setResponse(null);setFeedback(null);setHint(0);setShowLine(false);setShowLiberties(false);onRecord(undefined);};
 const selecting=scene.interaction==='point'||scene.interaction==='group'||scene.interaction==='points'||scene.interaction==='sequence';
 return <section className="adv-exercise" data-scene-id={scene.id}>
  <div className="adv-scene-top"><span>{scene.tier} · Level {scene.level}</span><small>{scene.id}</small></div>
  <h3>{scene.title}</h3><p className="adv-question">{scene.prompt}</p>
  <p className="adv-turn">先手：{root.value.toPlay==='B'?'黑方':'白方'}{scene.interaction==='sequence'&&` · 当前轮次：${inputState?.ok?inputState.value.toPlay==='B'?'黑方':'白方':root.value.toPlay==='B'?'黑方':'白方'} · 已落 ${response?.kind==='sequence'?response.moves.length:0} 手`}</p>
  <div className={scene.comparison?'adv-compare':'adv-task-layout'}>
   <div className="adv-board-panel"><h4>{scene.comparison?'A · 原棋形':'本题棋盘'}</h4><Board size={scene.position.size} board={board} label={`${scene.title}，${selecting?'可选择交叉点':'只读示例'}`} mode={selecting?'select':'readonly'} selected={selected} onSelect={choose} markers={markers} resetViewKey={viewKey} zoom={zoom} displayMode={projector?'projector':'standard'}/></div>
   {scene.comparison&&<div className="adv-board-panel"><h4>{scene.comparison.label} · {scene.comparison.position.toPlay==='B'?'黑先':'白先'}</h4><Board size={scene.comparison.position.size} board={boardFromPosition(scene.comparison.position)} label={scene.comparison.label} mode="readonly" selected={null} onSelect={()=>{}} resetViewKey={viewKey} zoom={zoom}/></div>}
   {!scene.comparison&&<div className="adv-task-copy">
    <p>{scene.interaction==='points'?'点击空点圈选，再点一次取消。':scene.interaction==='group'?'点击棋块中任意一颗，选中整个正交连通块。':scene.interaction==='sequence'?'按当前轮次依次落子，黑白两方都由你操作；对方回应也需要先预测。':scene.interaction==='point'?'点棋盘或下方候选，提交后才显示评价。':'先选择理由，再查看反馈。'}</p>
    {scene.targets.length>0&&<ul className="adv-target-list">{scene.targets.map((t,i)=><li key={i}>△ {t.label} · {displayCoord(t.at,scene.position.size)}</li>)}</ul>}
    <ul className="adv-conditions">{scene.conditions.map((s,i)=><li key={i}>{s}</li>)}</ul>
   </div>}
  </div>
  <div className="adv-view-controls"><button type="button" disabled={zoom>=1.5} onClick={()=>setZoom(z=>Math.min(1.5,z+.25))}>放大棋盘</button><button type="button" disabled={zoom<=.75} onClick={()=>setZoom(z=>Math.max(.75,z-.25))}>缩小棋盘</button><button type="button" onClick={()=>{setZoom(.85);setViewKey(k=>k+1);}}>复位视图</button><span>完整{scene.position.size}路；放大后只在棋盘内滑动。</span></div>
  {scene.comparison&&<ul className="adv-conditions">{scene.conditions.map((s,i)=><li key={i}>{s}</li>)}</ul>}
  {scene.choices.length>0&&<fieldset className="adv-options"><legend>{scene.interaction==='group'?'也可用文字选择棋块':'你的选择'}</legend>{scene.choices.map((c,i)=><label key={c.id} className={(response?.kind==='choice'&&response.id===c.id)||((response?.kind==='point'||response?.kind==='group')&&c.at&&samePoint(response.at,c.at))?'chosen':''}><input type="radio" name={scene.id} checked={(response?.kind==='choice'&&response.id===c.id)||((response?.kind==='point'||response?.kind==='group')&&!!c.at&&samePoint(response.at,c.at))||false} onChange={()=>{setResponse(c.at&&scene.interaction==='point'?{kind:'point',at:c.at}:c.at&&scene.interaction==='group'?{kind:'group',at:c.at}:{kind:'choice',id:c.id});setFeedback(null);setShowLine(false);setShowLiberties(false);}}/><span>{c.at&&<b className="adv-letter">{String.fromCharCode(65+i)}</b>}{c.label}{c.at&&<small>{displayCoord(c.at,scene.position.size)}</small>}</span></label>)}</fieldset>}
  {response?.kind==='points'&&<p role="status">已选 {response.points.length} 个空点（这是你的选择数，不是标准答案）。</p>}
  <div className="adv-actions"><button type="button" className="primary-action" onClick={submit}>验证本题</button>{scene.interaction==='sequence'&&<button type="button" disabled={response?.kind!=='sequence'||!response.moves.length} onClick={()=>{if(response?.kind==='sequence')setResponse({...response,moves:response.moves.slice(0,-1)});setFeedback(null);setShowLine(false);}}>撤回这一手</button>}<button type="button" onClick={reset}>隐藏答案并重试</button></div>
  <section className="adv-hints" aria-label="分层提示"><button type="button" aria-expanded={hint>0} onClick={()=>setHint(Math.min(3,hint+1))} disabled={hint===3}>{hint===0?'提示 1：观察什么':hint===1?'提示 2：考虑关系':hint===2?'提示 3：关键步骤':'三层提示已展开'}</button>{hint>0&&<button type="button" onClick={()=>setHint(0)}>隐藏提示</button>}{hint>0&&<ol>{scene.hints.slice(0,hint).map((h,i)=><li key={i}>{h}</li>)}</ol>}</section>
  {feedback&&<div className={`adv-feedback verdict-${feedback.verdict}`} role="status" data-verdict={feedback.verdict}><h4>{titles[feedback.verdict]}</h4><strong>{feedback.message}</strong><p>{feedback.detail}</p>{feedback.verdict==='unknown'&&<p>此选择不计作错误，也不产生公开分数；可先与同伴讨论，或到自由实验棋盘继续探索。</p>}{!['incomplete','illegal'].includes(feedback.verdict)&&scene.libertyTargets&&<button type="button" onClick={()=>setShowLiberties(!showLiberties)}>{showLiberties?'隐藏气的核对图':'核对气：黑独有／白独有／公气'}</button>}{!['incomplete','illegal'].includes(feedback.verdict)&&scene.lines.length>0&&<button type="button" onClick={()=>setShowLine(!showLine)}>{showLine?'收起核查变化':'查看已核查变化与反驳'}</button>}</div>}
  {showLine&&<GuidedExample scene={scene} projector={projector}/>}
 </section>;
}

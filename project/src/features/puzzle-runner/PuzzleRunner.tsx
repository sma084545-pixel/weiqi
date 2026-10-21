import {useEffect,useMemo,useRef,useState} from 'react';
import {Board} from '../../components/Board';
import {GameTimeline,useGameHistory} from '../../components/GameTimeline';
import type {BoardMarker} from '../../components/board.types';
import type {Coord,GameState,Ownership,Puzzle,Response} from '../../core/content.generated';
import {applyPass,RULE_ERROR_ZH,tryMove,undo} from '../../core/rules';
import {AVAILABLE_PUZZLES,learnerConditions,positionBoard,PUZZLE_CATALOG,PUZZLE_CATEGORIES,PUZZLE_DIFFICULTIES,type CatalogItem} from './catalog';
import {applyAuthoredReply,gradeStaticAnswer,gradeTreeMove,initialPuzzleState,type GradeResult,type PuzzleVerdict} from './grading';
import {createPuzzleProgressStore,currentAttempt,emptyPuzzleProgress,recordPuzzleAttempt,type PuzzleProgress} from './progress';
import {publishedDraftItems} from '../teacher-editor/storage';
import {browserStoragePort} from '../../core/unified-persistence';
import './PuzzleRunner.css';

const key=(point:Coord)=>`${point.row},${point.col}`;
const COLOR_LABEL={B:'黑方',W:'白方'} as const;
const HINT_LABELS=['观察什么','考虑关系','展示关键步骤'] as const;
const VERDICT_LABEL:Record<PuzzleVerdict,string>={success:'已达到标准',failure:'已验证未达到',illegal:'本手不合法',unknown:'目前未能判断',discussion:'开放讨论',invalid:'请补充回答',continue:'继续变化'};

function targetMarkers(puzzle:Puzzle):BoardMarker[]{
  return puzzle.targetMarkers.flatMap(marker=>marker.points.map((at,index)=>({markerId:`${marker.markerId}-${index}`,kind:'target' as const,at,label:marker.label})));
}
function selectedMarkers(points:Coord[]):BoardMarker[]{return points.map((at,index)=>({markerId:`selected-${index}`,kind:'candidate',at,label:'已选择'}));}
function ownershipMarkers(labels:Ownership[]):BoardMarker[]{return labels.map((item,index)=>item.owner==='unknown'?{markerId:`owner-${index}`,kind:'candidate',at:item.at,label:'标为未知'}:{markerId:`owner-${index}`,kind:'ownership',at:item.at,owner:item.owner,label:item.owner==='B'?'标为黑方':item.owner==='W'?'标为白方':'标为中立'});}

function useReducedMotion(){
  const [reduced,setReduced]=useState(()=>typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{if(typeof matchMedia==='undefined')return;const query=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setReduced(query.matches);query.addEventListener?.('change',change);return()=>query.removeEventListener?.('change',change);},[]);
  return reduced;
}

function Feedback({result}:{result:GradeResult|null}){
  if(!result)return <div className="puzzle-feedback neutral" role="status"><span aria-hidden="true">i</span><div><strong>准备好后再提交</strong><p>可以自由重试；这里没有计时或公开排名。</p></div></div>;
  const icon=result.verdict==='success'?'✓':result.verdict==='failure'||result.verdict==='illegal'?'!':result.verdict==='unknown'?'?':'i';
  return <div className={`puzzle-feedback verdict-${result.verdict}`} role="status" aria-live="polite"><span aria-hidden="true">{icon}</span><div><strong>{VERDICT_LABEL[result.verdict]}</strong><p>{result.message}</p>{result.detail&&<p className="feedback-detail">{result.detail}</p>}</div></div>;
}

function HintPanel({puzzle,open,onToggle,onRetry}:{puzzle:Puzzle;open:Set<number>;onToggle:(index:number)=>void;onRetry:()=>void}){
  return <section className="hint-panel" aria-labelledby="hint-title"><div className="panel-heading"><div><p className="eyebrow">按需查看</p><h2 id="hint-title">分层提示</h2></div>{open.size>0&&<button type="button" className="text-button" onClick={onRetry}>隐藏提示并重试</button>}</div><ol>{puzzle.hints.map((hint,index)=><li key={HINT_LABELS[index]} className={open.has(index)?'open':''}><span>{index+1}</span><div><strong>{HINT_LABELS[index]}</strong>{open.has(index)&&<p>{hint}</p>}</div><button type="button" aria-expanded={open.has(index)} onClick={()=>onToggle(index)}>{open.has(index)?'隐藏':'显示提示'}</button></li>)}</ol></section>;
}

function FreePlay({puzzle,start,onReturn}:{puzzle:Puzzle;start:GameState;onReturn:()=>void}){
  const [state,setState]=useState(start);const [message,setMessage]=useState('自由试下不会改变本题判定记录。');
  const history=useGameHistory(state);
  const play=(at:Coord)=>{if(history.viewingHistory)return;const result=tryMove(state,{type:'place',color:state.toPlay,at});if(!result.ok){setMessage(RULE_ERROR_ZH[result.error.code]);return;}setState(result.value.nextState);setMessage('已按规则落子；此处不判断题目对错。');};
  const pass=()=>{if(history.viewingHistory)return;const result=applyPass(state,state.toPlay);if(!result.ok){setMessage(RULE_ERROR_ZH[result.error.code]);return;}setState(result.value.nextState);setMessage('已停一手；自由试下仍不参与判题。');};
  const back=()=>{if(history.viewingHistory)return;const result=undo(state);if(!result.ok){setMessage('当前没有可撤回的试下。');return;}setState(result.value);setMessage('已撤回自由试下中的一步。');};
  return <section className="free-play" data-testid="free-play"><div className="puzzle-topline"><button type="button" className="back-link" onClick={onReturn}>← 返回原题</button><span className="mode-pill">自由试下 · 暂不判题</span></div><h1>{puzzle.id} 自由试下</h1><p>{message}</p><div className="free-grid"><div><Board size={state.size} board={history.frame?.board??state.board} label={`${puzzle.id}自由试下棋盘`} mode={history.viewingHistory?'readonly':'play'} disabled={history.viewingHistory} selected={null} onSelect={()=>{}} onPlay={play} markers={[...targetMarkers(puzzle),...(history.frame?.markers??[])]} showCoordinates/>{history.frame&&<GameTimeline max={history.max} value={history.index} onChange={history.goTo} title={history.frame.title} description={history.frame.description}/>}</div><div className="free-controls"><strong>{history.viewingHistory?'回看时下一手':'当前'}：{COLOR_LABEL[history.frame?.toPlay??state.toPlay]}</strong><button type="button" disabled={history.viewingHistory} onClick={pass}>停一手</button><button type="button" disabled={history.viewingHistory||!state.undoStack.length} onClick={back}>回退一步</button><button type="button" onClick={onReturn}>结束试下，返回题目</button></div></div></section>;
}

type PlayerProps={item:CatalogItem;index:number;total:number;attempt?:ReturnType<typeof currentAttempt>;onAttempt:(verdict:PuzzleVerdict,hints:number[])=>void;onList:()=>void;onNext:()=>void};
function PuzzlePlayer({item,index,total,attempt,onAttempt,onList,onNext}:PlayerProps){
  const {puzzle}=item,reduced=useReducedMotion();
  const start=useMemo(()=>initialPuzzleState(puzzle),[puzzle]);
  const [treeState,setTreeState]=useState<GameState|null>(start.ok?start.value:null);
  const history=useGameHistory(treeState);
  const [nodeId,setNodeId]=useState(puzzle.answer.type==='move-tree'?puzzle.answer.rootNodeId:'');
  const [frames,setFrames]=useState<{state:GameState;nodeId:string;feedback:GradeResult|null}[]>([]);
  const [feedback,setFeedback]=useState<GradeResult|null>(start.ok?null:{verdict:'invalid',message:'题目起点未通过规则验证，暂不能落子。'});
  const [hints,setHints]=useState(new Set<number>());
  const [numberValue,setNumberValue]=useState('');
  const [points,setPoints]=useState<Coord[]>([]);
  const [labels,setLabels]=useState<Ownership[]>([]);
  const [owner,setOwner]=useState<Ownership['owner']>('B');
  const [options,setOptions]=useState<string[]>([]);
  const [text,setText]=useState('');
  const [pending,setPending]=useState(false);
  const [freePlay,setFreePlay]=useState(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const clearPending=()=>{if(timer.current!==null)clearTimeout(timer.current);timer.current=null;setPending(false);};
  useEffect(()=>()=>{if(timer.current!==null)clearTimeout(timer.current);},[]);
  const board=treeState?.board??positionBoard(puzzle);
  const staticBoard=positionBoard(puzzle);
  const occupied=puzzle.initialPosition.stones.map(({row,col})=>({row,col}));
  const baseMarkers=targetMarkers(puzzle);

  const reset=()=>{clearPending();setFeedback(start.ok?null:{verdict:'invalid',message:'题目起点未通过规则验证，暂不能落子。'});setTreeState(start.ok?start.value:null);setNodeId(puzzle.answer.type==='move-tree'?puzzle.answer.rootNodeId:'');setFrames([]);setNumberValue('');setPoints([]);setLabels([]);setOptions([]);setText('');};
  const retry=()=>{setHints(new Set());reset();};
  const toggleHint=(hint:number)=>setHints(previous=>{const next=new Set(previous);if(next.has(hint))next.delete(hint);else next.add(hint);return next;});
  const finish=(result:GradeResult)=>{setFeedback(result);onAttempt(result.verdict,[...hints]);};

  const submitStatic=()=>{
    let response:Response;
    if(puzzle.answer.type==='number')response={type:'number',value:Number(numberValue)};
    else if(puzzle.answer.type==='point-set')response={type:'point-set',points};
    else if(puzzle.answer.type==='region-labels')response={type:'region-labels',labels};
    else if(puzzle.answer.type==='reason-choice')response={type:'reason-choice',optionIds:options};
    else if(puzzle.answer.type==='open-text')response={type:'open-text',text};
    else return;
    if(puzzle.answer.type==='number'&&numberValue.trim()===''){finish({verdict:'invalid',message:'请先填写一个整数。'});return;}
    finish(gradeStaticAnswer(puzzle,response));
  };

  const playTree=(at:Coord)=>{
    if(!treeState||history.viewingHistory||pending||feedback?.verdict==='success'||feedback?.verdict==='failure')return;
    const before={state:treeState,nodeId,feedback};const result=gradeTreeMove(puzzle,treeState,nodeId,at);
    if(result.verdict==='illegal'){finish(result);return;}
    if(!result.state){finish(result);return;}
    setFrames(previous=>[...previous,before]);setTreeState(result.state);setNodeId(result.node?.nodeId??nodeId);setFeedback(result);
    if(result.reply&&result.replyNode){
      setPending(true);const stateAfter=result.state,reply=result.reply,replyNode=result.replyNode;
      timer.current=setTimeout(()=>{const replyResult=applyAuthoredReply(stateAfter,reply);timer.current=null;setPending(false);if(!replyResult.state){finish(replyResult);return;}setFrames(previous=>[...previous,{state:stateAfter,nodeId:result.node?.nodeId??nodeId,feedback:result}]);setTreeState(replyResult.state);setNodeId(replyNode.nodeId);const final:GradeResult={verdict:replyNode.outcome,message:replyNode.outcome==='failure'?'题目中的合法反驳已经走出。':replyNode.outcome==='success'?'这条变化达到本题标准。':'对方已回应，请继续找下一手。',detail:replyNode.explanation,state:replyResult.state,node:replyNode};setFeedback(final);if(final.verdict!=='continue')onAttempt(final.verdict,[...hints]);},reduced?0:500);
    }else onAttempt(result.verdict,[...hints]);
  };

  const back=()=>{clearPending();const previous=frames.at(-1);if(!previous){setFeedback({verdict:'invalid',message:'当前没有可回退的题内着法。'});return;}setTreeState(previous.state);setNodeId(previous.nodeId);setFeedback(previous.feedback);setFrames(values=>values.slice(0,-1));};
  const togglePoint=(at:Coord)=>setPoints(previous=>previous.some(point=>key(point)===key(at))?previous.filter(point=>key(point)!==key(at)):[...previous,at]);
  const markOwner=(at:Coord)=>setLabels(previous=>{const existing=previous.find(item=>key(item.at)===key(at));if(existing?.owner===owner)return previous.filter(item=>key(item.at)!==key(at));return [...previous.filter(item=>key(item.at)!==key(at)),{at,owner}];});

  if(freePlay&&treeState)return <FreePlay puzzle={puzzle} start={feedback?.verdict==='unknown'?treeState:(start.ok?start.value:treeState)} onReturn={()=>setFreePlay(false)}/>;
  const markers=[...baseMarkers,...(puzzle.answer.type==='point-set'?selectedMarkers(points):puzzle.answer.type==='region-labels'?ownershipMarkers(labels):[])];
  const mode=puzzle.answer.type==='move-tree'?'play':puzzle.answer.type==='point-set'?'select':puzzle.answer.type==='region-labels'?'mark':'readonly';
  const currentBoard=puzzle.answer.type==='move-tree'?(history.frame?.board??board):staticBoard;
  const unavailable=puzzle.answer.type==='point-set'||puzzle.answer.type==='region-labels'?occupied:[];

  return <article className="puzzle-player" data-testid="puzzle-player"><div className="puzzle-topline"><button type="button" className="back-link" onClick={()=>{clearPending();onList();}}>← 返回题目列表</button><span className="progress-note">题目 {index+1} / {total}</span></div><header className="puzzle-heading"><div><p className="eyebrow">{PUZZLE_CATEGORIES[puzzle.category]} · {PUZZLE_DIFFICULTIES[puzzle.difficulty.level]}</p><h1>{item.title}</h1><p className="puzzle-id">{puzzle.id} · 修订 {puzzle.revision}</p></div>{attempt?.completed&&<span className="own-mark">本设备已完成</span>}</header><p className="puzzle-prompt">{puzzle.prompt}</p><dl className="puzzle-facts"><div><dt>先手</dt><dd>{COLOR_LABEL[puzzle.firstPlayer]}</dd></div><div><dt>目标</dt><dd>{puzzle.targetMarkers.map(marker=>marker.label).join('；')}</dd></div><div><dt>边界</dt><dd>完整 {puzzle.initialPosition.size}×{puzzle.initialPosition.size} 棋盘</dd></div></dl><details className="conditions"><summary>查看本题必要条件</summary><ul>{learnerConditions(puzzle).map((text,index)=><li key={index}>{text}</li>)}</ul></details><div className="player-grid"><section className="puzzle-board-panel" aria-labelledby="board-title"><div className="panel-heading"><div><p className="eyebrow">题目棋形</p><h2 id="board-title">{puzzle.initialPosition.size} 路完整棋盘</h2></div>{pending&&<span className="pending-reply" role="status">正在播放题目回应…</span>}</div><Board size={puzzle.initialPosition.size} board={currentBoard} label={`${puzzle.id}题目棋盘`} mode={history.viewingHistory?'readonly':mode} disabled={pending||history.viewingHistory} selected={null} onSelect={puzzle.answer.type==='point-set'?togglePoint:puzzle.answer.type==='region-labels'?markOwner:()=>{}} onPlay={playTree} markers={[...markers,...(puzzle.answer.type==='move-tree'?history.frame?.markers??[]:[])]} unavailablePoints={unavailable} showCoordinates/>{puzzle.answer.type==='move-tree'&&history.frame&&<GameTimeline max={history.max} value={history.index} onChange={history.goTo} title={history.frame.title} description={history.frame.description} disabled={pending} help={pending?'正在播放已核查回应；完成后可回看。':'拖动回看已走出的变化，不判新答案。返回当前局面后继续；“回退一步”可真正撤回题内着法。'}/>}<div className="stone-legend"><span><i className="legend-stone black"/>黑子</span><span><i className="legend-stone white"/>白子</span><span><i className="legend-target">△</i>目标棋块</span></div></section><aside className="answer-panel" aria-labelledby="answer-title"><div className="panel-heading"><div><p className="eyebrow">你的回答</p><h2 id="answer-title">{puzzle.answer.type==='move-tree'?'在棋盘上选择下一手':'按题目要求作答'}</h2></div></div>{puzzle.answer.type==='number'&&<label className="number-answer"><span>填写整数</span><input data-testid="number-answer" inputMode="numeric" type="number" min="0" step="1" value={numberValue} onChange={event=>setNumberValue(event.target.value)}/></label>}{puzzle.answer.type==='point-set'&&<p className="selection-help">点击或用键盘选择空点；再次选择可取消。当前已选 <strong>{points.length}</strong> 点。</p>}{puzzle.answer.type==='region-labels'&&<fieldset className="owner-picker"><legend>先选择标记，再点空点</legend>{(['B','W','neutral','unknown'] as const).map(value=><label key={value}><input type="radio" name="owner" value={value} checked={owner===value} onChange={()=>setOwner(value)}/><span>{value==='B'?'黑方':value==='W'?'白方':value==='neutral'?'中立':'未知'}</span></label>)}</fieldset>}{puzzle.answer.type==='reason-choice'&&<fieldset className="reason-options"><legend>可选择一项或多项</legend>{puzzle.answer.options.map(option=><label key={option.optionId}><input type="checkbox" checked={options.includes(option.optionId)} onChange={()=>setOptions(previous=>previous.includes(option.optionId)?previous.filter(id=>id!==option.optionId):[...previous,option.optionId])}/><span>{option.text}</span></label>)}</fieldset>}{puzzle.answer.type==='open-text'&&<label className="open-answer"><span>写下选择、依据与一个可能回应</span><textarea value={text} maxLength={20000} rows={7} onChange={event=>setText(event.target.value)}/><small>{text.length} / 20,000</small></label>}{puzzle.answer.type==='move-tree'&&<p className="selection-help">当前轮到 <strong>{history.frame?COLOR_LABEL[history.frame.toPlay]:treeState?COLOR_LABEL[treeState.toPlay]:'—'}</strong>。只对题库已核查分支作确定判断。</p>}<div className="answer-actions">{puzzle.answer.type!=='move-tree'&&<button type="button" className="primary-button" onClick={submitStatic}>提交回答</button>}{puzzle.answer.type==='move-tree'&&<button type="button" className="outline-button" disabled={history.viewingHistory||(!frames.length&&!pending)} onClick={back}>回退一步</button>}<button type="button" className="outline-button" onClick={reset}>重置本题</button><button type="button" className="quiet-button" disabled={!treeState||pending||history.viewingHistory} onClick={()=>{clearPending();setFreePlay(true);}}>自由试下</button></div>{history.viewingHistory?<p className="selection-help">只读回看，不新增作答记录。返回当前局面后继续。</p>:<Feedback result={feedback}/>}</aside></div><HintPanel puzzle={puzzle} open={hints} onToggle={toggleHint} onRetry={retry}/><nav className="puzzle-footer-nav" aria-label="题目导航"><button type="button" className="outline-button" onClick={onList}>返回列表</button><button type="button" className="primary-button" onClick={onNext}>下一题 →</button></nav></article>;
}

export function PuzzleRunner({catalog,initialSelectedId=null}:{catalog?:CatalogItem[];initialSelectedId?:string|null}){
  const resolvedCatalog=useMemo(()=>{
    if(catalog)return catalog;
    const latestLocal=new Map<string,CatalogItem>();
    for(const item of publishedDraftItems(browserStoragePort())){
      const previous=latestLocal.get(item.puzzle.id);
      if(!previous||previous.puzzle.revision<item.puzzle.revision)latestLocal.set(item.puzzle.id,item);
    }
    return [...PUZZLE_CATALOG.filter(item=>!latestLocal.has(item.puzzle.id)),...latestLocal.values()];
  },[catalog]);
  const available=resolvedCatalog.filter(item=>item.status==='available');
  const [category,setCategory]=useState<'all'|keyof typeof PUZZLE_CATEGORIES>('all');
  const [difficulty,setDifficulty]=useState<'all'|keyof typeof PUZZLE_DIFFICULTIES>('all');
  const [selectedId,setSelectedId]=useState<string|null>(initialSelectedId);
  const store=useMemo(()=>createPuzzleProgressStore(browserStoragePort()),[]);
  const loaded=useMemo(()=>store.load(),[store]);
  const [progress,setProgress]=useState<PuzzleProgress>(loaded.ok?loaded.value:loaded.fallback);
  const [storageMessage,setStorageMessage]=useState(loaded.ok?'':loaded.message);
  const filtered=available.filter(item=>(category==='all'||item.puzzle.category===category)&&(difficulty==='all'||item.puzzle.difficulty.level===difficulty));
  const selectedIndex=available.findIndex(item=>item.puzzle.id===selectedId),selected=selectedIndex>=0?available[selectedIndex]:null;
  const saveAttempt=(verdict:PuzzleVerdict,hints:number[])=>{if(!selected)return;setProgress(previous=>{const next=recordPuzzleAttempt(previous,selected.puzzle.id,selected.puzzle.revision,verdict,hints);const result=store.save(next);if(!result.ok)setStorageMessage(result.message);return next;});};
  if(selected)return <PuzzlePlayer key={`${selected.puzzle.id}@${selected.puzzle.revision}`} item={selected} index={selectedIndex} total={available.length} attempt={currentAttempt(progress,selected.puzzle.id,selected.puzzle.revision)} onAttempt={saveAttempt} onList={()=>setSelectedId(null)} onNext={()=>setSelectedId(available[(selectedIndex+1)%available.length]?.puzzle.id??null)}/>;
  const localCount=available.filter(item=>item.message==='当前设备发布的题目').length;
  return <section className="puzzle-catalog" data-testid="puzzle-catalog"><div className="catalog-intro"><div><p><a href="#/home">← 返回学习入口</a></p><p className="eyebrow">自选挑战</p><h1>互动挑战题</h1><p>按自己的兴趣选择题目。没有倒计时、公开排行榜或强制通关；合法但答案树未覆盖的着法也不会被记作错误。</p>{localCount>0&&<p className="local-content-note">另含当前设备发布的 {localCount} 道本机题；它们不属于随项目提供的正式 30 题。</p>}</div><div className="catalog-count" aria-label={`当前共有${available.length}道${localCount?'含本机内容的':'正式'}可用题`}><strong>{available.length}</strong><span>{localCount?'道题可用':'道正式题可用'}</span></div></div>{storageMessage&&<div className="catalog-warning" role="status">{storageMessage}<button type="button" onClick={()=>setStorageMessage('')}>知道了</button></div>}<div className="catalog-layout"><aside className="catalog-filters"><fieldset><legend>按类别筛选</legend><button type="button" aria-pressed={category==='all'} onClick={()=>setCategory('all')}>全部类别 <span>{available.length}</span></button>{Object.entries(PUZZLE_CATEGORIES).map(([id,label])=><button type="button" key={id} aria-pressed={category===id} onClick={()=>setCategory(id as keyof typeof PUZZLE_CATEGORIES)}>{label}<span>{available.filter(item=>item.puzzle.category===id).length}</span></button>)}</fieldset><fieldset><legend>按难度筛选</legend><button type="button" aria-pressed={difficulty==='all'} onClick={()=>setDifficulty('all')}>全部难度</button>{Object.entries(PUZZLE_DIFFICULTIES).map(([id,label])=><button type="button" key={id} aria-pressed={difficulty===id} onClick={()=>setDifficulty(id as keyof typeof PUZZLE_DIFFICULTIES)}>{label}</button>)}</fieldset><p>难度是文字提示，只用于选题，不判断个人棋力。</p></aside><div className="catalog-results"><div className="results-heading"><h2>{category==='all'?'全部类别':PUZZLE_CATEGORIES[category]} · {difficulty==='all'?'全部难度':PUZZLE_DIFFICULTIES[difficulty]}</h2><span>{filtered.length} 道</span></div>{filtered.length?<div className="puzzle-cards">{filtered.map(item=>{const attempt=currentAttempt(progress,item.puzzle.id,item.puzzle.revision);return <article key={`${item.puzzle.id}@${item.puzzle.revision}`} className="puzzle-card"><div className="card-meta"><span>{PUZZLE_CATEGORIES[item.puzzle.category]}</span><span>{PUZZLE_DIFFICULTIES[item.puzzle.difficulty.level]}</span>{item.message==='当前设备发布的题目'&&<span>本机发布</span>}{attempt?.completed&&<span className="complete-chip">本设备已完成</span>}</div><h3>{item.title}</h3><p>{item.puzzle.prompt}</p><dl><div><dt>ID</dt><dd>{item.puzzle.id}</dd></div><div><dt>先手</dt><dd>{COLOR_LABEL[item.puzzle.firstPlayer]}</dd></div><div><dt>棋盘</dt><dd>{item.puzzle.initialPosition.size} 路</dd></div></dl><button type="button" className="primary-button" onClick={()=>setSelectedId(item.puzzle.id)}>{attempt?'再次作答':'开始作答'} →</button></article>;})}</div>:<div className="empty-results"><h2>没有符合筛选条件的题目</h2><p>可调整类别或难度；题库内容没有被删除。</p><button type="button" className="outline-button" onClick={()=>{setCategory('all');setDifficulty('all');}}>清除筛选</button></div>}{resolvedCatalog.filter(item=>item.status!=='available').map(item=><div key={item.puzzle.id} className="content-recovery" role="status"><strong>{item.title}</strong><span>{item.message}</span><button type="button" onClick={()=>{setCategory('all');setDifficulty('all');}}>返回可用题目</button></div>)}</div></div></section>;
}

export {AVAILABLE_PUZZLES};

import {useMemo,useRef,useState} from 'react';
import {Board} from '../../components/Board';
import {GameTimeline,useGameHistory} from '../../components/GameTimeline';
import type {BoardMarker} from '../../components/board.types';
import {BOARD_SIZES} from '../../core/constants';
import type {Color,Coord,GameState,Size,StoneValue} from '../../core/content.generated';
import {displayCoord} from '../../core/coordinates';
import {browserContentStore} from '../../core/persistence';
import {RULE_ERROR_ZH,rulesEngine} from '../../core/rules';
import {ROUTE_ROUTE} from '../learning-hub/registry';
import {diagnoseSetup} from './diagnostics';
import {enterRules,returnToSetup,rulePass,rulePlace,ruleRedo,ruleResume,ruleUndo,setupSession,type ExperimentSession,type PracticeMode,type RulesSession} from './machine';
import {applyPointTool,clearSetup,createSetupEditor,redoEdit,resizeLoss,resizeSetup,setSetupTurn,undoEdit,type SetupEditor,type SetupTool} from './model';
import {bundleFromEditor,bundleJson,positionJson,restoreExperiment,T06_WORKSPACE_ID} from './storage';
import './ExperimentBoard.css';

const TOOLS:{id:SetupTool;label:string;note:string}[]=[
  {id:'place-B',label:'放黑',note:'直接放黑棋，不自动提子'},
  {id:'place-W',label:'放白',note:'直接放白棋，不自动提子'},
  {id:'erase',label:'擦除',note:'移除该点棋子和标记'},
  {id:'select-group',label:'选择棋块',note:'查看同色正交连通块'},
  {id:'target-marker',label:'目标标记',note:'添加或取消三角目标'},
  {id:'sequence-marker',label:'数字标记',note:'写入当前数字'},
];
const colorName=(color:Color)=>color==='B'?'黑方':'白方';
const ruleBoard=(session:RulesSession)=>session.game.board as StoneValue[][];
const errorText=(code:string)=>code==='CONFIRM_FRESH_START'?'请先确认将当前盘面建立为未知过去的新起点。':code==='INVALID_KOMI'?'贴目须为有限数字。':RULE_ERROR_ZH[code as keyof typeof RULE_ERROR_ZH]??'操作未完成，请检查当前状态。';

function selectedShape(board:readonly (readonly StoneValue[])[],at:Coord|null){
  if(!at)return {group:[] as Coord[],liberties:[] as Coord[]};
  const group=rulesEngine.getGroup(board,at);const liberties=rulesEngine.getLiberties(board,at);
  return {group:group.ok&&group.value?group.value.stones:[],liberties:liberties.ok?liberties.value:[]};
}
function download(text:string,name:string){const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();URL.revokeObjectURL(url);}

export function ExperimentBoard({projector=false}:{projector?:boolean}){
  const [session,setSession]=useState<ExperimentSession>(()=>setupSession(createSetupEditor()));
  const [tool,setTool]=useState<SetupTool>('place-B');
  const [selected,setSelected]=useState<Coord|null>(null);
  const [showLiberties,setShowLiberties]=useState(false);
  const [sequenceNumber,setSequenceNumber]=useState(1);
  const [pendingSize,setPendingSize]=useState<Size|null>(null);
  const [confirmClear,setConfirmClear]=useState(false);
  const [nextPlayer,setNextPlayer]=useState<Color>('B');
  const [komiText,setKomiText]=useState('0');
  const [practiceMode,setPracticeMode]=useState<PracticeMode>('full-game');
  const [confirmedFresh,setConfirmedFresh]=useState(false);
  const [ruleTool,setRuleTool]=useState<'play'|'inspect'>('play');
  const [message,setMessage]=useState(session.message);
  const [resetViewKey,setResetViewKey]=useState(0);
  const entryRef=useRef<HTMLFieldSetElement>(null);
  const editor=session.mode==='setup'?session.editor:session.sourceEditor;
  const history=useGameHistory(session.mode==='rules'?session.game:null);
  const board=session.mode==='setup'?editor.current.board:history.frame?.board??ruleBoard(session);
  const size=(session.mode==='setup'?editor.current.size:session.game.size) as Size;
  const shape=useMemo(()=>selectedShape(board,selected),[board,selected]);
  const diagnosis=useMemo(()=>diagnoseSetup(editor.current),[editor.current]);
  const store=useMemo(()=>browserContentStore(),[]);

  const markers=useMemo<BoardMarker[]>(()=>{
    const base=editor.current.markers.map(marker=>({markerId:marker.markerId,kind:marker.kind,at:marker.at,number:marker.number,label:marker.kind==='target'?'教学目标':'数字顺序'} satisfies BoardMarker));
    const group=shape.group.map((at,index)=>({markerId:`selected-group-${index}`,kind:'group' as const,at,label:'当前选择的棋块'}));
    const liberties=showLiberties?shape.liberties.map((at,index)=>({markerId:`selected-liberty-${index}`,kind:'liberty' as const,at,label:'当前棋块的气'})):[];
    const invalid=diagnosis.ok?[]:diagnosis.points.map((at,index)=>({markerId:`invalid-${index}`,kind:'target' as const,at,label:'无气棋块，不能作为规则起点'}));
    const last=session.mode==='rules'?history.frame?.markers??[]:[];
    return [...base,...group,...liberties,...invalid,...last];
  },[diagnosis,editor.current.markers,session,shape,showLiberties,history.frame]);

  const updateEditor=(next:SetupEditor,text:string)=>{setSession(setupSession(next,text));setMessage(text);setSelected(null);};
  const setupSelect=(at:Coord)=>{
    if(session.mode!=='setup')return;
    setSelected(at);
    if(tool==='select-group'){
      const found=selectedShape(session.editor.current.board,at);
      setMessage(found.group.length?`已选择 ${found.group.length} 颗相连棋；${showLiberties?`共有 ${found.liberties.length} 口气。`:'气仍隐藏，可先猜再显示。'}`:'这里是空点，没有可选择的棋块。');return;
    }
    const next=applyPointTool(session.editor,tool,at,sequenceNumber);
    updateEditor(next,next===session.editor?'该点没有发生变化。':`${TOOLS.find(item=>item.id===tool)!.label}已应用在 ${displayCoord(at,size)}；这仍是摆棋示意。`);
  };
  const requestSize=(value:Size)=>{if(session.mode==='setup'&&value!==size)setPendingSize(value);};
  const confirmSize=()=>{if(session.mode!=='setup'||pendingSize===null)return;const loss=resizeLoss(session.editor.current,pendingSize);updateEditor(resizeSetup(session.editor,pendingSize),`已切换为完整 ${pendingSize} 路；按左上 row/col 保留，裁切 ${loss.stones} 颗棋和 ${loss.markers} 个标记。`);setPendingSize(null);setResetViewKey(value=>value+1);};
  const startRules=()=>{
    if(session.mode!=='setup')return;const result=enterRules(session.editor,{toPlay:nextPlayer,komi:Number(komiText),practiceMode,confirmedFreshStart:confirmedFresh});
    if(!result.ok){setMessage(errorText(result.error.code));return;}setSession(result.value);setMessage(result.value.message);setSelected(null);setRuleTool('play');
  };
  const applyRule=(operation:(value:RulesSession)=>ReturnType<typeof rulePlace>)=>{if(session.mode!=='rules')return;if(history.viewingHistory){setMessage('当前是只读回看，请先返回当前局面。');return;}const result=operation(session);if(result.ok){setSession(result.value);setMessage(result.value.message);setSelected(null);}else setMessage(errorText(result.error.code));};
  const ruleSelect=(at:Coord)=>{if(session.mode!=='rules')return;setSelected(at);const found=selectedShape(session.game.board,at);setMessage(found.group.length?`已选择 ${found.group.length} 颗相连棋；${showLiberties?`共有 ${found.liberties.length} 口气。`:'气仍隐藏。'}`:'这里是空点。');};
  const leaveRules=()=>{if(session.mode!=='rules')return;if(history.viewingHistory){setMessage('请返回当前局面后，再把盘面带回摆棋。');return;}const next=returnToSetup(session);setSession(next);setMessage(next.message);setSelected(null);setConfirmedFresh(false);};
  const save=()=>{if(session.mode!=='setup'){setMessage('请先返回摆棋示意，再保存临时局面。');return;}if(!store.ok){setMessage(store.issues[0].message);return;}const result=store.value.save(bundleFromEditor(session.editor));setMessage(result.ok?'已保存到当前设备；没有账号或网络上传。':result.issues[0].message);};
  const load=()=>{if(!store.ok){setMessage(store.issues[0].message);return;}const loaded=store.value.load(T06_WORKSPACE_ID);if(!loaded.ok){setMessage(loaded.issues[0].message);return;}if(!loaded.value){setMessage('当前设备还没有保存的 T06 临时局面。');return;}const restored=restoreExperiment(loaded.value.document);if(!restored.ok){setMessage(restored.issues[0].message);return;}updateEditor(restored.value,'已从当前设备重新读取棋子、轮次和标记；这是摆棋示意。');setResetViewKey(value=>value+1);};
  const status=session.mode==='setup'?'摆棋示意':`按规则试下 · ${session.game.mode==='capture-first'?'首提练习':'完整围棋'}`;

  return <div className="experiment-page" data-work-mode={session.mode}>
    <section className="experiment-hero"><p><a href={ROUTE_ROUTE}>← 返回学习路线</a></p><h1>自由实验棋盘</h1><p>自由摆放棋子和标记，或验证后按规则轮流试下。摆棋局面可以故意不合法，也不是一条对局记录。</p></section>
    <div className="work-mode-switch" role="group" aria-label="实验棋盘工作状态"><button type="button" aria-pressed={session.mode==='setup'} onClick={leaveRules}><strong>摆棋示意</strong><span>任意颜色、擦除和标记；不自动提子</span></button><button type="button" aria-pressed={session.mode==='rules'} onClick={()=>{if(session.mode==='setup'){entryRef.current?.scrollIntoView({block:'center'});entryRef.current?.focus();}}}><strong>按规则试下</strong><span>从已验证的新起点轮流落子</span></button></div>
    <section className="experiment-workspace">
      <div className="experiment-board-panel"><div className="experiment-panel-heading"><div><span>{status}</span><h2>{size}×{size} 完整棋盘</h2></div><strong>{session.mode==='setup'?'编辑历史':'对局历史'} {session.mode==='setup'?session.editor.undoStack.length:session.game.moves.length}</strong></div>
        <Board size={size} board={board} label={`${status}，完整${size}路棋盘`} mode={history.viewingHistory?'readonly':session.mode==='setup'?'mark':ruleTool==='play'?'play':'select'} disabled={history.viewingHistory||(session.mode==='rules'&&session.game.phase!=='playing')} selected={history.viewingHistory?null:selected} onSelect={session.mode==='setup'?setupSelect:ruleSelect} onPlay={at=>session.mode==='rules'&&applyRule(value=>rulePlace(value,at))} markers={markers} showCoordinates displayMode={projector?'projector':'standard'} resetViewKey={resetViewKey}/>
        {session.mode==='rules'&&history.frame&&<GameTimeline max={history.max} value={history.index} onChange={index=>{setSelected(null);history.goTo(index);}} title={history.frame.title} description={history.frame.description}/>}
        <div className="experiment-status" role="status" aria-live="polite"><strong>当前状态</strong><span>{history.viewingHistory?history.frame?.description:message}</span></div>
      </div>

      <aside className="experiment-controls" aria-label="实验棋盘控制">
        {session.mode==='setup'?<>
          <section><h2>摆棋工具</h2><div className="tool-grid">{TOOLS.map(item=><button type="button" key={item.id} aria-pressed={tool===item.id} onClick={()=>{setTool(item.id);setMessage(`${item.label}工具已选中：${item.note}。`);}}><strong>{item.label}</strong><small>{item.note}</small></button>)}</div>{tool==='sequence-marker'&&<label className="number-field">当前数字<input type="number" min="1" max="99" step="1" value={sequenceNumber} onChange={event=>setSequenceNumber(Math.max(1,Math.min(99,Math.trunc(Number(event.target.value)||1))))}/></label>}<label className="liberty-switch"><input type="checkbox" checked={showLiberties} onChange={event=>setShowLiberties(event.target.checked)}/><span><strong>显示气</strong><small>关闭时可先让成员猜，再打开核对。</small></span></label></section>
          <section><h2>编辑操作</h2><div className="action-row"><button type="button" disabled={!session.editor.undoStack.length} onClick={()=>updateEditor(undoEdit(session.editor),'已撤回一步摆棋编辑。')}>撤回编辑</button><button type="button" disabled={!session.editor.redoStack.length} onClick={()=>updateEditor(redoEdit(session.editor),'已重做一步摆棋编辑。')}>重做编辑</button><button type="button" onClick={()=>setConfirmClear(true)}>清空</button></div>{confirmClear&&<div className="inline-confirm" role="alert"><span>清空棋子和标记，并保留为可撤回编辑？</span><button type="button" onClick={()=>{updateEditor(clearSetup(session.editor),'棋盘已清空，可用“撤回编辑”恢复。');setConfirmClear(false);}}>确认清空</button><button type="button" onClick={()=>setConfirmClear(false)}>取消</button></div>}
            <label className="size-field">完整棋盘尺寸<select value={size} onChange={event=>requestSize(Number(event.target.value) as Size)}>{BOARD_SIZES.map(value=><option key={value} value={value}>{value}路</option>)}</select></label>{pendingSize&&<div className="resize-confirm" role="alert"><strong>确认尺寸变化</strong><span>{pendingSize<size?`保留左上 row/col；将裁切 ${resizeLoss(session.editor.current,pendingSize).stones} 颗棋和 ${resizeLoss(session.editor.current,pendingSize).markers} 个标记。`:'扩大棋盘，不丢棋子或标记；既有 row/col 保持。'}</span><div><button type="button" onClick={confirmSize}>确认切换</button><button type="button" onClick={()=>setPendingSize(null)}>取消</button></div></div>}
          </section>
          <section><h2>保存与导出</h2><div className="save-grid"><button type="button" onClick={save}>保存当前设备</button><button type="button" onClick={load}>读取本机临时局面</button><button type="button" onClick={()=>download(positionJson(session.editor),'go-club-t06-position.json')}>导出 Position JSON</button><button type="button" onClick={()=>download(bundleJson(session.editor),'go-club-t06-experiment.json')}>导出 Position 与标记</button></div><p className="control-note">纯 Position 符合共同 schema；完整实验包以 ContentBundle 携带独立 MarkerDocument，可无损回读。</p></section>
          <section className={`setup-diagnosis ${diagnosis.ok?'ready':'problem'}`}><h2>{diagnosis.ok?'规则起点检查通过':'摆棋检查提示'}</h2><p>{diagnosis.message}</p>{!diagnosis.ok&&diagnosis.points.length>0&&<p>问题棋块：{diagnosis.points.map(at=>displayCoord(at,size)).join('、')}</p>}</section>
          <fieldset ref={entryRef} tabIndex={-1} className="rule-entry"><legend>按规则试下（从当前盘面开始）</legend><label>下一手执棋<select value={nextPlayer} onChange={event=>{const color=event.target.value as Color;setNextPlayer(color);setSession(setupSession(setSetupTurn(session.editor,color),session.message));}}><option value="B">黑方</option><option value="W">白方</option></select></label><label>贴目（Komi）<input type="number" step="0.5" value={practiceMode==='capture-first'?'0':komiText} disabled={practiceMode==='capture-first'} onChange={event=>setKomiText(event.target.value)}/></label><label>练习模式<select value={practiceMode} onChange={event=>setPracticeMode(event.target.value as PracticeMode)}><option value="full-game">完整围棋试下</option><option value="capture-first">首个提子即结束</option></select></label><label className="fresh-confirm"><input type="checkbox" checked={confirmedFresh} onChange={event=>setConfirmedFresh(event.target.checked)}/><span>确认把当前盘面作为新起点；此前劫史未知，只从这里建立位置超级劫历史。</span></label><button type="button" className="start-rule-button" onClick={startRules} disabled={!diagnosis.ok}>从当前局面开始按规则试下</button></fieldset>
        </>:<RuleControls session={session} reviewIndex={history.viewingHistory?history.index:null} tool={ruleTool} setTool={setRuleTool} showLiberties={showLiberties} setShowLiberties={setShowLiberties} apply={applyRule} leave={leaveRules}/>} 
      </aside>
    </section>
    <section className="history-explanation"><h2>两类撤回不会混淆</h2><p><strong>摆棋撤回</strong>只还原放子、擦除、标记、清空或尺寸变化。<strong>对局撤回</strong>由规则引擎恢复轮次、提子、停手、阶段、上一手和位置历史。返回摆棋后，规则终盘只成为一次可撤回编辑，旧落子序列不会继续冒充完整有效。</p></section>
  </div>;
}

function RuleControls({session,reviewIndex,tool,setTool,showLiberties,setShowLiberties,apply,leave}:{session:RulesSession;reviewIndex:number|null;tool:'play'|'inspect';setTool:(tool:'play'|'inspect')=>void;showLiberties:boolean;setShowLiberties:(value:boolean)=>void;apply:(operation:(value:RulesSession)=>ReturnType<typeof rulePlace>)=>void;leave:()=>void}){
  const game=reviewIndex===null?session.game:session.game.undoStack[reviewIndex];
  const browsing=reviewIndex!==null;
  return <><section><h2>规则试下工具</h2><div className="rule-tool-row"><button type="button" aria-pressed={tool==='play'} onClick={()=>setTool('play')}>按规则落子</button><button type="button" aria-pressed={tool==='inspect'} onClick={()=>setTool('inspect')}>选择棋块</button></div><label className="liberty-switch"><input type="checkbox" checked={showLiberties} onChange={event=>setShowLiberties(event.target.checked)}/><span><strong>显示气</strong><small>选择棋块后显示或隐藏气环。</small></span></label></section><section className="rule-summary"><h2>{browsing?'回看时的规则状态':'当前规则状态'}</h2><dl><div><dt>下一手</dt><dd>{colorName(game.toPlay)}</dd></div><div><dt>贴目</dt><dd>{game.komi}</dd></div><div><dt>连续停手</dt><dd>{game.consecutivePasses}</dd></div><div><dt>阶段</dt><dd>{game.phase==='playing'?'试下中':game.phase==='scoring'?'终局确认':'已结束'}</dd></div><div><dt>历史布局</dt><dd>{game.history.layouts.length}</dd></div><div><dt>提子</dt><dd>黑 {game.captures.B} · 白 {game.captures.W}</dd></div></dl></section><section><h2>对局操作</h2><div className="game-actions"><button type="button" onClick={()=>apply(rulePass)} disabled={browsing||game.phase!=='playing'}>停一手</button><button type="button" onClick={()=>apply(ruleUndo)} disabled={browsing||!session.game.undoStack.length}>撤回对局</button><button type="button" onClick={()=>apply(ruleRedo)} disabled={browsing||!session.game.redoStack.length}>重做对局</button>{!browsing&&game.phase==='scoring'&&<button type="button" onClick={()=>apply(ruleResume)}>有争议，恢复试下</button>}</div><button type="button" className="return-setup" disabled={browsing} onClick={leave}>把当前盘面带回摆棋示意</button><p className="control-note">这里的动作使用 T01 完整历史；失败操作不会改变轮次、棋盘或计数。</p></section></>;
}

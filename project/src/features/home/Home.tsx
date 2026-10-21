import {useMemo,useRef,useState} from 'react';
import {Board} from '../../components/Board';
import {GameTimeline,useGameHistory} from '../../components/GameTimeline';
import type {BoardDisplayMode,BoardMarker,BoardMode} from '../../components/board.types';
import {BOARD_SIZES} from '../../core/constants';
import {boardFromPosition,displayCoord} from '../../core/coordinates';
import type {Coord,GameState,Position,Size} from '../../core/content.generated';
import {RULE_ERROR_ZH,rulesEngine} from '../../core/rules';
import {projectConfig} from '../../config';

function developmentPosition(size:Size):Position{
  const center=Math.floor(size/2);
  return {schemaVersion:1,id:`DEV-T02-${size}`,revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size,
    stones:[{row:center,col:center,color:'B'},{row:center,col:center+1,color:'W'},{row:center+1,col:center,color:'B'},{row:1,col:1,color:'W'}],
    toPlay:'B',historyPolicy:'fresh-setup',history:null};
}
function start(size:Size):GameState{
  const position:Position={schemaVersion:1,id:`DEV-T02-PLAY-${size}`,revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size,stones:[],toPlay:'B',historyPolicy:'fresh-setup',history:null};
  const result=rulesEngine.startGame(position,{mode:'full-game',komi:0,gameId:`DEV-T02-GAME-${size}`});
  if(!result.ok)throw new Error(RULE_ERROR_ZH[result.error.code]);
  return result.value;
}
function developmentMarkers(size:Size):BoardMarker[]{
  const c=Math.floor(size/2);
  return [
    {markerId:'liberty',kind:'liberty',at:{row:c-1,col:c},label:'示例气环'},
    {markerId:'target',kind:'target',at:{row:c,col:c+1},label:'示例目标三角'},
    {markerId:'last',kind:'last-move',at:{row:c+1,col:c},label:'示例最后一手'},
    {markerId:'sequence',kind:'sequence',at:{row:1,col:1},number:3,label:'示例顺序 3'},
    {markerId:'candidate',kind:'candidate',at:{row:0,col:size-1},label:'示例候选点'},
    {markerId:'region-b',kind:'ownership',at:{row:size-1,col:0},owner:'B'},
    {markerId:'region-w',kind:'ownership',at:{row:size-1,col:1},owner:'W'},
    {markerId:'region-n',kind:'ownership',at:{row:size-1,col:2},owner:'neutral'},
  ];
}
const MODES:{id:BoardMode;name:string;note:string}[]=[
  {id:'readonly',name:'只读棋盘',note:'查看棋子与坐标，不提交操作。'},
  {id:'select',name:'选点棋盘',note:'选择一个空点或棋子位置。'},
  {id:'play',name:'落子棋盘',note:'由页面调用 T01 引擎验证并提交落子。'},
  {id:'mark',name:'标记棋盘',note:'展示气环、目标、顺序与区域标签。'},
];

export function Home(){
  const [size,setSize]=useState<Size>(projectConfig.defaultBoardSize);
  const [mode,setMode]=useState<BoardMode>('mark');
  const [selected,setSelected]=useState<Coord|null>(null);
  const [game,setGame]=useState<GameState>(()=>start(projectConfig.defaultBoardSize));
  const [showCoordinates,setShowCoordinates]=useState(true);
  const [displayMode,setDisplayMode]=useState<BoardDisplayMode>('standard');
  const [zoom,setZoom]=useState(1);
  const [resetViewKey,setResetViewKey]=useState(0);
  const [message,setMessage]=useState('标记示例已载入；这些是组件验证资料，不是正式课程。');
  const [actionCount,setActionCount]=useState(0);
  const firstMode=useRef<HTMLInputElement>(null);
  const staticPosition=useMemo(()=>developmentPosition(size),[size]);
  const staticBoard=useMemo(()=>boardFromPosition(staticPosition),[staticPosition]);
  const history=useGameHistory(game);
  const board=mode==='play'?(history.frame?.board??game.board):staticBoard;
  const markers:BoardMarker[]=mode==='mark'?developmentMarkers(size):mode==='play'?history.frame?.markers??[]:[];
  const unavailable=mode==='select'?[{row:2,col:2}]:[];
  const currentMode=MODES.find(item=>item.id===mode)!;
  const resetForSize=(next:Size)=>{setSize(next);setGame(start(next));setSelected(null);setZoom(1);setResetViewKey(value=>value+1);setActionCount(0);setMessage(`已切换到完整 ${next}×${next} 棋盘。`);};
  const choose=(at:Coord)=>{setSelected(at);setActionCount(value=>value+1);setMessage(`已选择 ${displayCoord(at,size)}。`);};
  const play=(at:Coord)=>{if(history.viewingHistory)return;const result=rulesEngine.tryMove(game,{type:'place',color:game.toPlay,at});if(!result.ok){setMessage(RULE_ERROR_ZH[result.error.code]);return;}setGame(result.value.nextState);setSelected(at);setActionCount(value=>value+1);setMessage(`${game.toPlay==='B'?'黑方':'白方'}已在 ${displayCoord(at,size)} 落子。`);};
  const switchMode=(next:BoardMode)=>{setMode(next);setSelected(null);setActionCount(0);setMessage(`${MODES.find(item=>item.id===next)!.name}已载入；这是开发验证示例。`);};
  const resetView=()=>{setZoom(1);setResetViewKey(value=>value+1);setMessage('棋盘缩放和滚动位置已复位。');};

  return <div className="board-lab-page"><section className="page-intro board-lab-intro"><p><a href="#/home">← 返回学习入口</a></p><h1>互动棋盘练习</h1><p>这里保留 T02 的四种组件验证示例。它不是正式课程、完整对弈或正式题库。</p></section>
      <section className={`demo-shell${displayMode==='projector'?' projector-shell':''}`} aria-labelledby="demo-title">
        <div className="demo-board-column"><div className="section-heading"><div><p className="eyebrow">当前示例</p><h2 id="demo-title">{currentMode.name}</h2></div><span className="mode-badge">{size}×{size}</span></div>
          <Board size={size} board={board} label={`${size}×${size}${currentMode.name}`} mode={mode==='play'&&history.viewingHistory?'readonly':mode} disabled={mode==='play'&&history.viewingHistory} selected={selected} onSelect={choose} onPlay={play} markers={markers} unavailablePoints={unavailable} showCoordinates={showCoordinates} displayMode={displayMode} zoom={zoom} resetViewKey={resetViewKey}/>
          {mode==='play'&&history.frame&&<GameTimeline max={history.max} value={history.index} onChange={history.goTo} title={history.frame.title} description={history.frame.description}/>}
          <div className="board-status" role="status" aria-live="polite"><strong>状态</strong><span>{mode==='play'&&history.viewingHistory?history.frame?.description:message}</span><span data-testid="action-count">本示例已响应 {actionCount} 次</span></div>
          <button className="text-button" type="button" onClick={()=>firstMode.current?.focus()}>返回示例选择</button>
        </div>
        <aside className="control-panel" aria-label="棋盘控制">
          <fieldset><legend>示例类型</legend><div className="choice-list">{MODES.map((item,index)=><label key={item.id} className={mode===item.id?'choice active':'choice'}><input ref={index===0?firstMode:undefined} type="radio" name="demo-mode" value={item.id} checked={mode===item.id} onChange={()=>switchMode(item.id)}/><span><strong>{item.name}</strong><small>{item.note}</small></span></label>)}</div></fieldset>
          <fieldset><legend>完整棋盘尺寸</legend><div className="segmented">{BOARD_SIZES.map(value=><label key={value}><input type="radio" name="board-size" checked={size===value} onChange={()=>resetForSize(value)}/><span>{value}路</span></label>)}</div></fieldset>
          <fieldset><legend>显示</legend><label className="switch-row"><input type="checkbox" checked={showCoordinates} onChange={event=>setShowCoordinates(event.target.checked)}/><span>显示坐标</span></label><label className="switch-row"><input type="checkbox" checked={displayMode==='projector'} onChange={event=>setDisplayMode(event.target.checked?'projector':'standard')}/><span>投影模式</span></label></fieldset>
          <fieldset><legend>棋盘缩放</legend><div className="zoom-row"><button type="button" aria-label="缩小棋盘" onClick={()=>setZoom(value=>Math.max(.75,value-.25))} disabled={zoom<=.75}>−</button><span aria-label="当前缩放">{Math.round(zoom*100)}%</span><button type="button" aria-label="放大棋盘" onClick={()=>setZoom(value=>Math.min(1.5,value+.25))} disabled={zoom>=1.5}>＋</button></div><button className="reset-button" type="button" onClick={resetView}>复位缩放与滚动</button></fieldset>
          {mode==='mark'&&<div className="marker-legend" aria-label="标记说明"><h3>标记说明</h3><ul><li><i className="legend-liberty"/>气环</li><li><i className="legend-target">△</i>目标三角</li><li><i className="legend-last">●</i>最后一手</li><li><i className="legend-sequence">3</i>数字顺序</li><li><i className="legend-candidate">＋</i>候选点</li><li><i className="legend-region">黑 / 白 / 中</i>区域标签</li></ul></div>}
        </aside>
      </section>
      <section className="component-notes" aria-label="组件边界"><article><h2>受控显示</h2><p>Board 只显示传入的盘面与标记。落子示例由页面调用 T01 规则引擎，组件本身不判断合法性。</p></article><article><h2>键盘与触屏</h2><p>方向键移动，Enter 或空格操作；触屏直接轻触交叉点。占用点和不可用点会用文字说明。</p></article><article><h2>小屏与投影</h2><p>19 路棋盘在自身区域内滚动，页面宽度保持稳定。投影模式放大交点、线条与文字。</p></article></section>
  </div>;
}

import {useEffect,useMemo,useRef,useState} from 'react';
import {Board} from '../../components/Board';
import {GameTimeline,useGameHistory} from '../../components/GameTimeline';
import type {Color,Coord} from '../../core/content.generated';
import {RULE_ERROR_ZH,type BoardMarker,type BoardMatrix} from '../../core/rules';
import {AI_DIFFICULTIES,EXTREME_MODEL,type AiDifficulty} from '../../core/analysis/ai-contract';
import {browserStoragePort} from '../../core/unified-persistence';
import {FULL_GAME_SIZES,setBoardSize,setKomi,setSetupKind,toggleHandicapStone,confirmScoreFor,toggleDeadGroup,resumeDisputedPlay,scorePreview,resignGame,type FullGameMatch,type FullGameFlowResult} from '../full-game/model';
import {ConfirmDialog,ScoreDetails} from '../full-game/FullGame';
import {KataGoReview} from '../katago-review/KataGoReview';
import {useKataGoReview} from '../katago-review/useKataGoReview';
import {BoardDisplayTools} from '../online-game/BoardDisplayTools';
import {serializeGameToSgf} from '../file-exchange/sgf';
import {emptyAiMatch,startAiGame,humanMove,applyAiMove,travelAiHistory,DEFAULT_AI_OPTIONS,type AiOptions} from './model';
import {aiSessionJson,createAiSessionStore,parseAiSession,MAX_AI_SESSION_BYTES} from './storage';
import {useAiOpponent} from './useAiOpponent';
import {aiServiceOrigin} from './config';
import '../full-game/FullGame.css';
import '../online-game/OnlineTools.css';
import './AiGame.css';

const color=(c:Color)=>c==='B'?'黑方':'白方';
const errorText=(r:Extract<FullGameFlowResult,{ok:false}>)=>RULE_ERROR_ZH[r.error.code as keyof typeof RULE_ERROR_ZH]??(r.error.code==='NO_HANDICAP_STONES'?'请先在棋盘放置至少一颗起始黑子。':r.error.code==='INVALID_ARGUMENT'?'AI 对局贴目支持 -100 到 100 的整数或半目，请检查设置。':'本次操作没有完成，原棋局保持不变。');
function download(text:string,name:string,type='application/json'){
  const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
}

export function AiGame({projector=false}:{projector?:boolean}){
  const [loaded]=useState(()=>createAiSessionStore(browserStoragePort()).load());
  const [match,setMatch]=useState<FullGameMatch>(()=>loaded.ok&&loaded.match?loaded.match:emptyAiMatch());
  const [options,setOptions]=useState<AiOptions>(()=>loaded.ok&&loaded.options?loaded.options:{...DEFAULT_AI_OPTIONS});
  const [paused,setPaused]=useState(()=>loaded.ok&&!!loaded.match),[notice,setNotice]=useState(loaded.ok&&loaded.match?'已恢复本机 AI 棋局；AI 暂停，请按需继续。':loaded.ok?'':loaded.message);
  const [modal,setModal]=useState<'restart'|'resign'|'load'|'import'|null>(null),[discard,setDiscard]=useState<{type:'size';size:5|9|13|19}|{type:'kind';kind:'empty'|'free-handicap'}|null>(null);
  const [incoming,setIncoming]=useState<{match:FullGameMatch;options:AiOptions}|null>(null),[zoom,setZoom]=useState(1),[viewKey,setViewKey]=useState(0);
  const latest=useRef(match);latest.current=match;const moveGate=useRef(false),input=useRef<HTMLInputElement>(null),alive=useRef(true);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const game=match.game,history=useGameHistory(game),viewing=history.viewingHistory;
  const apply=(result:FullGameFlowResult)=>{if(result.ok){setMatch(result.value);setNotice('');}else setNotice(errorText(result));};
  const aiEnabled=!!game&&game.phase==='playing'&&game.toPlay!==options.humanColor&&!paused&&!viewing&&!modal&&!discard;
  const opponent=useAiOpponent(game,options,aiEnabled,(move,expected)=>{
    if(latest.current.game!==expected)return;
    const result=applyAiMove(latest.current,options,move);
    if(result.ok){setMatch(result.value);setNotice(`AI 已${move.move.type==='pass'?'停一手':'落子'} · 本次思考 ${(move.elapsedMs/1000).toFixed(1)} 秒。`);}else{setPaused(true);setNotice(errorText(result));}
  });
  const serviceOrigin=aiServiceOrigin(options.difficulty);
  const review=useKataGoReview(game,history.index,game?.phase==='finished',serviceOrigin,options.difficulty==='extreme'?EXTREME_MODEL.name:undefined);
  useEffect(()=>{moveGate.current=false;},[game]);
  useEffect(()=>{if(!game)return;const result=createAiSessionStore(browserStoragePort()).save(match,options);if(!result.ok)setNotice(result.message);},[match,options]);
  const stop=()=>{opponent.cancel();setPaused(true);};
  const requestModal=(value:typeof modal)=>{stop();setModal(value);};
  const humanAllowed=!!game&&game.phase==='playing'&&game.toPlay===options.humanColor&&!viewing&&!modal&&!discard;
  const play=(at:Coord|null)=>{
    if(!humanAllowed||moveGate.current)return;moveGate.current=true;
    const result=humanMove(match,options,at);if(!result.ok)moveGate.current=false;
    else setPaused(false);apply(result);
  };
  const travel=(direction:'undo'|'redo',round=false)=>{stop();apply(travelAiHistory(match,options,direction,round));};
  const goTo=(n:number)=>{stop();history.goTo(n);};
  const again=()=>{opponent.cancel();setMatch(emptyAiMatch());setPaused(false);setNotice('请选择新一局的设置。');setModal(null);};
  const start=()=>{if(options.difficulty==='extreme'&&!serviceOrigin){setNotice('极致服务尚未启用。可先选择其他三档；现有棋局与存档不受影响。');return;}const r=startAiGame(match);if(r.ok)setPaused(false);apply(r);};
  const preview=useMemo(()=>game&&(game.phase==='scoring'||game.result?.reason==='area')?scorePreview(match):null,[match]);
  const board:BoardMatrix=game?(history.frame?.board??game.board):Array.from({length:match.setup.size},(_,r)=>Array.from({length:match.setup.size},(_,c)=>match.setup.handicapStones.some(p=>p.row===r&&p.col===c)?'B' as const:null));
  const dead=game?.agreement?.deadStones??match.scoring.deadStones;
  const markers:BoardMarker[]=[...(viewing?history.frame?.markers??[]:game?.lastMove?.type==='place'?[{markerId:'ai-last',kind:'last-move' as const,at:game.lastMove.at,label:'最后一手'}]:[]),...(!viewing&&(game?.phase==='scoring'||game?.result?.reason==='area')?dead.map((at,i)=>({markerId:`ai-dead-${i}`,kind:'target' as const,at,label:'人工确认的死子标记'})):[]),...review.markers];
  const status=!game?'开局设置':viewing?`只读复盘 · ${history.frame?.title}`:game.phase==='playing'?game.toPlay===options.humanColor?`轮到你（${color(options.humanColor)}）`:paused?'AI 已暂停':opponent.phase==='error'?'AI 暂未落子':'AI 思考中…':game.phase==='scoring'?'终局清单待人工核对':'本局已结束';
  const winner=game?.result?.reason==='area'?game.result.score.winner:game?.result&&'winner' in game.result?game.result.winner:null;
  const timeline=game&&history.frame?<GameTimeline max={history.max} value={history.index} onChange={goTo} title={history.frame.title} description={history.frame.description} help="滑动只读回看，不改变棋局；回看时会暂停 AI。真正悔棋请用撤回一手或撤回最近回合。"/>:null;
  const turnActions=<><button type="button" disabled={!humanAllowed} onClick={()=>play(null)}>停一手</button><button type="button" disabled={!game?.undoStack.length||!!modal} onClick={()=>travel('undo')}>撤回一手</button><button type="button" disabled={!game?.redoStack.length||!!modal} onClick={()=>travel('redo')}>重做一手</button></>;
  const renderBoard=(variant:'full'|'mini'|'pip',reset=0)=><Board size={game?.size??match.setup.size} board={board} label={`${variant==='mini'?'悬浮小棋盘 · ':''}AI 对弈，${status}`} mode={!game?match.setup.kind==='free-handicap'?'mark':'readonly':viewing||game.phase==='finished'?'readonly':game.phase==='scoring'?'mark':'play'} disabled={!!modal||!!discard||viewing||game?.phase==='finished'||(game?.phase==='playing'&&!humanAllowed)} selected={null} onPlay={at=>play(at)} onSelect={at=>{if(!game)apply(toggleHandicapStone(match,at));else if(game.phase==='scoring'&&!viewing)apply(toggleDeadGroup(match,at));}} markers={markers} showCoordinates zoom={variant==='full'?zoom:.75} resetViewKey={viewKey+reset} displayMode={variant==='full'&&projector?'projector':'standard'}/>;
  const save=()=>{const r=createAiSessionStore(browserStoragePort()).save(match,options);setNotice(r.ok?'AI 对局、难度和待确认清单已保存到当前设备。':r.message);};
  const restore=()=>{const r=createAiSessionStore(browserStoragePort()).load();if(r.ok&&r.match&&r.options){setMatch(r.match);setOptions(r.options);setPaused(true);setNotice('已读取，AI 暂停。可回看、悔棋或继续。');}else setNotice(r.ok?'本设备没有已保存的 AI 对局。':r.message);};
  const exportOne=(kind:'session'|'game'|'sgf')=>{if(!game)return;try{if(kind==='session')download(aiSessionJson(match,options),'围棋-AI续玩.json');else if(kind==='game')download(JSON.stringify(game,null,2)+'\n','围棋-AI棋局.json');else{const r=serializeGameToSgf(game);download(r.text,'围棋-AI棋局.sgf','application/x-go-sgf');if(r.warnings.length)setNotice(r.warnings.join('；'));}}catch(e){setNotice(e instanceof Error?e.message:'导出未完成，原对局保留。');}};
  const readFile=async(file:File|undefined)=>{if(!file)return;if(file.size>MAX_AI_SESSION_BYTES){setNotice('续玩文件过大，未替换当前棋局。');return;}try{const result=parseAiSession(await file.text());if(!alive.current)return;if(!result.ok){setNotice(result.message);return;}if(!result.match||!result.options)return;stop();setIncoming({match:result.match,options:result.options});setModal('import');}catch{if(alive.current)setNotice('文件读取失败，原棋局保留。');}};
  return <div className="full-game-page ai-game-page" data-testid="ai-game" data-view={game?'game':'setup'} data-phase={game?.phase??'setup'} data-move-count={game?.moves.length??0} data-turn={game?.toPlay??''} data-paused={paused} data-difficulty={options.difficulty}>
    <ConfirmDialog open={modal!==null} title={modal==='resign'?'确认认输':modal==='restart'?'重开 AI 对局':modal==='load'?'读取已保存 AI 对局':'导入 AI 续玩文件'} description={modal==='resign'?'本局会以你认输结束，之后可以正常复盘；不生成虚构的数子得分。':'这会替换当前页面棋局，建议先导出当前续玩文件。恢复的 AI 将保持暂停。'} confirmLabel={modal==='resign'?'确认我认输':modal==='restart'?'返回设置并重开':'确认替换当前棋局'} onClose={()=>{setModal(null);setIncoming(null);}} onConfirm={()=>{if(modal==='restart')again();else if(modal==='resign')apply(resignGame(match));else if(modal==='load')restore();else if(incoming){setMatch(incoming.match);setOptions(incoming.options);setPaused(true);setNotice('导入通过，AI 暂停；原始轮次与完整历史已恢复。');}setIncoming(null);setModal(null);}}/>
    <ConfirmDialog open={discard!==null} title="清除起始黑子后更改设置？" description="切换尺寸或改为空盘会清除已摆的起始黑子。取消可保留当前布局。" confirmLabel="确认清除并更改" onClose={()=>setDiscard(null)} onConfirm={()=>{if(discard)apply(discard.type==='size'?setBoardSize(match,discard.size,true):setSetupKind(match,discard.kind,true));setDiscard(null);}}/>
    <section className="full-game-hero"><p><a href="#/home">← 返回学习入口</a></p><span className="module-kicker">完整围棋 · 与 AI 练习</span><h1>AI 对弈</h1><p>选择执色与练习强度，和真实 KataGo 轮流落子。支持悔棋、重做、滑动回看和本机续玩；新着法需要联网，赛后才开放胜率和候选分析。</p><p className="ai-difficulty-note">轻松、标准、挑战按搜索强度区分；极致使用更强模型。四档不对应人类段级位。默认9路、贴目0，可出现和棋。</p></section>
    <section className="full-game-layout"><div className="full-board-panel"><div className="full-board-heading"><div><span>{game?.size??match.setup.size}路 · 贴目 {game?.komi??match.setup.komi}</span><h2>{game?'对局棋盘':'开局棋盘'}</h2></div><strong aria-live="polite">{status}</strong></div>
      {game&&<BoardDisplayTools context="ai" renderBoard={renderBoard} timeline={timeline} chat={<section className="ai-max-help"><h3>本局设置</h3><p>你执{color(options.humanColor)}；难度：{AI_DIFFICULTIES[options.difficulty].label}。</p><p>AI 思考时可暂停或撤回；历史局面只读。终局确认与赛后分析在主页面完成。</p></section>} status={status} turnActions={turnActions}/>}
      {renderBoard('full')}
      <div className="ai-view-controls"><button type="button" disabled={zoom>=1.5} onClick={()=>setZoom(z=>Math.min(1.5,z+.25))}>放大棋盘</button><button type="button" disabled={zoom<=.75} onClick={()=>setZoom(z=>Math.max(.75,z-.25))}>缩小棋盘</button><button type="button" onClick={()=>{setZoom(1);setViewKey(v=>v+1);}}>复位视图</button></div>{timeline}
    </div><aside className="full-game-controls" aria-label="AI 对弈控制">{!game?<>
      <h2>确定本局设置</h2><label htmlFor="ai-size">棋盘尺寸<select id="ai-size" value={match.setup.size} onChange={e=>{const size=Number(e.target.value) as 5|9|13|19;const r=setBoardSize(match,size);if(!r.ok&&r.error.code==='SIZE_CHANGE_REQUIRES_CLEAR')setDiscard({type:'size',size});else apply(r);}}>{FULL_GAME_SIZES.map(s=><option key={s} value={s}>{s}路{s===5?'（小棋盘练习）':''}</option>)}</select></label>
      <label htmlFor="ai-level">难度<select id="ai-level" value={options.difficulty} aria-describedby="ai-level-help" onChange={e=>setOptions({...options,difficulty:e.target.value as AiDifficulty})}>{Object.entries(AI_DIFFICULTIES).map(([id,p])=><option key={id} value={id}>{p.label}</option>)}</select></label><p id="ai-level-help" role="status">{AI_DIFFICULTIES[options.difficulty].description}{options.difficulty==='extreme'&&(serviceOrigin?' 单次搜索约半分钟，启动或排队时可能更久。':' 极致服务尚未启用；可先使用其他三档。')}</p>
      <fieldset><legend>你的执色</legend>{(['B','W'] as const).map(c=><label className="radio-card" key={c}><input type="radio" name="ai-human-color" value={c} checked={options.humanColor===c} onChange={()=>setOptions({...options,humanColor:c})}/>{color(c)}{match.setup.kind==='free-handicap'?(c==='B'?'（让子后 AI 白先）':'（让子后你先）'):(c==='B'?'（空盘先行）':'（AI 先行）')}</label>)}</fieldset>
      <label htmlFor="ai-komi">白方贴目<input id="ai-komi" type="number" min="-100" max="100" step="0.5" value={match.setup.komi} onChange={e=>{if(Number.isFinite(e.target.valueAsNumber))apply(setKomi(match,e.target.valueAsNumber));}}/></label>
      <fieldset><legend>起始方式</legend>{(['empty','free-handicap'] as const).map(k=><label className="radio-card" key={k}><input type="radio" name="ai-setup-kind" checked={match.setup.kind===k} onChange={()=>{const r=setSetupKind(match,k);if(!r.ok&&r.error.code==='SIZE_CHANGE_REQUIRES_CLEAR')setDiscard({type:'kind',kind:k});else apply(r);}}/>{k==='empty'?'空盘':'本社团自由放置让子'}</label>)}{match.setup.kind==='free-handicap'&&<p>点击棋盘放起始黑子，已放 {match.setup.handicapStones.length} 颗；开始后白方先行。不是正式固定让子规则。</p>}</fieldset>
      <button type="button" className="start-full-game" disabled={options.difficulty==='extreme'&&!serviceOrigin} onClick={start}>验证设置并开始 AI 对局</button><button type="button" onClick={restore}>读取本机 AI 对局</button>
    </>:<>
      <section className="turn-card"><span className={`turn-stone ${game.toPlay==='B'?'black':'white'}`}/><div><strong>{status}</strong><p>你执{color(options.humanColor)} · {AI_DIFFICULTIES[options.difficulty].label} · {game.size}路</p></div></section>
      {game.phase==='playing'&&<section className="play-actions"><h2>对弈操作</h2><div>{turnActions}<button type="button" disabled={!humanAllowed} onClick={()=>requestModal('resign')}>我认输</button>{game.toPlay!==options.humanColor&&(!paused&&opponent.phase!=='error'?<button type="button" onClick={stop}>暂停 AI 思考</button>:<button type="button" disabled={viewing||!!modal} onClick={()=>{setPaused(false);opponent.retry();}}>继续 / 重试 AI 落子</button>)}</div>{game.toPlay!==options.humanColor&&<p className="ai-engine-status" data-testid="ai-status" data-state={opponent.phase} role="status" aria-live="polite">{paused?'AI 已暂停。可回看、悔棋或手动继续。':opponent.message||'正在准备本次思考。'}</p>}<p>只有轮到你时可落子、停手或认输。请求失败不换手，不自动重试，也不改用随机落子。</p></section>}
      <section className="play-actions"><h2>悔棋与恢复</h2><div><button type="button" disabled={!game.undoStack.length} onClick={()=>travel('undo',true)}>撤回最近回合</button><button type="button" disabled={!game.redoStack.length} onClick={()=>travel('redo',true)}>重做最近回合</button><button type="button" onClick={()=>requestModal('restart')}>重开 / 更改难度</button></div><p>撤回最近回合最多恢复两手，让你重新作决定；撤回一手则只恢复上一项操作。悔棋后 AI 暂停，新落子会清除旧重做分支。</p></section>
      {game.phase==='scoring'&&!viewing&&<section className="scoring-actions"><h2>人工终局核对</h2><p>AI 没有自动确认棋块死活。请你与同伴核对黑白双方：点击整块标记或取消死子，再依次接受同一清单；有争议就恢复原盘面。</p>{match.scoring.confirmedBy.length===0?<button type="button" onClick={()=>apply(confirmScoreFor(match,'B'))}>已核对黑方清单</button>:<button type="button" onClick={()=>apply(confirmScoreFor(match,'W'))}>已核对白方同一清单并计分</button>}<button type="button" onClick={()=>{stop();apply(resumeDisputedPlay(match,options.humanColor));}}>有争议，恢复原盘面</button></section>}
      {game.phase==='finished'&&<section className="finished-actions" role="status"><h2>{winner==='draw'?'本局和棋':winner===options.humanColor?'你获得本局胜利':'AI 获得本局胜利'}</h2><p>{game.result?.reason==='resign'?'本局以认输结束，不编造面积分。':'清单经人工确认后，已按面积计分。'}现在可拖动滑动条，并手动分析复盘局面。</p></section>}
      <section className="save-actions"><h2>本机保存与棋谱</h2><div><button type="button" onClick={save}>保存 AI 对局</button><button type="button" onClick={()=>requestModal('load')}>读取本机 AI 对局</button><button type="button" onClick={()=>exportOne('session')}>导出 AI 续玩文件</button><button type="button" onClick={()=>exportOne('game')}>导出标准棋局 JSON</button><button type="button" onClick={()=>exportOne('sgf')}>导出 SGF 主线</button></div><p>自动保存与真人对局分开。JSON 续玩包含难度、完整历史和待确认标记；SGF 主线不包含全部终局流程。</p></section>
    </>}
    <section className="ai-import"><button type="button" onClick={()=>input.current?.click()}>导入 AI 续玩文件</button><input ref={input} type="file" accept=".json,application/json" aria-label="选择 AI 续玩 JSON" onChange={e=>{void readFile(e.target.files?.[0]);e.target.value='';}}/></section>
    <p className="full-game-message" role="status">{notice||match.message}</p><a href="#/play/free">转到自由双人对弈 →</a>
    </aside></section>
    {!viewing&&preview?.ok&&<ScoreDetails score={preview.value} captures={game!.captures} final={game?.phase==='finished'}/>}
    {game&&<KataGoReview analysis={review} size={game.size} index={history.index}/>}
    <section className="full-game-about"><h2>用自己的节奏练习</h2><p>AI 新着法与赛后分析需要联网；棋谱回看、导出和已有存档保存在当前设备。服务休眠或繁忙时可暂停，不会丢弃已经下出的棋。没有倒计时、排名或连胜要求。</p><a href="#/route">返回学习路线</a></section>
  </div>;
}

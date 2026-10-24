import {AdvancedLesson} from '../advanced-courses/AdvancedLesson';
import {emptyLessonProgress,lessonKey,learningStatus} from '../advanced-courses/progress';
import {advancedLessons,lessonByNumber} from '../advanced-courses/data';
import type {CourseLesson,LessonProgress} from '../advanced-courses/types';
import {Fragment,useEffect,useMemo,useState} from 'react';
import {Board} from '../../components/Board';
import type {BoardMarker} from '../../components/board.types';
import type {StoneValue} from '../../core/content.generated';
import {projectConfig} from '../../config';
import {APP_VERSION} from '../../core/version';
import {Home as BoardLab} from '../home/Home';
import {LibertyLab} from '../liberty-lab/LibertyLab';
import {CaptureLab} from '../capture-lab/CaptureLab';
import {CaptureGame} from '../capture-game/CaptureGame';
import {ExperimentBoard} from '../experiment-board/ExperimentBoard';
import {FullGame} from '../full-game/FullGame';
import {OnlineGame} from '../online-game/OnlineGame';
import {onlineConnectionConfig} from '../online-game/hosting';
import {PuzzleRunner} from '../puzzle-runner/PuzzleRunner';
import {LifeLab} from '../life-lab/LifeLab';
import {CooperativeChallenge} from '../cooperative/CooperativeChallenge';
import {TerritoryTrainer} from '../territory/TerritoryTrainer';
import {TeacherEditor} from '../teacher-editor/TeacherEditor';
import {FileExchange} from '../file-exchange/FileExchange';
import {OfflineData} from '../offline-data/OfflineData';
import {EvidencePage} from '../evidence/EvidencePage';
import {applyWaitingUpdate,getOfflineStatus,initializeOfflineSupport,subscribeOffline} from '../../core/offline';
import {browserStoragePort,getPersistenceStatus,subscribePersistence} from '../../core/unified-persistence';
import {BOARD_LAB_ROUTE,CAPTURE_GAME_ROUTE,CAPTURE_LAB_ROUTE,COOPERATIVE_ROUTE,EXPERIMENT_BOARD_ROUTE,FILE_EXCHANGE_ROUTE,FULL_GAME_ROUTE,FREE_PLAY_ROUTE,ONLINE_PLAY_ROUTE,HOME_ROUTE,LIBERTY_LAB_ROUTE,LIFE_LAB_ROUTE,moduleRegistry,OFFLINE_DATA_ROUTE,PUZZLE_ROUTE,ROUTE_ROUTE,stageRoute,TEACHER_EDITOR_ROUTE,TEACHER_ROUTE,TERRITORY_ROUTE,currentHashRoute} from './registry';
import {browserLearningProgressStore,emptyLearningProgress,recordVisit,setStageMark} from './progress';
import {STAGES,stageBoard,type StageDefinition} from './stages';
import type {LearningProgress,ProgressIssue,StageId,StageMark} from './types';
import './LearningHub.css';

const emptyBoard=(size:5|9):StoneValue[][]=>Array.from({length:size},()=>Array<StoneValue>(size).fill(null));

function useHashRoute(){
  const [route,setRoute]=useState(()=>currentHashRoute(window.location.hash));
  useEffect(()=>{const update=()=>setRoute(currentHashRoute(window.location.hash));window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update);},[]);
  return route;
}

function NavLink({route,children,className}:{route:string;children:React.ReactNode;className?:string}){
  return <a className={className} href={route}>{children}</a>;
}

function DeviceNotice({onClear,confirming,setConfirming}:{onClear:()=>void;confirming:boolean;setConfirming:(value:boolean)=>void}){
  return <section className="device-notice" aria-label="本机记录说明">
    <span className="notice-icon" aria-hidden="true">i</span>
    <p><strong>这是社团学习工具。</strong>学习记录只保存在当前设备，可随时清除；无需账号，也不会默认上传到网络。选择联机房间后，仅同步房间昵称、棋局和连接状态。</p>
    {confirming?<div className="clear-confirm" role="group" aria-label="确认清除本机学习记录"><span>只清除访问与自选标记，不删除随项目提供的内容。</span><button type="button" className="danger-button" onClick={onClear}>确认清除</button><button type="button" className="quiet-button" onClick={()=>setConfirming(false)}>取消</button></div>:<button type="button" className="quiet-button" onClick={()=>setConfirming(true)}>清除本机进度</button>}
  </section>;
}

function EntryCard({kind,title,description,available,route=stageRoute(1)}:{kind:'beginner'|'partner'|'puzzle';title:string;description:string;available:boolean;route?:string}){
  return <article className={`entry-card entry-${kind}${available?' available':' unavailable'}`}>
    <div className="entry-symbol" aria-hidden="true">{kind==='beginner'?'交':kind==='partner'?'双':'题'}</div>
    <div><h3>{title}</h3><p>{description}</p></div>
    {available?<NavLink className="primary-link" route={route}>{kind==='partner'?'开始对弈':'开始学习'} <span aria-hidden="true">→</span></NavLink>:<div className="recovery-actions" aria-label={`${title}的当前可用选择`}><NavLink route={ROUTE_ROUTE}>浏览学习路线</NavLink><NavLink route={BOARD_LAB_ROUTE}>打开棋盘练习</NavLink></div>}
    {!available&&<p className="availability-note">正式模块尚未安装；以上链接均可使用。</p>}
  </article>;
}

function ProgressSummary({progress}:{progress:LearningProgress}){
  const recent=progress.recentModuleId?moduleRegistry.getById(progress.recentModuleId):undefined;
  const recentResolution=recent?moduleRegistry.resolve(recent.route):null;
  const marks=[...Object.values(progress.stageMarks),...advancedLessons.map(lesson=>progress.advancedLessons?.[lessonKey(lesson)]?.selfMark)];
  const learned=marks.filter(mark=>mark==='learned').length;
  const practice=marks.filter(mark=>mark==='practice').length;
  return <section className="progress-summary" aria-labelledby="progress-heading">
    <div><h2 id="progress-heading">我的学习</h2><p>这些标记只帮助你在本设备上找回位置，不构成参与资格或成绩。</p></div>
    <dl><div><dt>已访问</dt><dd>{progress.visitedModuleIds.length} 个学习位置</dd></div><div><dt>我会了</dt><dd>{learned} 个自选标记</dd></div><div><dt>还想练习</dt><dd>{practice} 个自选标记</dd></div></dl>
    {recent&&recentResolution?.ok?<NavLink className="continue-link" route={recent.route}>继续上次：{recent.label} <span aria-hidden="true">→</span></NavLink>:<p className="empty-progress">打开任一阶段后，这里会出现“继续上次”。</p>}
  </section>;
}

function HomePage({progress,onClear,confirming,setConfirming}:{progress:LearningProgress;onClear:()=>void;confirming:boolean;setConfirming:(value:boolean)=>void}){
  const onlineAvailable=Boolean(onlineConnectionConfig(location.href,import.meta.env.VITE_ONLINE_SERVER_URL,import.meta.env.VITE_ONLINE_SITE_ORIGIN).endpoint);
  return <>
    <section className="hub-hero">
      <div><h1>一起落子，慢慢思考</h1><p>从认识棋盘开始，或按自己的经验直接浏览后面的主题。路线是建议，不是门槛。</p><NavLink className="text-link" route={ROUTE_ROUTE}>查看学习路线 · 入门与进阶</NavLink></div>
      <div className="hero-board" aria-hidden="true"><div className="hero-grid"/><i className="hero-stone black"/><i className="hero-stone white"/></div>
    </section>
    <DeviceNotice onClear={onClear} confirming={confirming} setConfirming={setConfirming}/>
    <section className="start-section" aria-labelledby="start-heading"><div className="section-title"><h2 id="start-heading">从这里开始</h2><p>选择一个入口，按照自己的节奏活动。</p></div><div className="entry-list">
      <EntryCard kind="beginner" title="我第一次接触围棋" description="从完整5路棋形开始，在气实验室选棋块、圈点或先猜再验证。" available route={LIBERTY_LAB_ROUTE}/>
      <EntryCard kind="partner" title="我想找个伙伴玩" description="两人自由对弈，可选5、9、13、19路；终局确认后自动数子并判定胜负。" available route={FREE_PLAY_ROUTE}/>
      <EntryCard kind="puzzle" title="我想尝试一道题" description="从六类正式题中自选；可查看分层提示，也可保留未知合法手继续讨论。" available route={PUZZLE_ROUTE}/>
    </div></section>
    <section className="route-preview" aria-labelledby="route-preview-title"><div className="section-title inline"><div><h2 id="route-preview-title">学习路线</h2><p>十二个阶段都能直接打开；当前页面不会锁住后续主题。</p></div><NavLink route={ROUTE_ROUTE}>查看完整路线</NavLink></div><ol>{STAGES.map(stage=><li key={stage.id} className={progress.visitedModuleIds.includes(`stage-${String(stage.number).padStart(2,'0')}-guide`)?'visited':''}><span>{stage.number}</span><NavLink route={stageRoute(stage.number)}><strong>{stage.title}</strong><small>{stage.goal}</small></NavLink></li>)}</ol></section>
    <section className="online-invitation"><div><strong>{onlineAvailable?'各用一台设备，也能下一局':'联机对弈 · 服务待接入'}</strong><p>{onlineAvailable?'创建房间并分享房间码；另一位伙伴打开同一网址后加入，无需注册。':'当前可直接同屏对弈。房间服务器接入后，可各用一台设备下棋。'}</p></div><NavLink className="outline-link" route={ONLINE_PLAY_ROUTE}>{onlineAvailable?'创建或加入联机房间':'查看联机服务说明'}</NavLink></section><ProgressSummary progress={progress}/>
    <section className="teacher-teaser" aria-labelledby="teacher-teaser-title"><div><h2 id="teacher-teaser-title">教师视图</h2><p>打开今日活动、可选45分钟安排和投影显示。当前只列已可用的入口。</p></div><NavLink className="outline-link" route={TEACHER_ROUTE}>进入教师视图</NavLink></section>
  </>;
}

function StagePreview({stage,visited,mark:storedMark,lessonProgress}:{stage:StageDefinition;visited:boolean;mark:StageMark|undefined;lessonProgress?:LessonProgress}){
  const mark=stage.number<7||lessonProgress?.selfMarkRevision===lessonByNumber(stage.number)?.revision?storedMark:undefined;
  return <article className="stage-row" data-stage-id={stage.id}>
    <div className="stage-number" aria-hidden="true">{stage.number}</div>
    <div className="stage-copy"><div className="stage-heading"><h2>{stage.title}</h2>{stage.number>=7?<span className="visited-label">{learningStatus(lessonByNumber(stage.number)!,lessonProgress,mark)}</span>:visited&&<span className="visited-label">已访问</span>}</div><p className="stage-goal"><strong>短目标：</strong>{stage.goal}</p><p><strong>动手：</strong>{stage.action}</p><p className="stage-status">{stage.number>=7?stage.formalModule:stage.number===1?'气实验室已可用；可先预测再显示答案。':stage.number===2?'提子实验室与同屏双人吃子小游戏均已可用。':stage.number===3?'完整9、13、19路同屏对弈已可用。':'互动挑战题已接入；可按类别与文字难度自由选题。'}</p><NavLink className="primary-link" route={stageRoute(stage.number)}>{stage.number>=7?'开始本课':'查看阶段'} <span aria-hidden="true">→</span></NavLink>{mark&&<span className="current-mark">你的标记：{mark==='learned'?'我会了':'还想练习'}</span>}</div>
    <div className="stage-board"><Board size={stage.size} board={stageBoard(stage)} label={`${stage.title}示例棋形，完整${stage.size}路棋盘`} mode="readonly" selected={null} onSelect={()=>{}} showCoordinates={false} zoom={.75}/></div>
  </article>;
}

function RoutePage({progress}:{progress:LearningProgress}){
  return <><section className="page-intro"><p><NavLink route={HOME_ROUTE}>← 返回学习入口</NavLink></p><h1>十二课学习路线</h1><p>你可以跳过已经熟悉的内容、直接打开任何阶段，或直接进入棋盘练习。这里没有解锁条件，也不按完成速度排名。</p></section><nav className="route-shortcuts" aria-label="路线快速跳转">{STAGES.map(stage=><NavLink key={stage.id} route={stageRoute(stage.number)}>{stage.number}. {stage.title}</NavLink>)}</nav><section className="stage-list" aria-label="入门与进阶十二课路线"><div className="adv-route-divider"><h2>入门篇 · 从规则到初次实战</h2><p>课程1–6：落子、提子、完整对弈、连接与基础死活。</p></div>{STAGES.map(stage=><Fragment key={stage.id}>{stage.number===7&&<div className="adv-route-divider"><h2>进阶篇 · 从“会下”到“会判断”</h2><p>开始学习棋形、手筋、攻防与全局判断。课程7–12同样可自由跳转。</p></div>}<StagePreview stage={stage} visited={progress.visitedModuleIds.includes(`stage-${String(stage.number).padStart(2,'0')}-guide`)} mark={stage.number>=7?progress.advancedLessons?.[lessonKey(lessonByNumber(stage.number)!)]?.selfMark:progress.stageMarks[stage.id]} lessonProgress={stage.number>=7?progress.advancedLessons?.[lessonKey(lessonByNumber(stage.number)!)]:undefined}/></Fragment>)}</section><aside className="route-direct"><h2>想直接动手？</h2><p>自由实验棋盘已可用，可摆设教学棋形，验证后再按规则试下。</p><NavLink className="primary-link" route={EXPERIMENT_BOARD_ROUTE}>打开自由实验棋盘</NavLink></aside></>;
}

function StagePage({stage,progress,onMark}:{stage:StageDefinition;progress:LearningProgress;onMark:(id:StageId,mark:StageMark|null)=>void}){
  const current=progress.stageMarks[stage.id];
  const markers:BoardMarker[]=stage.id==='STAGE-01'?[{markerId:'target',kind:'target',at:{row:2,col:2},label:'目标黑子'},...[[1,2],[2,1],[2,3],[3,2]].map(([row,col],index)=>({markerId:`liberty-${index+1}`,kind:'liberty' as const,at:{row,col},label:`第${index+1}口气`}))]:[];
  const activityRoute=stage.number===1?LIBERTY_LAB_ROUTE:stage.number===2?CAPTURE_LAB_ROUTE:stage.number===3?TERRITORY_ROUTE:stage.number===5?LIFE_LAB_ROUTE:stage.number===6?COOPERATIVE_ROUTE:stage.number>=4?PUZZLE_ROUTE:BOARD_LAB_ROUTE;
  const activityLabel=stage.number===1?'进入气实验室':stage.number===2?'进入提子实验室':stage.number===3?'进入围地与面积数子':stage.number===5?'进入眼与死活小课':stage.number===6?'进入同伴合作挑战':'打开互动挑战题';
  return <><section className="page-intro"><p><NavLink route={ROUTE_ROUTE}>← 返回学习路线</NavLink></p><h1>{stage.number}. {stage.title}</h1><p>{stage.goal}</p></section><section className="stage-detail"><div className="stage-detail-board"><Board size={stage.size} board={stageBoard(stage)} label={`${stage.title}阶段示例，完整${stage.size}路棋盘`} mode="readonly" selected={null} onSelect={()=>{}} markers={markers} showCoordinates zoom={1}/></div><div className="stage-detail-copy"><h2>这一步做什么</h2><p>{stage.action}</p><h3>可以观察什么</h3><p>{stage.readiness}</p><div className="split-guidance"><div><strong>刚开始</strong><span>{stage.beginner}</span></div><div><strong>已有经验</strong><span>{stage.experienced}</span></div></div><div className="formal-status"><strong>当前可用范围</strong><p>{stage.formalModule}</p></div><NavLink className="primary-link" route={activityRoute}>{activityLabel}</NavLink>{stage.number===2&&<NavLink className="outline-link" route={CAPTURE_GAME_ROUTE}>开始双人吃子小游戏</NavLink>}{stage.number===3&&<NavLink className="outline-link" route={FULL_GAME_ROUTE}>开始完整小棋盘对弈</NavLink>}</div></section><section className="self-mark" aria-labelledby="self-mark-title"><div><h2 id="self-mark-title">给自己留个标记</h2><p>随时可改，不影响能否打开其他阶段。</p></div><div role="group" aria-label={`${stage.title}学习标记`}><button type="button" aria-pressed={current==='learned'} onClick={()=>onMark(stage.id,current==='learned'?null:'learned')}>我会了</button><button type="button" aria-pressed={current==='practice'} onClick={()=>onMark(stage.id,current==='practice'?null:'practice')}>还想练习</button></div></section></>;
}

function TeacherPage({projector,setProjector}:{projector:boolean;setProjector:(value:boolean)=>void}){
  const [showPlan,setShowPlan]=useState(false);
  return <><section className="page-intro teacher-intro"><p><NavLink route={HOME_ROUTE}>← 返回学习入口</NavLink></p><h1>教师视图</h1><p>用于选择今天可实际打开的活动和教学安排。学校人数、设备与现场条件仍需按实际情况调整。</p></section><section className="teacher-controls"><div><h2>今日活动</h2><p>目前可用的是活动反馈与迭代记录、离线与本机数据、文件交接与棋盘图、教师出题编辑器、围地数子、同伴合作挑战、眼与基础死活小课、互动挑战题、气实验室、提子实验室、吃子小游戏、完整小棋盘对弈、自由实验棋盘、阶段说明和十二课路线。</p><div className="teacher-actions"><NavLink className="outline-link" route={FREE_PLAY_ROUTE}>自由双人对弈</NavLink><NavLink className="outline-link" route="#/teacher/evidence">查看反馈与资源迭代</NavLink><NavLink className="outline-link" route="#/feedback">打开可跳过反馈表</NavLink><NavLink className="primary-link" route={OFFLINE_DATA_ROUTE}>准备离线与备份</NavLink><NavLink className="outline-link" route={FILE_EXCHANGE_ROUTE}>打开文件交接与棋盘图</NavLink><NavLink className="outline-link" route={TEACHER_EDITOR_ROUTE}>打开教师出题编辑器</NavLink><NavLink className="outline-link" route={TERRITORY_ROUTE}>打开围地与面积数子</NavLink><NavLink className="outline-link" route={COOPERATIVE_ROUTE}>打开同伴合作挑战</NavLink><NavLink className="outline-link" route={LIFE_LAB_ROUTE}>打开眼与死活小课</NavLink><NavLink className="outline-link" route={PUZZLE_ROUTE}>打开互动挑战题</NavLink><NavLink className="outline-link" route={FULL_GAME_ROUTE}>开始完整小棋盘对弈</NavLink><NavLink className="outline-link" route={CAPTURE_GAME_ROUTE}>开始双人吃子小游戏</NavLink><NavLink className="outline-link" route={LIBERTY_LAB_ROUTE}>打开气实验室</NavLink><NavLink className="outline-link" route={CAPTURE_LAB_ROUTE}>打开提子实验室</NavLink><NavLink className="outline-link" route={EXPERIMENT_BOARD_ROUTE}>打开自由实验棋盘</NavLink><NavLink className="outline-link" route={BOARD_LAB_ROUTE}>打开组件棋盘练习</NavLink></div></div><label className="projector-control"><input type="checkbox" checked={projector} onChange={event=>setProjector(event.target.checked)}/><span><strong>投影模式</strong><small>放大标题、操作与状态文字。</small></span></label></section><section className="lesson-plan"><div><h2>可选 45 分钟活动安排</h2><p>这是可调整建议，不代表学校已经采用。</p></div><button type="button" className="outline-button" aria-expanded={showPlan} onClick={()=>setShowPlan(value=>!value)}>{showPlan?'收起安排':'查看安排'}</button>{showPlan&&<ol><li><time>5分钟</time><span>选择开放题和角色</span></li><li><time>10分钟</time><span>伙伴 A 提出计划与理由</span></li><li><time>10分钟</time><span>伙伴 B 找回应并说明依据</span></li><li><time>15分钟</time><span>交换角色、共同修订并按需查看参考</span></li><li><time>5分钟</time><span>进入对弈或保存匿名记录</span></li></ol>}<p className="future-note">这是可调整的教学安排，不代表学校已经采用。</p></section></>;
}

function RecoveryPage({reason,label}:{reason:'not-found'|'not-installed'|'missing-content';label?:string}){
  const title=reason==='not-found'?'没有找到这个页面':reason==='not-installed'?`${label??'该模块'}尚未安装`:`${label??'该模块'}缺少所需内容`;
  return <section className="recovery-page"><div className="recovery-symbol" aria-hidden="true">↩</div><h1>{title}</h1><p>{reason==='missing-content'?'项目仍可运行；请返回路线选择当前可用内容。':'这个地址目前不能作为可用活动打开。'}</p><div><NavLink className="primary-link" route={ROUTE_ROUTE}>返回学习路线</NavLink><NavLink className="outline-link" route={HOME_ROUTE}>返回学习入口</NavLink></div></section>;
}

export function LearningHubApp(){
  const route=useHashRoute();
  const resolution=moduleRegistry.resolve(route);
  const store=useMemo(()=>{try{return browserLearningProgressStore();}catch{return null;}},[]);
  const loaded=useMemo(()=>store?.load()??{ok:false as const,issue:{code:'STORAGE_UNAVAILABLE' as const,message:'本机学习记录暂时不可用；你仍可继续浏览。'},fallback:emptyLearningProgress()},[store]);
  const [progress,setProgress]=useState<LearningProgress>(loaded.ok?loaded.value:loaded.fallback);
  const [issue,setIssue]=useState<ProgressIssue|null>(loaded.ok?null:loaded.issue);
  const [confirmingClear,setConfirmingClear]=useState(false);
  const settingsPort=useMemo(()=>browserStoragePort(),[]);
  const [projector,setProjectorState]=useState(()=>{try{return JSON.parse(settingsPort.getItem('go-club:settings:v1')??'{}').projector===true;}catch{return false;}});
  const [offline,setOffline]=useState(getOfflineStatus);
  const [persistence,setPersistence]=useState(getPersistenceStatus);
  const setProjector=(value:boolean)=>{setProjectorState(value);try{settingsPort.setItem('go-club:settings:v1',JSON.stringify({schemaVersion:1,id:'LOCAL-APP-SETTINGS',revision:1,rulesetId:'GO-CLUB-AREA-1',projector:value}));}catch{/* status subscriber reports async failures */}};

  useEffect(()=>{const stopOffline=subscribeOffline(setOffline),stopPersistence=subscribePersistence(setPersistence);void initializeOfflineSupport();return()=>{stopOffline();stopPersistence();};},[]);

  useEffect(()=>{
    if(!resolution.ok||!resolution.module.trackVisit)return;
    setProgress(previous=>{
      const next=recordVisit(previous,resolution.module.id);
      if(next===previous)return previous;
      const saved=store?.save(next);
      if(saved&&!saved.ok)setIssue(saved.issue);
      return next;
    });
    requestAnimationFrame(()=>{window.scrollTo({top:0,behavior:'auto'});document.getElementById('main')?.focus({preventScroll:true});});
  },[resolution.ok?resolution.module.id:route,store]);

  const changeMark=(stageId:StageId,mark:StageMark|null)=>setProgress(previous=>{const next=setStageMark(previous,stageId,mark);const saved=store?.save(next);if(saved&&!saved.ok)setIssue(saved.issue);return next;});
  const changeLesson=(lesson:CourseLesson,update:(p:LessonProgress)=>LessonProgress)=>setProgress(previous=>{const key=lessonKey(lesson);const old=previous.advancedLessons?.[key]??emptyLessonProgress(lesson.revision);const value=update(old);if(value===old)return previous;const next={...previous,revision:previous.revision+1,advancedLessons:{...previous.advancedLessons,[key]:value}};const saved=store?.save(next);if(saved&&!saved.ok)setIssue(saved.issue);return next;});
  const changeAdvancedMark=(lesson:CourseLesson,mark:StageMark|null)=>setProgress(previous=>{const key=lessonKey(lesson),old=previous.advancedLessons?.[key]??emptyLessonProgress(lesson.revision);const next={...previous,revision:previous.revision+1,advancedLessons:{...previous.advancedLessons,[key]:{...old,selfMark:mark??undefined,selfMarkRevision:lesson.revision}}};const saved=store?.save(next);if(saved&&!saved.ok)setIssue(saved.issue);return next;});
  const clearProgress=()=>{const result=store?.clear();setProgress(emptyLearningProgress());setConfirmingClear(false);setIssue(result&&!result.ok?result.issue:null);};
  const active=resolution.ok?resolution.module.id:null;
  const stage=route.startsWith('#/route/STAGE-')?STAGES.find(item=>stageRoute(item.number)===route):undefined;

  let content:React.ReactNode;
  if(!resolution.ok)content=<RecoveryPage reason={resolution.reason} label={resolution.module?.label}/>;
  else if(active==='learning-hub')content=<HomePage progress={progress} onClear={clearProgress} confirming={confirmingClear} setConfirming={setConfirmingClear}/>;
  else if(active==='learning-route')content=<RoutePage progress={progress}/>;
  else if(active==='teacher-view')content=<TeacherPage projector={projector} setProjector={setProjector}/>;
  else if(active==='board-lab')content=<BoardLab/>;
  else if(active==='liberty-lab')content=<LibertyLab projector={projector}/>;
  else if(active==='capture-lab')content=<CaptureLab projector={projector}/>;
  else if(active==='capture-game')content=<CaptureGame projector={projector}/>;
  else if(active==='full-game'||active==='free-play')content=<FullGame projector={projector} freePlay={active==='free-play'}/>;
  else if(active==='online-play')content=<OnlineGame projector={projector}/>;
  else if(active==='experiment-board')content=<ExperimentBoard projector={projector}/>;
  else if(active==='life-lab')content=<LifeLab/>;
  else if(active==='cooperative-challenge')content=<CooperativeChallenge/>;
  else if(active==='territory-trainer')content=<TerritoryTrainer projector={projector}/>;
  else if(active==='teacher-editor')content=<TeacherEditor/>;
  else if(active==='file-exchange')content=<FileExchange/>;
  else if(active==='offline-data')content=<OfflineData/>;
  else if(active==='member-feedback')content=<EvidencePage/>;
  else if(active==='evidence-log')content=<EvidencePage teacher/>;
  else if(active==='puzzle-runner'||active==='puzzle-runner-legacy')content=<PuzzleRunner/>;
  else if(stage&&stage.number>=7){const lesson=lessonByNumber(stage.number)!;content=<AdvancedLesson key={lesson.id} lesson={lesson} progress={progress.advancedLessons?.[lessonKey(lesson)]??emptyLessonProgress(lesson.revision)} onUpdate={update=>changeLesson(lesson,update)} mark={progress.advancedLessons?.[lessonKey(lesson)]?.selfMarkRevision===lesson.revision?progress.advancedLessons?.[lessonKey(lesson)]?.selfMark:undefined} onMark={m=>changeAdvancedMark(lesson,m)} projector={projector}/>;}
  else if(stage)content=<StagePage stage={stage} progress={progress} onMark={changeMark}/>;
  else content=<RecoveryPage reason="not-found"/>;

  return <div className={`learning-app${projector?' app-projector':''}`}><a className="skip-link" href="#main">跳到主要内容</a><header className="hub-header"><NavLink className="hub-brand" route={HOME_ROUTE}>围棋社 <span>Go Club</span></NavLink><nav aria-label="主要导航"><NavLink className={active==='learning-hub'?'active':undefined} route={HOME_ROUTE}>学习入口</NavLink><NavLink className={active==='free-play'?'active':undefined} route={FREE_PLAY_ROUTE}>双人对弈</NavLink><NavLink className={active==='online-play'?'active':undefined} route={ONLINE_PLAY_ROUTE}>联机对弈</NavLink><NavLink className={active==='learning-route'||active==='liberty-lab'||active==='capture-lab'||active==='capture-game'||active==='full-game'||active==='experiment-board'||active==='life-lab'||active==='cooperative-challenge'||active==='territory-trainer'||active==='puzzle-runner'||active==='puzzle-runner-legacy'||stage?'active':undefined} route={ROUTE_ROUTE}>学习路线</NavLink><NavLink className={active==='teacher-view'||active==='teacher-editor'||active==='file-exchange'||active==='offline-data'||active==='evidence-log'?'active':undefined} route={TEACHER_ROUTE}>教师视图</NavLink></nav><label className="header-projector"><input type="checkbox" checked={projector} onChange={event=>setProjector(event.target.checked)}/><span>投影模式</span></label></header>{offline.updateWaiting&&<div className="update-banner" role="alert"><span>新版本已准备好；不会强制刷新。</span><button type="button" onClick={async()=>{const result=await applyWaitingUpdate();if(!result.ok)setIssue({code:'STORAGE_UNAVAILABLE',message:result.message});}}>保存已提交内容并应用</button><NavLink route={OFFLINE_DATA_ROUTE}>查看详情</NavLink></div>}{(issue||persistence.lastError)&&<div className="storage-message" role="status"><span>{issue?.message??`本机写入失败：${persistence.lastError}。当前页面内容仍保留，可先导出备份。`}</span><button type="button" onClick={()=>setIssue(null)}>知道了</button><NavLink route={OFFLINE_DATA_ROUTE}>打开恢复工具</NavLink></div>}<main id="main" tabIndex={-1}>{content}</main><footer><NavLink route="#/feedback">活动结束：可跳过的半分钟反馈</NavLink><br/>默认按{projectConfig.assumedAudience}、每次约{projectConfig.assumedSessionMinutes}分钟、{projectConfig.assumedPlayersPerBoard}人共用棋盘规划；这些是可调整的规划假设。<br/><span className="app-version">版本 {APP_VERSION}</span></footer></div>;
}

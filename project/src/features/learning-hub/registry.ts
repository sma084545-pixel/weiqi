import type {ModuleRegistration,ModuleRegistry,RouteResolution} from './types';

export const HOME_ROUTE='#/home' as const;
export const ROUTE_ROUTE='#/route' as const;
export const TEACHER_ROUTE='#/teacher' as const;
export const BOARD_LAB_ROUTE='#/board-lab' as const;
export const LIBERTY_LAB_ROUTE='#/learn/liberties' as const;
export const CAPTURE_LAB_ROUTE='#/learn/captures' as const;
export const CAPTURE_GAME_ROUTE='#/play/partner' as const;
export const EXPERIMENT_BOARD_ROUTE='#/board/experiment' as const;
export const FULL_GAME_ROUTE='#/play/full-game' as const;
export const FREE_PLAY_ROUTE='#/play/free' as const;
export const ONLINE_PLAY_ROUTE='#/play/online' as const;
export const PUZZLE_ROUTE='#/challenges' as const;
export const LIFE_LAB_ROUTE='#/learn/life' as const;
export const COOPERATIVE_ROUTE='#/challenges/together' as const;
export const TERRITORY_ROUTE='#/learn/territory' as const;
export const TEACHER_EDITOR_ROUTE='#/teacher/editor' as const;
export const FILE_EXCHANGE_ROUTE='#/teacher/file-exchange' as const;
export const OFFLINE_DATA_ROUTE='#/teacher/offline-data' as const;
export const FEEDBACK_ROUTE='#/feedback' as const;
export const EVIDENCE_ROUTE='#/teacher/evidence' as const;
export const LEGACY_PUZZLE_ROUTE='#/challenge/try-one' as const;

export const stageRoute=(number:number)=>`#/route/STAGE-${String(number).padStart(2,'0')}` as const;

export const MODULE_DEFINITIONS:readonly ModuleRegistration[]=[
  {id:'member-feedback',route:FEEDBACK_ROUTE,label:'可跳过的活动反馈',requiredContentIds:[],availability:'available',returnRoute:HOME_ROUTE,trackVisit:false},
  {id:'evidence-log',route:EVIDENCE_ROUTE,label:'反馈与资源迭代',requiredContentIds:[],availability:'available',returnRoute:TEACHER_ROUTE,trackVisit:false},
  {id:'learning-hub',route:HOME_ROUTE,label:'学习入口',requiredContentIds:[],availability:'available',returnRoute:HOME_ROUTE,trackVisit:false},
  {id:'learning-route',route:ROUTE_ROUTE,label:'学习路线',requiredContentIds:[],availability:'available',returnRoute:HOME_ROUTE,trackVisit:false},
  {id:'stage-01-guide',route:stageRoute(1),label:'从交叉点开始',requiredContentIds:['DEV-LESSON-001','DEV-LIB-001'],availability:'available',returnRoute:ROUTE_ROUTE,trackVisit:true},
  {id:'stage-02-guide',route:stageRoute(2),label:'打吃、提子与吃子小游戏',requiredContentIds:[],availability:'available',returnRoute:ROUTE_ROUTE,trackVisit:true},
  {id:'stage-03-guide',route:stageRoute(3),label:'完成一盘9路',requiredContentIds:[],availability:'available',returnRoute:ROUTE_ROUTE,trackVisit:true},
  {id:'stage-04-guide',route:stageRoute(4),label:'连接与切断',requiredContentIds:[],availability:'available',returnRoute:ROUTE_ROUTE,trackVisit:true},
  {id:'stage-05-guide',route:stageRoute(5),label:'眼与基础死活',requiredContentIds:[],availability:'available',returnRoute:ROUTE_ROUTE,trackVisit:true},
  {id:'stage-06-guide',route:stageRoute(6),label:'自选挑战与13路',requiredContentIds:[],availability:'available',returnRoute:ROUTE_ROUTE,trackVisit:true},
  {id:'board-lab',route:BOARD_LAB_ROUTE,label:'互动棋盘练习',requiredContentIds:[],availability:'available',returnRoute:HOME_ROUTE,trackVisit:true},
  {id:'liberty-lab',route:LIBERTY_LAB_ROUTE,label:'气实验室',requiredContentIds:['DEMO-LIB-001','DEMO-LIB-002','DEMO-LIB-003','DEMO-LIB-004','DEMO-LIB-005','DEMO-LIB-006','DEMO-LIB-007','DEMO-LIB-008'],availability:'available',returnRoute:stageRoute(1),trackVisit:true},
  {id:'teacher-view',route:TEACHER_ROUTE,label:'教师视图',requiredContentIds:[],availability:'available',returnRoute:HOME_ROUTE,trackVisit:false},
  {id:'capture-lab',route:CAPTURE_LAB_ROUTE,label:'提子实验室',requiredContentIds:['DEMO-CAP-001','DEMO-CAP-002','DEMO-CAP-003','DEMO-CAP-004','DEMO-CAP-005','DEMO-CAP-006'],availability:'available',returnRoute:stageRoute(2),trackVisit:true},
  {id:'experiment-board',route:EXPERIMENT_BOARD_ROUTE,label:'自由实验棋盘',requiredContentIds:[],availability:'available',returnRoute:ROUTE_ROUTE,trackVisit:true},
  {id:'capture-game',route:CAPTURE_GAME_ROUTE,label:'同屏双人吃子小游戏',requiredContentIds:[],availability:'available',returnRoute:stageRoute(2),trackVisit:true},
  {id:'free-play',route:FREE_PLAY_ROUTE,label:'自由双人对弈',requiredContentIds:[],availability:'available',returnRoute:HOME_ROUTE,trackVisit:true},
  {id:'online-play',route:ONLINE_PLAY_ROUTE,label:'联机双人对弈',requiredContentIds:[],availability:'available',returnRoute:HOME_ROUTE,trackVisit:true,requiresNetwork:true},
  {id:'full-game',route:FULL_GAME_ROUTE,label:'完整小棋盘对弈',requiredContentIds:[],availability:'available',returnRoute:stageRoute(3),trackVisit:true},
  {id:'puzzle-runner',route:PUZZLE_ROUTE,label:'互动挑战题',requiredContentIds:['T09-BUNDLE'],availability:'available',returnRoute:ROUTE_ROUTE,trackVisit:true},
  {id:'life-lab',route:LIFE_LAB_ROUTE,label:'眼与基础死活小课',requiredContentIds:['LIFE-001','LIFE-002','LIFE-003','LIFE-004','LIFE-005'],availability:'available',returnRoute:stageRoute(5),trackVisit:true},
  {id:'cooperative-challenge',route:COOPERATIVE_ROUTE,label:'同伴合作挑战',requiredContentIds:['DISC-001','DISC-002','DISC-003','DISC-004','DISC-005','CON-001','CON-003'],availability:'available',returnRoute:stageRoute(6),trackVisit:true},
  {id:'territory-trainer',route:TERRITORY_ROUTE,label:'围地与面积数子',requiredContentIds:['END-001','END-002','END-003','END-004','END-005','END-006'],availability:'available',returnRoute:stageRoute(3),trackVisit:true},
  {id:'teacher-editor',route:TEACHER_EDITOR_ROUTE,label:'教师出题编辑器',requiredContentIds:['T14-TEMPLATE-BUNDLE'],availability:'available',returnRoute:TEACHER_ROUTE,trackVisit:false},
  {id:'file-exchange',route:FILE_EXCHANGE_ROUTE,label:'JSON、SGF 与棋盘图',requiredContentIds:[],availability:'available',returnRoute:TEACHER_ROUTE,trackVisit:false},
  {id:'offline-data',route:OFFLINE_DATA_ROUTE,label:'离线与本机数据',requiredContentIds:[],availability:'available',returnRoute:TEACHER_ROUTE,trackVisit:false},
  {id:'puzzle-runner-legacy',route:LEGACY_PUZZLE_ROUTE,label:'互动挑战题（兼容入口）',requiredContentIds:['T09-BUNDLE'],availability:'available',returnRoute:PUZZLE_ROUTE,trackVisit:false},
];

export const INSTALLED_CONTENT_IDS=new Set(['DEV-LESSON-001','DEV-LIB-001','DEMO-LIB-001','DEMO-LIB-002','DEMO-LIB-003','DEMO-LIB-004','DEMO-LIB-005','DEMO-LIB-006','DEMO-LIB-007','DEMO-LIB-008','DEMO-CAP-001','DEMO-CAP-002','DEMO-CAP-003','DEMO-CAP-004','DEMO-CAP-005','DEMO-CAP-006','T09-BUNDLE','LIFE-001','LIFE-002','LIFE-003','LIFE-004','LIFE-005','DISC-001','DISC-002','DISC-003','DISC-004','DISC-005','CON-001','CON-003','END-001','END-002','END-003','END-004','END-005','END-006','T14-TEMPLATE-BUNDLE']);

export function createModuleRegistry(definitions:readonly ModuleRegistration[],contentIds:ReadonlySet<string>):ModuleRegistry{
  const ids=new Set<string>(),routes=new Set<string>();
  for(const module of definitions){
    if(ids.has(module.id))throw new Error(`Duplicate module id: ${module.id}`);
    if(routes.has(module.route))throw new Error(`Duplicate module route: ${module.route}`);
    ids.add(module.id);routes.add(module.route);
  }
  const byRoute=new Map(definitions.map(module=>[module.route,module]));
  const byId=new Map(definitions.map(module=>[module.id,module]));
  const resolve=(route:string):RouteResolution=>{
    const module=byRoute.get(route as ModuleRegistration['route']);
    if(!module)return {ok:false,reason:'not-found',requestedRoute:route,fallbackRoute:HOME_ROUTE};
    if(module.availability!=='available')return {ok:false,reason:'not-installed',requestedRoute:route,fallbackRoute:module.returnRoute,module};
    const missing=module.requiredContentIds.filter(id=>!contentIds.has(id));
    if(missing.length)return {ok:false,reason:'missing-content',requestedRoute:route,fallbackRoute:module.returnRoute,module,missingContentIds:missing};
    return {ok:true,module};
  };
  return {modules:definitions,availableModules:definitions.filter(module=>resolve(module.route).ok),resolve,getById:id=>byId.get(id)};
}

export const moduleRegistry=createModuleRegistry(MODULE_DEFINITIONS,INSTALLED_CONTENT_IDS);

export function currentHashRoute(hash:string):string{
  if(hash===''||hash==='#'||hash==='#/')return HOME_ROUTE;
  return hash.startsWith('#/')?hash:HOME_ROUTE;
}

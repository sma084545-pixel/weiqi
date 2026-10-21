import type {Answer,Check,Color,Coord,HumanReview,Move,Position,Puzzle,Size,TreeNode,Validation} from '../../core/content.generated';
import {applyPass,rulesEngine,startGame,tryMove} from '../../core/rules';
import {validateContent,type ValidationIssue} from '../../core/validation';

export type DraftLifecycle='draft'|'published'|'deleted';
export type DraftOrigin={kind:'blank'|'template'|'official'|'local';sourceId:string|null;sourceRevision:number|null};
export interface DraftEntry{
  entryId:string;
  title:string;
  learningGoal:string;
  puzzle:Puzzle;
  lifecycle:DraftLifecycle;
  origin:DraftOrigin;
  solutionCheckMethod:string;
  numberAnswerText:string;
  solutionCheckConfirmed:boolean;
  humanReviewSelfReported:boolean;
  humanReviewer:string;
  humanReviewScope:string;
  updatedAt:string;
}
export interface DraftWorkspace{
  schemaVersion:1;
  id:'LOCAL-T14-WORKSPACE';
  revision:number;
  rulesetId:'GO-CLUB-AREA-1';
  kind:'TeacherDraftWorkspace';
  entries:DraftEntry[];
}
export interface DraftCheckReport{ok:boolean;structureOk:boolean;setupOk:boolean;movesOk:boolean;issues:ValidationIssue[];note:string}
export type SaveChoice='ask'|'keep-both'|'replace';
export type SaveResult=
  |{ok:true;workspace:DraftWorkspace;entry:DraftEntry;message:string}
  |{ok:false;code:'OFFICIAL_CONFLICT'|'LOCAL_CONFLICT';message:string;conflictingEntry?:DraftEntry};

export const WORKSPACE_ID='LOCAL-T14-WORKSPACE' as const;
export const AUTO_ANSWER_TYPES=new Set<Answer['type']>(['number','point-set','region-labels','reason-choice','move-tree']);
const clone=<T>(value:T):T=>structuredClone(value);
const date=()=>new Date().toISOString().slice(0,10);
const timestamp=()=>new Date().toISOString();
const pointKey=(point:Coord)=>`${point.row},${point.col}`;
const issue=(code:string,path:string,message:string):ValidationIssue=>({code,path,message});

export const emptyWorkspace=():DraftWorkspace=>({schemaVersion:1,id:WORKSPACE_ID,revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'TeacherDraftWorkspace',entries:[]});
export const entryKey=(entry:Pick<DraftEntry,'puzzle'>)=>`${entry.puzzle.id}@${entry.puzzle.revision}`;

function defaultValidation():Validation{return {structure:null,moveLegality:null,solutionChecked:null,externalReferenceChecked:null,modelChecked:null,humanReviewed:null};}
function originalSource(){return {type:'original' as const,title:'本机教师编辑器原创草稿',url:null,accessedAt:null,note:'由使用者在当前设备编写；尚未自动证明解答完备，也不代表人类教师复核。'};}
function freshPosition(size:Size,toPlay:Color,id:string):Position{return {schemaVersion:1,id:`POS-${id}`,revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size,stones:[],toPlay,historyPolicy:'fresh-setup',history:null};}
function defaultAnswer(type:Answer['type']):Answer{
  if(type==='number')return {type,value:0,explanation:''};
  if(type==='point-set')return {type,points:[],explanation:''};
  if(type==='region-labels')return {type,labels:[],explanation:''};
  if(type==='reason-choice')return {type,options:[{optionId:'A',text:'选项 A'},{optionId:'B',text:'选项 B'}],acceptedOptionIds:['A'],explanation:''};
  if(type==='open-text')return {type,criteria:['写出一个具体观察。'],sampleConsiderations:[],automaticVerdict:false};
  return {type,rootNodeId:'root',nodes:[{nodeId:'root',move:null,children:[],outcome:'continue',terminalStatus:null,evidence:[],explanation:'从题目初始局面开始。'}],uncoveredPolicy:'unknown',uniquenessClaim:false,uniquenessEvidence:[]};
}

export function blankDraft(sequence=1):DraftEntry{
  const id=`LOCAL-PUZZLE-${String(sequence).padStart(3,'0')}`;
  const puzzle:Puzzle={schemaVersion:1,id,revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Puzzle',developmentOnly:true,category:'LIB',difficulty:{level:'beginner',rationale:''},prompt:'',initialPosition:freshPosition(5,'B',id),targetMarkers:[],firstPlayer:'B',conditions:{boundary:'full-board',external:'真实完整 5×5 棋盘；这是未知过去的教学起点。',assumptions:['新教学起点，过去劫史未知。'],viewport:null},hints:['','',''],answer:defaultAnswer('number'),coveredBranches:[],sources:[originalSource()],validation:defaultValidation(),relatedContent:[]};
  return {entryId:`draft-${id}-${Date.now()}`,title:'未命名草稿',learningGoal:'',puzzle,lifecycle:'draft',origin:{kind:'blank',sourceId:null,sourceRevision:null},solutionCheckMethod:'',numberAnswerText:'',solutionCheckConfirmed:false,humanReviewSelfReported:false,humanReviewer:'',humanReviewScope:'',updatedAt:timestamp()};
}

export function draftFromPuzzle(puzzle:Puzzle,title:string,origin:DraftOrigin):DraftEntry{
  const next=clone(puzzle);next.developmentOnly=true;
  return {entryId:`draft-${next.id}-${next.revision}-${Date.now()}`,title,learningGoal:next.conditions.assumptions.find(value=>value.startsWith('学习目标：'))?.slice(5)??'',puzzle:next,lifecycle:'draft',origin,solutionCheckMethod:'',numberAnswerText:next.answer.type==='number'?String(next.answer.value):'',solutionCheckConfirmed:false,humanReviewSelfReported:false,humanReviewer:'',humanReviewScope:'',updatedAt:timestamp()};
}

export function copyAsNew(entry:DraftEntry,id:string):DraftEntry{
  const next=clone(entry);next.entryId=`draft-${id}-${Date.now()}`;next.puzzle.id=id;next.puzzle.revision=1;next.puzzle.initialPosition.id=`POS-${id}`;next.puzzle.initialPosition.revision=1;next.lifecycle='draft';next.origin={kind:'local',sourceId:entry.puzzle.id,sourceRevision:entry.puzzle.revision};next.puzzle.validation=defaultValidation();next.solutionCheckConfirmed=false;next.humanReviewSelfReported=false;next.puzzle.validation.humanReviewed=null;next.updatedAt=timestamp();return next;
}

export function createRevision(entry:DraftEntry):DraftEntry{
  const next=clone(entry);next.entryId=`draft-${entry.puzzle.id}-${entry.puzzle.revision+1}-${Date.now()}`;next.puzzle.revision+=1;next.puzzle.initialPosition.revision+=1;next.lifecycle='draft';next.origin={kind:'local',sourceId:entry.puzzle.id,sourceRevision:entry.puzzle.revision};next.puzzle.validation=defaultValidation();next.solutionCheckConfirmed=false;next.humanReviewSelfReported=false;next.puzzle.validation.humanReviewed=null;next.updatedAt=timestamp();return next;
}

export function changeAnswerType(entry:DraftEntry,type:Answer['type']):DraftEntry{
  if(entry.puzzle.answer.type===type)return entry;
  const next=clone(entry);next.puzzle.answer=defaultAnswer(type);next.numberAnswerText=type==='number'?'':'';next.puzzle.coveredBranches=[];next.lifecycle='draft';next.solutionCheckConfirmed=false;next.humanReviewSelfReported=false;next.puzzle.validation=defaultValidation();next.updatedAt=timestamp();return next;
}

export function syncLearningGoal(entry:DraftEntry,goal:string):DraftEntry{
  const next=clone(entry);next.learningGoal=goal;next.solutionCheckConfirmed=false;next.humanReviewSelfReported=false;next.puzzle.validation=defaultValidation();
  const rest=next.puzzle.conditions.assumptions.filter(value=>!value.startsWith('学习目标：'));
  next.puzzle.conditions.assumptions=goal.trim()?[`学习目标：${goal.trim()}`,...rest]:rest;
  next.updatedAt=timestamp();return next;
}

export function setStone(entry:DraftEntry,at:Coord,color:Color|null):DraftEntry{
  const next=clone(entry),size=next.puzzle.initialPosition.size;if(at.row<0||at.col<0||at.row>=size||at.col>=size)return entry;
  next.puzzle.initialPosition.stones=next.puzzle.initialPosition.stones.filter(stone=>stone.row!==at.row||stone.col!==at.col);
  if(color)next.puzzle.initialPosition.stones.push({...at,color});
  if(!color){next.puzzle.targetMarkers=next.puzzle.targetMarkers.map(marker=>({...marker,points:marker.points.filter(point=>pointKey(point)!==pointKey(at))})).filter(marker=>marker.points.length);if(next.puzzle.answer.type==='point-set')next.puzzle.answer.points=next.puzzle.answer.points.filter(point=>pointKey(point)!==pointKey(at));if(next.puzzle.answer.type==='region-labels')next.puzzle.answer.labels=next.puzzle.answer.labels.filter(label=>pointKey(label.at)!==pointKey(at));}
  if(next.puzzle.answer.type==='move-tree')next.puzzle.answer=defaultAnswer('move-tree');
  next.puzzle.coveredBranches=[];next.lifecycle='draft';next.puzzle.validation=defaultValidation();next.solutionCheckConfirmed=false;next.humanReviewSelfReported=false;next.updatedAt=timestamp();return next;
}

export function toggleTarget(entry:DraftEntry,at:Coord):DraftEntry{
  if(!entry.puzzle.initialPosition.stones.some(stone=>pointKey(stone)===pointKey(at)))return entry;
  const next=clone(entry);const marker=next.puzzle.targetMarkers[0]??{markerId:'target-1',type:'target' as const,points:[],label:'目标棋块',owner:null};const exists=marker.points.some(point=>pointKey(point)===pointKey(at));marker.points=exists?marker.points.filter(point=>pointKey(point)!==pointKey(at)):[...marker.points,{...at}];next.puzzle.targetMarkers=marker.points.length?[marker]:[];next.lifecycle='draft';next.puzzle.validation=defaultValidation();next.solutionCheckConfirmed=false;next.humanReviewSelfReported=false;next.updatedAt=timestamp();return next;
}

export function positionBoard(position:Position){const board=Array.from({length:position.size},()=>Array<'B'|'W'|null>(position.size).fill(null));for(const stone of position.stones)board[stone.row][stone.col]=stone.color;return board;}

function replayTree(puzzle:Puzzle):ValidationIssue[]{
  if(puzzle.answer.type!=='move-tree')return [];
  const start=startGame(puzzle.initialPosition,{mode:'full-game',komi:0,gameId:`T14-CHECK-${puzzle.id}`});if(!start.ok)return [issue(start.error.code,'/initialPosition','初始局面不能建立规则历史。')];
  const nodes=new Map(puzzle.answer.nodes.map(node=>[node.nodeId,node]));const root=nodes.get(puzzle.answer.rootNodeId);if(!root)return [issue('TREE_ROOT','/answer/rootNodeId','找不到变化树根节点。')];
  const result:ValidationIssue[]=[];const parents=new Map<string,string>();
  const visit=(node:TreeNode,state:typeof start.value,path:string)=>{for(const childId of node.children){const child=nodes.get(childId);if(!child){result.push(issue('TREE_REFERENCE',`${path}/children`,'分支引用的节点不存在。'));continue;}if(parents.has(childId)&&parents.get(childId)!==node.nodeId){result.push(issue('TREE_MULTIPLE_PARENTS',`${path}/children`,'一个变化节点不能同时属于两个父节点；请复制为独立分支。'));continue;}parents.set(childId,node.nodeId);if(!child.move){result.push(issue('TREE_MOVE',`/answer/nodes/${childId}`,'非根节点必须有一手动作。'));continue;}if(child.move.color!==state.toPlay){result.push(issue('WRONG_TURN',`/answer/nodes/${childId}/move/color`,'变化中的执棋颜色与当前轮次不一致。'));continue;}let transitioned;if(child.move.type==='place')transitioned=tryMove(state,child.move);else if(child.move.type==='pass')transitioned=applyPass(state,child.move.color);else{result.push(issue('TREE_RESIGN_UNSUPPORTED',`/answer/nodes/${childId}/move`,'题目变化编辑器不把认输作为答案分支。'));continue;}if(!transitioned.ok){result.push(issue(transitioned.error.code,`/answer/nodes/${childId}/move`,'该分支着法未通过 GO-CLUB-AREA-1。'));continue;}visit(child,transitioned.value.nextState,`/answer/nodes/${childId}`);}};
  visit(root,start.value,'/answer/root');return result;
}

export function checkDraft(entry:DraftEntry):DraftCheckReport{
  const required:ValidationIssue[]=[];if(entry.puzzle.answer.type==='number'&&!/^(0|[1-9]\d*)$/.test(entry.numberAnswerText.trim()))required.push(issue('REQUIRED_NUMBER','/answer/value','请填写零或正整数答案；空值、小数和负数不能发布。'));if(!entry.title.trim())required.push(issue('REQUIRED_TITLE','/editor/title','请填写便于在题目列表中辨认的标题。'));if(!entry.learningGoal.trim())required.push(issue('REQUIRED_GOAL','/editor/learningGoal','请写明学习者要练习什么。'));if(!entry.puzzle.prompt.trim())required.push(issue('REQUIRED_PROMPT','/prompt','请填写学习者看到的题干。'));if(!entry.puzzle.difficulty.rationale.trim())required.push(issue('REQUIRED_DIFFICULTY_REASON','/difficulty/rationale','请说明该难度判断依据。'));if(entry.puzzle.hints.some(h=>!h.trim()))required.push(issue('REQUIRED_HINTS','/hints','请填写“观察、关系、关键步骤”三层提示。'));if(!entry.puzzle.targetMarkers.length)required.push(issue('REQUIRED_TARGET','/targetMarkers','请至少标出一块题目目标棋。'));if(!entry.puzzle.sources.length||!entry.puzzle.sources[0].title.trim()||!entry.puzzle.sources[0].note.trim())required.push(issue('REQUIRED_SOURCE','/sources/0','请说明内容来源和使用边界。'));
  const structured=validateContent(entry.puzzle);const structural=structured.ok?[]:structured.issues;
  const setup=rulesEngine.validateSetup(entry.puzzle.initialPosition);const setupIssues=setup.ok?[]:[issue(setup.error.code,'/initialPosition',setup.error.at?'初始盘面含无气棋块，仍可继续编辑，但不能发布为规则题。':'初始盘面不能作为规则题起点。')];
  const moveIssues=structured.ok&&setup.ok?replayTree(entry.puzzle):[];const issues=[...required,...structural,...setupIssues,...moveIssues];
  return {ok:issues.length===0,structureOk:required.length===0&&structural.length===0,setupOk:setupIssues.length===0,movesOk:moveIssues.length===0,issues,note:'自动检查只覆盖字段、坐标、起点和已录变化合法性，不证明答案完备、唯一或战略最佳。'};
}

function check(status:Check['status'],method:string,evidence:string[]):Check{return {status,method,checkedAt:date(),evidence};}
export function applyCheckResults(entry:DraftEntry):{entry:DraftEntry;report:DraftCheckReport}{
  const report=checkDraft(entry),next=clone(entry);next.puzzle.validation.structure=report.structureOk?check('passed','T14 schema v1 与必填字段自动检查',['T14 本机检查：结构与必填字段通过']):check('failed','T14 schema v1 与必填字段自动检查',['查看编辑器逐字段问题列表']);next.puzzle.validation.moveLegality=report.setupOk&&report.movesOk?check('passed','T01 起点验证与已录变化逐手重放',['T14 本机检查：已录分支合法']):check('failed','T01 起点验证与已录变化逐手重放',['查看编辑器规则问题列表']);next.puzzle.validation.modelChecked=null;next.updatedAt=timestamp();return {entry:next,report};
}

export function publishDraft(entry:DraftEntry):{ok:true;entry:DraftEntry}|{ok:false;issues:ValidationIssue[]}{
  const checked=applyCheckResults(entry);const issues=[...checked.report.issues];if(!entry.solutionCheckConfirmed||!entry.solutionCheckMethod.trim())issues.push(issue('SOLUTION_CHECK_REQUIRED','/editor/solutionCheckMethod',AUTO_ANSWER_TYPES.has(entry.puzzle.answer.type)?'自动判题内容发布前，请明确勾选并写下解答核查方法。':'发布前请写下量规或参考内容的核查方法。'));if(entry.humanReviewSelfReported&&(!entry.humanReviewer.trim()||!entry.humanReviewScope.trim()))issues.push(issue('HUMAN_REVIEW_DETAILS','/editor/humanReview','人类复核自报需要填写复核者和范围。'));if(issues.length)return {ok:false,issues};
  const next=clone(checked.entry);next.puzzle.developmentOnly=false;next.puzzle.validation.solutionChecked=check('passed',`作者自报核查：${entry.solutionCheckMethod.trim()}`,['使用者在 T14 本机编辑器中主动勾选“我已核查”；编辑器未证明解答完备']);next.puzzle.validation.humanReviewed=entry.humanReviewSelfReported?{reviewer:entry.humanReviewer.trim(),reviewerRole:'human',checkedAt:date(),scope:`自报：${entry.humanReviewScope.trim()}`,evidence:['使用者在 T14 本机编辑器中主动填写并勾选人类复核自报']} satisfies HumanReview:null;next.lifecycle='published';next.updatedAt=timestamp();return {ok:true,entry:next};
}

export function saveEntry(workspace:DraftWorkspace,entry:DraftEntry,officialIds:ReadonlySet<string>,choice:SaveChoice='ask'):SaveResult{
  if(officialIds.has(entry.puzzle.id)&&entry.origin.kind!=='official'&&entry.origin.kind!=='local')return {ok:false,code:'OFFICIAL_CONFLICT',message:'该 ID 属于随项目提供的正式题。请另存副本，或从正式题明确创建新 revision。'};
  const exact=workspace.entries.find(item=>item.entryId!==entry.entryId&&item.lifecycle!=='deleted'&&entryKey(item)===entryKey(entry));
  if(exact&&choice==='ask')return {ok:false,code:'LOCAL_CONFLICT',message:'本机已有相同 ID 与 revision。请选择保留两份或显式替换。',conflictingEntry:exact};
  let saved=clone(entry);let entries=[...workspace.entries];
  if(exact&&choice==='keep-both'){let index=2,candidate=`${saved.puzzle.id}-COPY-${index}`;const ids=new Set([...officialIds,...entries.map(item=>item.puzzle.id)]);while(ids.has(candidate))candidate=`${saved.puzzle.id}-COPY-${++index}`;saved=copyAsNew(saved,candidate);}
  if(exact&&choice==='replace')entries=entries.filter(item=>item.entryId!==exact.entryId);
  const own=entries.findIndex(item=>item.entryId===saved.entryId);if(own>=0)entries[own]=clone(saved);else entries.push(clone(saved));
  return {ok:true,entry:saved,workspace:{...workspace,revision:workspace.revision+1,entries},message:exact&&choice==='keep-both'?`已另存为 ${saved.puzzle.id}@1。`:exact&&choice==='replace'?'已显式替换本机同 ID/revision 草稿。':'草稿已保存到当前设备。'};
}

export function setDeleted(workspace:DraftWorkspace,entryId:string,deleted:boolean):DraftWorkspace{return {...workspace,revision:workspace.revision+1,entries:workspace.entries.map(item=>item.entryId===entryId?{...item,lifecycle:deleted?'deleted':'draft',updatedAt:timestamp()}:item)};}

export function treePath(answer:Extract<Answer,{type:'move-tree'}>,nodeId:string):string[]{
  const parent=new Map<string,string>();for(const node of answer.nodes)for(const child of node.children)parent.set(child,node.nodeId);const path=[nodeId];while(parent.has(path[0]))path.unshift(parent.get(path[0])!);return path[0]===answer.rootNodeId?path:[answer.rootNodeId];
}

export function treeStateAt(puzzle:Puzzle,nodeId:string){
  if(puzzle.answer.type!=='move-tree')return {ok:false as const,message:'当前答案不是变化树。'};const start=startGame(puzzle.initialPosition,{mode:'full-game',komi:0,gameId:`T14-EDIT-${puzzle.id}`});if(!start.ok)return {ok:false as const,message:'初始局面不能按规则开始。'};let state=start.value;const byId=new Map(puzzle.answer.nodes.map(node=>[node.nodeId,node]));for(const id of treePath(puzzle.answer,nodeId).slice(1)){const move=byId.get(id)?.move;if(!move||move.color!==state.toPlay)return {ok:false as const,message:'已有分支轮次不一致。'};const result=move.type==='place'?tryMove(state,move):move.type==='pass'?applyPass(state,move.color):null;if(!result||!result.ok)return {ok:false as const,message:'已有分支包含不合法着法。'};state=result.value.nextState;}return {ok:true as const,state};
}

export function addTreeMove(entry:DraftEntry,parentId:string,move:Extract<Move,{type:'place'|'pass'}>,details:{outcome:TreeNode['outcome'];terminalStatus:TreeNode['terminalStatus'];explanation:string;evidence:string}):{ok:true;entry:DraftEntry;nodeId:string}|{ok:false;message:string}{
  if(entry.puzzle.answer.type!=='move-tree')return {ok:false,message:'请先把答案类型切换为变化树。'};const current=treeStateAt(entry.puzzle,parentId);if(!current.ok)return current;if(move.color!==current.state.toPlay)return {ok:false,message:'执棋颜色与当前轮次不一致。'};const result=move.type==='place'?tryMove(current.state,move):applyPass(current.state,move.color);if(!result.ok)return {ok:false,message:`本手不合法：${result.error.code}。草稿未改变。`};if(!details.explanation.trim())return {ok:false,message:'每个变化节点都需要解释。'};if((details.outcome==='success'||details.outcome==='failure'||details.terminalStatus==='verified-alive'||details.terminalStatus==='verified-dead')&&!details.evidence.trim())return {ok:false,message:'确定成功、失败或死活终点必须写明证据。'};
  const next=clone(entry),answer=next.puzzle.answer as Extract<Answer,{type:'move-tree'}>;let n=answer.nodes.length;let nodeId=`node-${n}`;while(answer.nodes.some(node=>node.nodeId===nodeId))nodeId=`node-${++n}`;const parent=answer.nodes.find(node=>node.nodeId===parentId);if(!parent)return {ok:false,message:'找不到当前分叉节点。'};parent.children.push(nodeId);answer.nodes.push({nodeId,move:clone(move),children:[],outcome:details.outcome,terminalStatus:details.terminalStatus,evidence:details.evidence.trim()?[details.evidence.trim()]:[],explanation:details.explanation.trim()});if(details.outcome!=='continue')next.puzzle.coveredBranches.push(treePath(answer,nodeId));next.lifecycle='draft';next.puzzle.validation=defaultValidation();next.solutionCheckConfirmed=false;next.updatedAt=timestamp();return {ok:true,entry:next,nodeId};
}

export function exportPuzzle(entry:DraftEntry){return JSON.stringify(entry.puzzle,null,2)+'\n';}
export function exportBundle(entry:DraftEntry){return JSON.stringify({schemaVersion:1,id:`BUNDLE-${entry.puzzle.id}`,revision:entry.puzzle.revision,rulesetId:'GO-CLUB-AREA-1',kind:'ContentBundle',developmentOnly:entry.puzzle.developmentOnly,title:entry.title,items:[entry.puzzle]},null,2)+'\n';}

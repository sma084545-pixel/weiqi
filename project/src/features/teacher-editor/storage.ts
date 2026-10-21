import type {Puzzle} from '../../core/content.generated';
import type {StoragePort} from '../../core/persistence';
import type {CatalogItem} from '../puzzle-runner/catalog';
import {emptyWorkspace,type DraftEntry,type DraftWorkspace} from './model';

export const T14_STORAGE_KEY='go-club:teacher-drafts:v1';
export const T14_SESSION_KEY='go-club:teacher-editor-session:v1';
export type WorkspaceResult={ok:true;value:DraftWorkspace;message:string}|{ok:false;fallback:DraftWorkspace;message:string};
export interface TeacherEditorSession {schemaVersion:1;id:'LOCAL-T14-EDITOR-SESSION';revision:1;rulesetId:'GO-CLUB-AREA-1';kind:'TeacherEditorSession';entry:DraftEntry;readOnly:boolean;updatedAt:string}
export type SessionResult={ok:true;value:TeacherEditorSession|null;message:string}|{ok:false;value:null;message:string};
const validLifecycle=new Set(['draft','published','deleted']);

export function parseWorkspace(value:unknown):WorkspaceResult{
  const fallback=emptyWorkspace();
  if(!value||typeof value!=='object'||Array.isArray(value))return {ok:false,fallback,message:'本机草稿格式不正确，原记录未覆盖。'};
  const item=value as Partial<DraftWorkspace>;
  if(item.schemaVersion!==1||item.id!=='LOCAL-T14-WORKSPACE'||item.rulesetId!=='GO-CLUB-AREA-1'||item.kind!=='TeacherDraftWorkspace'||!Number.isInteger(item.revision)||!Array.isArray(item.entries))return {ok:false,fallback,message:'只支持 T14 工作区主版本 1；原记录未覆盖。'};
  for(const [index,entry] of item.entries.entries()){
    if(!entry||typeof entry!=='object'||typeof entry.entryId!=='string'||typeof entry.title!=='string'||typeof entry.learningGoal!=='string'||!validLifecycle.has(entry.lifecycle)||typeof entry.solutionCheckMethod!=='string'||typeof entry.numberAnswerText!=='string'||typeof entry.solutionCheckConfirmed!=='boolean'||typeof entry.humanReviewSelfReported!=='boolean'||typeof entry.humanReviewer!=='string'||typeof entry.humanReviewScope!=='string'||typeof entry.updatedAt!=='string'||!entry.origin||!['blank','template','official','local'].includes(entry.origin.kind))return {ok:false,fallback,message:`第 ${index+1} 条本机草稿元数据不完整，原记录未覆盖。`};
    const puzzle=entry.puzzle as Partial<Puzzle>;if(!puzzle||puzzle.kind!=='Puzzle'||puzzle.schemaVersion!==1||puzzle.rulesetId!=='GO-CLUB-AREA-1'||typeof puzzle.id!=='string'||!Number.isInteger(puzzle.revision))return {ok:false,fallback,message:`第 ${index+1} 条草稿缺少可恢复的题目身份字段，原记录未覆盖。`};
  }
  return {ok:true,value:item as DraftWorkspace,message:'已恢复当前设备上的教师草稿。'};
}

export function createDraftStore(port:StoragePort){
  return {
    load():WorkspaceResult{try{const raw=port.getItem(T14_STORAGE_KEY);if(raw===null)return {ok:true,value:emptyWorkspace(),message:'当前设备还没有教师草稿。'};return parseWorkspace(JSON.parse(raw));}catch{return {ok:false,fallback:emptyWorkspace(),message:'本机草稿暂时无法读取；原记录未覆盖。'};}},
    save(workspace:DraftWorkspace):WorkspaceResult{const checked=parseWorkspace(workspace);if(!checked.ok)return checked;try{port.setItem(T14_STORAGE_KEY,JSON.stringify(workspace));return {ok:true,value:workspace,message:'已保存到当前设备；没有账号或网络上传。'};}catch{return {ok:false,fallback:workspace,message:'本机存储不可用或空间不足；当前编辑内容仍保留在页面中。'};}},
  };
}

export function parseEditorSession(value:unknown):SessionResult{
  if(!value||typeof value!=='object'||Array.isArray(value))return {ok:false,value:null,message:'当前编辑会话格式不正确；未覆盖本机草稿。'};
  const item=value as Partial<TeacherEditorSession>;
  if(item.schemaVersion!==1||item.id!=='LOCAL-T14-EDITOR-SESSION'||item.revision!==1||item.rulesetId!=='GO-CLUB-AREA-1'||item.kind!=='TeacherEditorSession'||typeof item.readOnly!=='boolean'||typeof item.updatedAt!=='string'||!item.entry)return {ok:false,value:null,message:'只支持教师编辑会话主版本 1；未覆盖本机草稿。'};
  const checked=parseWorkspace({schemaVersion:1,id:'LOCAL-T14-WORKSPACE',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'TeacherDraftWorkspace',entries:[item.entry]});
  if(!checked.ok)return {ok:false,value:null,message:'当前编辑会话中的题目无法恢复；已保留已保存草稿。'};
  return {ok:true,value:item as TeacherEditorSession,message:'已恢复上次尚未提交的编辑内容。'};
}

export function createEditorSessionStore(port:StoragePort){
  return {
    load():SessionResult{try{const raw=port.getItem(T14_SESSION_KEY);return raw===null?{ok:true,value:null,message:'没有待恢复的编辑会话。'}:parseEditorSession(JSON.parse(raw));}catch{return {ok:false,value:null,message:'当前编辑会话暂时无法读取；已保存草稿未改变。'};}},
    save(entry:DraftEntry,readOnly:boolean):SessionResult{const session:TeacherEditorSession={schemaVersion:1,id:'LOCAL-T14-EDITOR-SESSION',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'TeacherEditorSession',entry,readOnly,updatedAt:new Date().toISOString()};const checked=parseEditorSession(session);if(!checked.ok)return checked;try{port.setItem(T14_SESSION_KEY,JSON.stringify(session));return {ok:true,value:session,message:'当前编辑内容已在本机自动保存。'};}catch{return {ok:false,value:null,message:'当前编辑内容尚未写入本机；请导出或保存草稿后再刷新。'};}},
  };
}

export function publishedDraftItems(port:StoragePort):CatalogItem[]{
  const loaded=createDraftStore(port).load();if(!loaded.ok)return [];
  return loaded.value.entries.filter(entry=>entry.lifecycle==='published'&&!entry.puzzle.developmentOnly).map(entry=>({puzzle:entry.puzzle,status:'available' as const,message:'当前设备发布的题目',title:entry.title,pedagogy:null}));
}

export function entryForPreview(entry:DraftEntry):CatalogItem{return {puzzle:entry.puzzle as Puzzle,status:'available',message:'教师草稿预览',title:entry.title,pedagogy:null};}

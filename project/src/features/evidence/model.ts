import Ajv from 'ajv';
import schema from '../../../schemas/t17-evidence.schema.json';
import contentSchema from '../../../schemas/content.schema.json';
import type {Feedback,Puzzle} from '../../core/content.generated';
import type {StoragePort} from '../../core/persistence';
import {AVAILABLE_PUZZLES} from '../puzzle-runner/catalog';
import {copyAsNew,createRevision,draftFromPuzzle,saveEntry,type DraftWorkspace} from '../teacher-editor/model';

export const EVIDENCE_KEY='go-club:evidence:v1';
export const DIFFICULTIES={'too-easy':'偏简单',comfortable:'刚合适','too-hard':'偏难'} as const;
export const ACTIVITIES={liberties:'找气与数气',captures:'提子实验室',partner:'双人吃子',game:'完整对弈',puzzles:'自选题',cooperative:'同伴合作',other:'其他'} as const;
export const ISSUES={'too-hard':'题目过难',unclear:'说明不清',bug:'程序错误',other:'其他'} as const;
export type ResourceRef={id:string;revision:number};
export type Identity={schemaVersion:1;id:string;revision:number;rulesetId:'GO-CLUB-AREA-1'};
export type ActivityRecord=Identity&{kind:'ActivityRecord';date:string;title:string;developmentOnly:boolean};
export type FeedbackEntry=Identity&{kind:'FeedbackEntry';activityId:string;issue:keyof typeof ISSUES|null;resourceRef:ResourceRef|null;feedback:Feedback};
export type Improvement=Identity&{kind:'ImprovementRecord';developmentOnly:boolean;activityId:string;problem:string;evidenceIds:string[];evidenceNote:string;resourceRef:ResourceRef|null;change:string;changeDate:string|null;validationMethod:string;implementationDate:string|null;afterObservation:string|null;nextStep:string;state:'planned'|'revised'|'implemented';revisionLink:{beforeRef:ResourceRef;afterRef:ResourceRef;before:Puzzle|null;after:Puzzle|null}|null};
export type ProcessRecord=Identity&{kind:'CASProcessRecord';developmentOnly:boolean;activityId:string;date:string;design:string;peerContribution:string;aiAssistance:string;references:string;implementation:string;actualMinutes:number|null;reflection:string};
export interface EvidenceWorkspace extends Identity {kind:'T17Workspace'|'T17EvidenceReport';activities:ActivityRecord[];feedback:FeedbackEntry[];improvements:Improvement[];processes:ProcessRecord[];exportPolicy:null|{includeTests:boolean;excludedWithoutConsent:number;reviewedFreeText:true}}
const ajv=new Ajv({strict:false,allErrors:true});ajv.addSchema(contentSchema);const check=ajv.compile(schema);
export const identity=(id:string,revision=1):Identity=>({schemaVersion:1,id,revision,rulesetId:'GO-CLUB-AREA-1'});
export const newId=(prefix:string)=>`${prefix}-${crypto.randomUUID()}`;
export const localDate=()=>{const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;};
export const emptyEvidence=():EvidenceWorkspace=>({...identity('LOCAL-T17-EVIDENCE'),kind:'T17Workspace',activities:[],feedback:[],improvements:[],processes:[],exportPolicy:null});
export function validateEvidence(value:unknown):{ok:true;value:EvidenceWorkspace}|{ok:false;message:string}{
  if(!check(value))return {ok:false,message:`记录格式不兼容：${(check.errors??[]).map(e=>`${e.instancePath||'/'} ${e.message}`).join('；')}`};
  const w=value as unknown as EvidenceWorkspace;const activities=new Map(w.activities.map(a=>[a.id,a]));
  const all=[...w.activities,...w.feedback,...w.improvements,...w.processes];
  if(new Set(all.map(a=>a.id)).size!==all.length)return {ok:false,message:'记录 ID 重复；原记录未覆盖。'};
  const validDate=(date:string)=>{const d=new Date(`${date}T12:00:00`);return !Number.isNaN(d.getTime())&&localDateOf(d)===date;};
  for(const a of w.activities)if(!validDate(a.date))return {ok:false,message:'/activities/date 不是有效日期。'};
  for(const p of w.processes)if(!validDate(p.date))return {ok:false,message:`${p.id}/date 不是有效日期。`};
  for(const item of [...w.feedback,...w.improvements,...w.processes]){
    const activity=activities.get(item.activityId);if(!activity)return {ok:false,message:`${item.id}/activityId 引用了不存在的活动。`};
    const development='feedback' in item?item.feedback.developmentOnly:item.developmentOnly;
    if(development!==activity.developmentOnly)return {ok:false,message:`${item.id}/developmentOnly 与活动的测试标志不一致。`};
  }
  for(const entry of w.feedback){
    if(entry.feedback.activityRef?.id!==entry.activityId||entry.feedback.activityRef?.revision!==activities.get(entry.activityId)?.revision||entry.feedback.evidenceType!=='participant-submission')return {ok:false,message:`${entry.id}/feedback/activityRef 不一致。`};
    if(entry.feedback.preferredActivities.length>1||entry.feedback.preferredActivities.some(id=>!Object.hasOwn(ACTIVITIES,id)))return {ok:false,message:`${entry.id}/feedback/preferredActivities 须为一个已知选项或空值。`};
  }
  for(const item of w.improvements){
    for(const field of ['changeDate','implementationDate'] as const)if(item[field]&&!validDate(item[field]))return {ok:false,message:`${item.id}/${field} 不是有效日期。`};
    if(item.state==='implemented'&&!item.implementationDate)return {ok:false,message:`${item.id}/implementationDate：实施状态须手动填写日期。`};
    if(item.afterObservation!==null&&(!item.implementationDate||item.state!=='implemented'))return {ok:false,message:`${item.id}/afterObservation：未实施时只能保持未观察。`};
    const link=item.revisionLink;if(link&&(link.afterRef.id!==link.beforeRef.id||link.afterRef.revision<=link.beforeRef.revision||(w.kind==='T17Workspace'&&(!link.before||!link.after))||(link.before&&(link.before.id!==link.beforeRef.id||link.before.revision!==link.beforeRef.revision))||(link.after&&(link.after.id!==link.afterRef.id||link.after.revision!==link.afterRef.revision))))return {ok:false,message:`${item.id}/revisionLink 前后版本不一致。`};
  }
  return {ok:true,value:w};
}
function localDateOf(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function loadEvidence(port:StoragePort){try{const raw=port.getItem(EVIDENCE_KEY);return raw===null?{ok:true as const,value:emptyEvidence()}:validateEvidence(JSON.parse(raw));}catch{return {ok:false as const,message:'本机记录无法读取；原记录未覆盖，请先备份。'};}}
export function addFeedback(w:EvidenceWorkspace,entry:FeedbackEntry):EvidenceWorkspace{
  if(w.feedback.some(f=>f.id===entry.id))return w;
  return {...w,revision:w.revision+1,feedback:[...w.feedback,entry]};
}
export function makeFeedback(activity:ActivityRecord,token:string,difficulty:Feedback['difficulty'],preferred:string,comment:string,consent:boolean,issue:FeedbackEntry['issue']=null,resourceRef:ResourceRef|null=null):FeedbackEntry{
  return {...identity(`ENTRY-${token}`),kind:'FeedbackEntry',activityId:activity.id,issue,resourceRef,feedback:{...identity(`FEEDBACK-${token}`),kind:'Feedback',developmentOnly:activity.developmentOnly,activityRef:{id:activity.id,revision:activity.revision},recordedAt:new Date().toISOString(),difficulty,preferredActivities:preferred?[preferred]:[],comment,consentToUse:consent,evidenceType:'participant-submission',responseContext:null,response:null}};
}
export function summarize(entries:FeedbackEntry[]){
  const difficulty:Record<string,number>={'too-easy':0,comfortable:0,'too-hard':0,missing:0};const preferred:Record<string,number>={...Object.fromEntries(Object.keys(ACTIVITIES).map(id=>[id,0])),missing:0};
  for(const entry of entries){difficulty[entry.feedback.difficulty??'missing']++;const first=entry.feedback.preferredActivities[0];if(first&&first in preferred)preferred[first]++;else preferred.missing++;}
  return {total:entries.length,difficulty,preferred,missingComment:entries.filter(e=>!e.feedback.comment.trim()).length};
}
export function deleteFeedback(w:EvidenceWorkspace,id:string):EvidenceWorkspace{return {...w,revision:w.revision+1,feedback:w.feedback.filter(f=>f.id!==id)};}
export function addTestFixture(w:EvidenceWorkspace):EvidenceWorkspace{
  if(w.activities.some(a=>a.id==='TEST-T17-ACT-001'))return w;
  const activity:ActivityRecord={...identity('TEST-T17-ACT-001'),kind:'ActivityRecord',title:'开发测试活动（非真实反馈）',date:'2026-10-05',developmentOnly:true};
  // Independent fixed expectations: 3 replies; difficulty comfortable 1, hard 1, missing 1;
  // favorite liberties 2, missing 1; comment missing 1. No student outcome is implied.
  return {...w,revision:w.revision+1,activities:[...w.activities,activity],feedback:[...w.feedback,makeFeedback(activity,'TEST-001','comfortable','liberties','测试文本 A，不是真实成员意见。',true),makeFeedback(activity,'TEST-002','too-hard','liberties','测试文本 B，不是真实成员意见。',true),makeFeedback(activity,'TEST-003',null,'','',true)]};
}
export function resourceOptions(drafts:DraftWorkspace){return [...AVAILABLE_PUZZLES.map(c=>({ref:{id:c.puzzle.id,revision:c.puzzle.revision},label:`${c.puzzle.id}@${c.puzzle.revision} · 随项目题目`,puzzle:c.puzzle,entry:null})),...drafts.entries.filter(e=>e.lifecycle!=='deleted').map(e=>({ref:{id:e.puzzle.id,revision:e.puzzle.revision},label:`${e.puzzle.id}@${e.puzzle.revision} · 本机草稿`,puzzle:e.puzzle,entry:e}))];}
export function stageResourceRevision(w:EvidenceWorkspace,item:Improvement,drafts:DraftWorkspace){
  if(item.revisionLink)throw new Error('此条已建立修改前后版本，请到 T14 继续编辑，避免重复建立。');
  if(!item.resourceRef||!item.change.trim())throw new Error('请先选择拟改资源版本并写明修改内容。');
  const source=resourceOptions(drafts).find(s=>s.ref.id===item.resourceRef!.id&&s.ref.revision===item.resourceRef!.revision);if(!source)throw new Error('原资源版本未安装，请保留引用并到文件交接恢复。');
  let before=source.entry?structuredClone(source.entry):copyAsNew(draftFromPuzzle(source.puzzle,source.ref.id,{kind:'official',sourceId:source.ref.id,sourceRevision:source.ref.revision}),`LOCAL-${source.ref.id}-${crypto.randomUUID().slice(0,8)}`);
  const existing=drafts.entries.filter(e=>e.puzzle.id===before.puzzle.id);const max=Math.max(before.puzzle.revision,...existing.map(e=>e.puzzle.revision));
  if(max>before.puzzle.revision)throw new Error('已有更高 revision，请选择最新草稿后再建立修改，避免覆盖分支。');
  const after=createRevision(before);after.puzzle.prompt=`${after.puzzle.prompt}\n${item.change.trim()}`.trim();
  const officialIds=new Set(AVAILABLE_PUZZLES.map(c=>c.puzzle.id));let draftNext=drafts;
  if(!source.entry){const saved=saveEntry(draftNext,before,officialIds);if(!saved.ok)throw new Error(saved.message);draftNext=saved.workspace;}
  const saved=saveEntry(draftNext,after,officialIds);if(!saved.ok)throw new Error(saved.message);draftNext=saved.workspace;
  const revised:Improvement={...item,revision:item.revision+1,state:'revised',changeDate:localDate(),implementationDate:null,afterObservation:null,revisionLink:{beforeRef:{id:before.puzzle.id,revision:before.puzzle.revision},afterRef:{id:after.puzzle.id,revision:after.puzzle.revision},before:before.puzzle,after:after.puzzle}};
  return {workspace:{...w,revision:w.revision+1,improvements:w.improvements.map(i=>i.id===item.id?revised:i)},drafts:draftNext,entry:saved.entry};
}

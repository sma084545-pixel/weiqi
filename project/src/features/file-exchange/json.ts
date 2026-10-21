import type {ContentDocument,GameState,Position,Puzzle} from '../../core/content.generated';
import {rulesEngine} from '../../core/rules';
import {validateContent} from '../../core/validation';
import type {ConflictChoice,ExchangeLibrary,ImportCandidate,ImportConflict,ImportIssue,ImportLimits,JsonImportPreview} from './types';
import {DEFAULT_IMPORT_LIMITS} from './types';

const encoder=new TextEncoder();
const clone=<T,>(value:T):T=>structuredClone(value);
export const documentKey=(value:Pick<ContentDocument,'id'|'revision'>)=>`${value.id}@${value.revision}`;
export function safeFilename(name:string,extension?:string){
  const cleaned=name.normalize('NFKC').replace(/[\x00-\x1f\x7f/\\:*?"<>|]+/g,'-').replace(/\.{2,}/g,'.').replace(/^\.+|\.+$/g,'').trim().slice(0,120)||'import';
  return extension&& !cleaned.toLowerCase().endsWith(`.${extension.toLowerCase()}`)?`${cleaned}.${extension}`:cleaned;
}
function depthOf(value:unknown,depth=0):number{
  if(value===null||typeof value!=='object')return depth;
  let maximum=depth+1;const items=Array.isArray(value)?value:Object.values(value as Record<string,unknown>);for(const item of items)maximum=Math.max(maximum,depthOf(item,depth+1));return maximum;
}
function flatten(document:ContentDocument):ImportCandidate[]{
  if(document.kind!=='ContentBundle')return [{document,path:'/'}];
  return document.items.map((item,index)=>({document:item,path:`/items/${index}`}));
}
function rulesCheck(candidate:ImportCandidate):ImportIssue|null{
  const {document,path}=candidate;
  if(document.kind==='Position'){
    const result=rulesEngine.validateSetup(document);
    return result.ok?null:{code:result.error.code,path,message:'局面不能作为 GO-CLUB-AREA-1 的规则起点。',blocking:true};
  }
  if(document.kind==='Puzzle'){
    const result=rulesEngine.validateSetup(document.initialPosition);
    if(!result.ok)return {code:result.error.code,path:`${path}/initialPosition`,message:'题目起点不能在规则模式中运行。',blocking:true};
    if(document.answer.type==='move-tree'){
      const started=rulesEngine.startGame(document.initialPosition,{mode:'full-game',komi:0,gameId:`T15-IMPORT-${document.id}`});if(!started.ok)return {code:started.error.code,path:`${path}/initialPosition`,message:'题目起点不能建立新历史。',blocking:true};
      const nodes=new Map(document.answer.nodes.map(node=>[node.nodeId,node])),root=nodes.get(document.answer.rootNodeId);if(!root)return {code:'TREE_ROOT',path:`${path}/answer/rootNodeId`,message:'变化树根节点不存在。',blocking:true};let found:ImportIssue|null=null;
      const visit=(node:typeof root,state:typeof started.value)=>{if(!node||found)return;for(const childId of node.children){const child=nodes.get(childId);if(!child?.move){found={code:'TREE_MOVE',path:`${path}/answer/nodes/${childId}`,message:'变化节点缺少动作。',blocking:true};return;}const transition=child.move.type==='place'?rulesEngine.tryMove(state,child.move):child.move.type==='pass'?rulesEngine.applyPass(state,child.move.color):null;if(!transition||!transition.ok){found={code:transition&&!transition.ok?transition.error.code:'TREE_RESIGN',path:`${path}/answer/nodes/${childId}/move`,message:'已录变化未通过 GO-CLUB-AREA-1 逐手重放。',blocking:true};return;}visit(child,transition.value.nextState);}};visit(root,started.value);if(found)return found;
    }
    return null;
  }
  if(document.kind==='GameState'){
    const result=rulesEngine.restoreGame(document);
    return result.ok?null:{code:result.error.code,path,message:'对局自报状态与从 setup 重放的结果不一致。',blocking:true};
  }
  return null;
}
export function previewJsonImport(text:string,filename:string,options:{limits?:Partial<ImportLimits>;officialIds?:ReadonlySet<string>;localDocuments?:readonly ContentDocument[]}={}):JsonImportPreview{
  const limits={...DEFAULT_IMPORT_LIMITS,...options.limits},issues:JsonImportPreview['issues']=[],warnings:string[]=[];
  const byteLength=encoder.encode(text).length,cleanName=safeFilename(filename||'import.json','json');
  const fail=(code:string,path:string,message:string)=>issues.push({code,path,message,blocking:true});
  if(byteLength>limits.maxBytes)fail('IMPORT_SIZE','/',`文件为 ${byteLength} 字节，超过 ${limits.maxBytes} 字节上限。`);
  let parsed:unknown;
  if(!issues.length){try{parsed=JSON.parse(text);}catch{fail('JSON_PARSE','/','无法解析 JSON；已有内容没有改变。');}}
  if(parsed!==undefined&&depthOf(parsed)>limits.maxDepth)fail('IMPORT_DEPTH','/',`嵌套深度超过 ${limits.maxDepth} 层上限。`);
  let root:ContentDocument|null=null;
  if(parsed!==undefined&&!issues.length){const checked=validateContent(parsed);if(!checked.ok)checked.issues.forEach(item=>fail(item.code,item.path,item.message));else root=checked.value;}
  let candidates=root?flatten(root):[];
  if(candidates.length>limits.maxItems)fail('IMPORT_ITEMS','/items',`项目数 ${candidates.length} 超过 ${limits.maxItems} 项上限。`);
  if(!issues.length)for(const candidate of candidates){const item=rulesCheck(candidate);if(item)issues.push(item);}
  const counts:Record<string,number>={};for(const {document} of candidates)counts[document.kind]=(counts[document.kind]??0)+1;
  const official=options.officialIds??new Set<string>(),locals=options.localDocuments??[];
  const localKeys=new Set(locals.map(documentKey));const conflicts:ImportConflict[]=[];
  for(const {document} of candidates){const key=documentKey(document);if(official.has(document.id))conflicts.push({key,id:document.id,revision:document.revision,kind:'official',message:'该 ID 属于随项目提供的正式内容；不能覆盖。',allowed:['skip','keep-copy']});else if(localKeys.has(key))conflicts.push({key,id:document.id,revision:document.revision,kind:'local',message:'当前设备已有相同 ID 与 revision。',allowed:['skip','replace','keep-copy']});}
  if(root?.kind==='ContentBundle')warnings.push('内容包已逐项预览；提交时仍按每项 ID/revision 处理冲突。');
  if(candidates.some(({document})=>!['Position','Puzzle','GameState'].includes(document.kind)))warnings.push('内容包含本页不直接编辑的类型；仍可保留和再次导出。');
  return {ok:issues.length===0,filename:cleanName,byteLength,rootKind:root?.kind??null,candidates,counts,conflicts,issues,warnings};
}

function copiedDocument(document:ContentDocument,taken:Set<string>):ContentDocument{
  let index=2,id=`${document.id}-COPY-${index}`;while(taken.has(id))id=`${document.id}-COPY-${++index}`;taken.add(id);
  const next=clone(document) as ContentDocument;next.id=id;
  if(next.kind==='Puzzle'){next.initialPosition.id=`POS-${id}`;next.developmentOnly=true;}
  if(next.kind==='GameState'){next.setup.id=`POS-${id}`;}
  return next;
}
export function commitJsonImport(library:ExchangeLibrary,preview:JsonImportPreview,choices:Record<string,ConflictChoice>,officialIds:ReadonlySet<string>):{ok:true;library:ExchangeLibrary;imported:ContentDocument[];message:string}|{ok:false;message:string}{
  if(!preview.ok)return {ok:false,message:'预览仍有阻断错误；已有内容没有改变。'};
  for(const conflict of preview.conflicts)if(!choices[conflict.key])return {ok:false,message:`请先处理 ${conflict.key} 的冲突。`};
  let documents=clone(library.documents),imported:ContentDocument[]=[];const taken=new Set([...officialIds,...documents.map(item=>item.id)]);
  for(const {document:source} of preview.candidates){const key=documentKey(source),conflict=preview.conflicts.find(item=>item.key===key),choice=conflict?choices[key]:null;if(choice==='skip')continue;let document=clone(source);if(choice==='keep-copy')document=copiedDocument(document,taken);if(choice==='replace')documents=documents.filter(item=>documentKey(item)!==key);if(!conflict&&taken.has(document.id))document=copiedDocument(document,taken);else taken.add(document.id);documents.push(document);imported.push(document);}
  return {ok:true,library:{...library,revision:library.revision+1,documents},imported,message:`已导入 ${imported.length} 项；原文件和未选择覆盖的内容均保留。`};
}

export function exportJsonDocument(document:ContentDocument){return JSON.stringify(document,null,2)+'\n';}
export function asPosition(document:ContentDocument):Position|null{return document.kind==='Position'?document:document.kind==='Puzzle'?document.initialPosition:document.kind==='GameState'?document.setup:null;}
export function isPuzzle(document:ContentDocument):document is Puzzle{return document.kind==='Puzzle';}
export function isGame(document:ContentDocument):document is GameState{return document.kind==='GameState';}

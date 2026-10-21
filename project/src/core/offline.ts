import {APP_VERSION,flushPersistence} from './unified-persistence';

export type OfflinePhase='unsupported'|'checking'|'not-ready'|'preparing'|'ready'|'error';
export interface OfflineStatus {phase:OfflinePhase;online:boolean;version:string|null;cachedCount:number;message:string;updateWaiting:boolean}
type WorkerReply={type:'OFFLINE_STATUS';ready:boolean;version:string;cachedCount:number;error?:string}|{type:'PREPARE_RESULT';ok:boolean;version:string;cachedCount:number;error?:string};
const listeners=new Set<(status:OfflineStatus)=>void>();
let registration:ServiceWorkerRegistration|null=null;
let initializationPromise:Promise<void>|null=null;
let current:OfflineStatus={phase:'checking',online:typeof navigator==='undefined'?true:navigator.onLine,version:null,cachedCount:0,message:'正在检查离线资源。',updateWaiting:false};
const emit=(next:Partial<OfflineStatus>)=>{current={...current,...next};for(const listener of listeners)listener({...current});};
export const getOfflineStatus=()=>({...current});
export function subscribeOffline(listener:(status:OfflineStatus)=>void){listeners.add(listener);listener(getOfflineStatus());return()=>listeners.delete(listener);}

function messageWorker(worker:ServiceWorker,message:unknown):Promise<WorkerReply>{return new Promise((resolve,reject)=>{const channel=new MessageChannel(),timer=setTimeout(()=>reject(new Error('离线服务响应超时。')),15_000);channel.port1.onmessage=event=>{clearTimeout(timer);resolve(event.data as WorkerReply);};worker.postMessage(message,[channel.port2]);});}
async function activeWorker(){const ready=await navigator.serviceWorker.ready;registration=ready;return ready.active??navigator.serviceWorker.controller;}
function applyReply(reply:WorkerReply){if(reply.type==='OFFLINE_STATUS'){emit({phase:reply.ready?'ready':'not-ready',version:reply.version,cachedCount:reply.cachedCount,message:reply.ready?'必要应用资源与正式题库已缓存。':'离线准备尚未完成；请保持联网并重试。'});return;}emit({phase:reply.ok?'ready':'error',version:reply.version,cachedCount:reply.cachedCount,message:reply.ok?'必要应用资源与正式题库已缓存。':reply.error??'离线资源缓存失败，请联网重试。'});}

async function startOfflineSupport(){
  if(typeof window==='undefined'||!('serviceWorker' in navigator)||!window.isSecureContext){emit({phase:'unsupported',message:'离线安装需要 HTTPS 或 localhost；直接双击 file:// 不支持同等能力。'});return;}
  window.addEventListener('online',()=>emit({online:true}));window.addEventListener('offline',()=>emit({online:false}));
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(sessionStorage.getItem('go-club:update-reload')==='1'){sessionStorage.removeItem('go-club:update-reload');location.reload();}});
  try{
    registration=await navigator.serviceWorker.register(new URL('./sw.js',document.baseURI),{scope:'./'});
    emit({updateWaiting:Boolean(registration.waiting)});
    registration.addEventListener('updatefound',()=>{const worker=registration?.installing;if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)emit({updateWaiting:true,message:'新版本已准备好；保存当前工作后可应用。'});});});
    const worker=await activeWorker();if(!worker){emit({phase:'not-ready',message:'离线服务尚未接管本页；请刷新后重试。'});return;}
    applyReply(await messageWorker(worker,{type:'GET_STATUS'}));
  }catch(error){emit({phase:'error',message:error instanceof Error?error.message:'离线服务注册失败。'});}
}

export function initializeOfflineSupport(){initializationPromise??=startOfflineSupport();return initializationPromise;}

export async function prepareOffline(){
  if(!registration){emit({phase:'unsupported',message:'当前页面不满足 Service Worker 部署条件。'});return getOfflineStatus();}
  emit({phase:'preparing',message:'正在逐项核对并缓存必要资源。'});
  try{const response=await fetch(new URL('./offline-assets.json',document.baseURI),{cache:'no-store'});if(!response.ok)throw new Error('离线资源清单不可读取。');const manifest=await response.json() as {version:string;resources:string[]};if(manifest.version!==APP_VERSION)throw new Error('离线资源清单版本与应用不一致。');const worker=await activeWorker();if(!worker)throw new Error('离线服务尚未接管本页。');applyReply(await messageWorker(worker,{type:'PREPARE_OFFLINE',resources:manifest.resources,version:manifest.version}));}
  catch(error){emit({phase:'error',message:error instanceof Error?error.message:'离线准备失败。'});}return getOfflineStatus();
}

export async function applyWaitingUpdate(){
  if(!registration?.waiting)return {ok:false,message:'当前没有等待应用的新版本。'};
  try{await flushPersistence();sessionStorage.setItem('go-club:update-reload','1');registration.waiting.postMessage({type:'SKIP_WAITING'});return {ok:true,message:'本机写入已完成，正在应用新版本。'};}
  catch(error){return {ok:false,message:`尚未应用更新：${error instanceof Error?error.message:'本机数据未完成写入。'}`};}
}
export async function checkForOfflineUpdate(){try{await registration?.update();return true;}catch{return false;}}

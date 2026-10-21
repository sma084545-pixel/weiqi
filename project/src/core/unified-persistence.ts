import {APP_VERSION} from './version';
import type {StoragePort} from './persistence';

export const LOCAL_DATABASE_NAME='go-club-local';
export const LOCAL_DATABASE_VERSION=1;
export const LOCAL_STORAGE_SCHEMA_VERSION=1;
export {APP_VERSION} from './version';

export type LocalNamespace='progress'|'attempts'|'games'|'drafts'|'settings'|'exchange'|'discussions'|'positions'|'evidence'|'other';
export interface LocalRecord {
  key:string;namespace:LocalNamespace;schemaVersion:number;contentId:string|null;contentRevision:number|null;
  value:string;updatedAt:string;
}
export interface PersistenceStatus {
  phase:'idle'|'opening'|'ready'|'unavailable';pendingWrites:number;lastError:string|null;
  migratedLegacyKeys:number;storageSchemaVersion:number;
}
export interface LocalBackup {
  schemaVersion:1;id:string;revision:1;rulesetId:'GO-CLUB-AREA-1';kind:'LocalBackup';
  appVersion:string;storageSchemaVersion:1;createdAt:string;records:LocalRecord[];
}
export type BackupCheck={ok:true;backup:LocalBackup}|{ok:false;message:string};

const LEGACY_PREFIX='go-club:';
const JOURNAL_KEY='go-club:storage-journal:v1';
type JournalMutation={token:string;type:'set';key:string;value:string}|{token:string;type:'remove';key:string};
interface WriteJournal {schemaVersion:1;mutations:Record<string,JournalMutation>}
const listeners=new Set<(status:PersistenceStatus)=>void>();
const mirror=new Map<string,string>();
const pending=new Set<Promise<void>>();
let database:IDBDatabase|null=null;
let initialized=false;
let status:PersistenceStatus={phase:'idle',pendingWrites:0,lastError:null,migratedLegacyKeys:0,storageSchemaVersion:LOCAL_STORAGE_SCHEMA_VERSION};

const copyStatus=():PersistenceStatus=>({...status});
function emit(partial:Partial<PersistenceStatus>){status={...status,...partial,pendingWrites:pending.size};for(const listener of listeners)listener(copyStatus());}
export function getPersistenceStatus(){return copyStatus();}
export function subscribePersistence(listener:(value:PersistenceStatus)=>void){listeners.add(listener);listener(copyStatus());return()=>listeners.delete(listener);}

export function namespaceForKey(key:string):LocalNamespace{
  if(key.includes('evidence:v1'))return 'evidence';
  if(key.includes('learning-progress'))return 'progress';
  if(key.includes('puzzle-progress'))return 'attempts';
  if(key.includes('FULL-GAME')||key.includes('full-game'))return 'games';
  if(key.includes('teacher-drafts')||key.includes('editor-session'))return 'drafts';
  if(key.includes('file-exchange'))return 'exchange';
  if(key.includes('peer-discussions'))return 'discussions';
  if(key.includes('WORKSPACE')||key.includes('POSITION')||key.startsWith('go-club:v1:'))return 'positions';
  if(key.includes('settings'))return 'settings';
  return 'other';
}

function identity(value:string):{schemaVersion:number;contentId:string|null;contentRevision:number|null}{
  try{const item=JSON.parse(value) as {schemaVersion?:unknown;id?:unknown;revision?:unknown};return {schemaVersion:Number.isInteger(item.schemaVersion)?Number(item.schemaVersion):1,contentId:typeof item.id==='string'?item.id:null,contentRevision:Number.isInteger(item.revision)?Number(item.revision):null};}
  catch{return {schemaVersion:1,contentId:null,contentRevision:null};}
}
export function recordForValue(key:string,value:string,updatedAt=new Date().toISOString()):LocalRecord{
  const item=identity(value);return {key,namespace:namespaceForKey(key),schemaVersion:item.schemaVersion,contentId:item.contentId,contentRevision:item.contentRevision,value,updatedAt};
}

function request<T>(value:IDBRequest<T>):Promise<T>{return new Promise((resolve,reject)=>{value.onsuccess=()=>resolve(value.result);value.onerror=()=>reject(value.error??new Error('IndexedDB request failed'));});}
function transactionDone(value:IDBTransaction):Promise<void>{return new Promise((resolve,reject)=>{value.oncomplete=()=>resolve();value.onabort=()=>reject(value.error??new Error('IndexedDB transaction aborted'));value.onerror=()=>reject(value.error??new Error('IndexedDB transaction failed'));});}
function openDatabase():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{const opening=indexedDB.open(LOCAL_DATABASE_NAME,LOCAL_DATABASE_VERSION);
    opening.onupgradeneeded=()=>{const db=opening.result;if(!db.objectStoreNames.contains('records')){const store=db.createObjectStore('records',{keyPath:'key'});store.createIndex('namespace','namespace',{unique:false});}if(!db.objectStoreNames.contains('meta'))db.createObjectStore('meta',{keyPath:'key'});};
    opening.onerror=()=>reject(opening.error??new Error('IndexedDB unavailable'));
    opening.onblocked=()=>reject(new Error('另一个页面仍在使用旧版本机存储；请关闭其他标签页后重试。'));
    opening.onsuccess=()=>{const db=opening.result;db.onversionchange=()=>db.close();resolve(db);};
  });
}
async function allRecords(db:IDBDatabase):Promise<LocalRecord[]>{return request(db.transaction('records','readonly').objectStore('records').getAll()) as Promise<LocalRecord[]>;}
async function metaValue<T>(db:IDBDatabase,key:string):Promise<T|undefined>{const row=await request(db.transaction('meta','readonly').objectStore('meta').get(key)) as {key:string;value:T}|undefined;return row?.value;}

export function collectLegacyRecords(storage:Storage):LocalRecord[]{
  const result:LocalRecord[]=[];for(let index=0;index<storage.length;index++){const key=storage.key(index);if(!key?.startsWith(LEGACY_PREFIX)||key===JOURNAL_KEY)continue;const value=storage.getItem(key);if(value!==null)result.push(recordForValue(key,value));}return result.sort((a,b)=>a.key.localeCompare(b.key));
}

function readJournal():WriteJournal{
  if(typeof localStorage==='undefined')return {schemaVersion:1,mutations:{}};
  try{const value=JSON.parse(localStorage.getItem(JOURNAL_KEY)??'null') as Partial<WriteJournal>|null;if(value?.schemaVersion===1&&value.mutations&&typeof value.mutations==='object')return value as WriteJournal;}catch{/* A corrupt internal journal is ignored, never treated as user content. */}
  return {schemaVersion:1,mutations:{}};
}
function stageMutation(mutation:JournalMutation){if(typeof localStorage==='undefined')return;try{const journal=readJournal();journal.mutations[mutation.key]=mutation;localStorage.setItem(JOURNAL_KEY,JSON.stringify(journal));}catch{/* IndexedDB write still proceeds; the status reports its own result. */}}
function clearStagedMutation(mutation:JournalMutation){if(typeof localStorage==='undefined')return;try{const journal=readJournal();if(journal.mutations[mutation.key]?.token!==mutation.token)return;delete journal.mutations[mutation.key];if(Object.keys(journal.mutations).length)localStorage.setItem(JOURNAL_KEY,JSON.stringify(journal));else localStorage.removeItem(JOURNAL_KEY);}catch{/* A stale journal is safe to replay idempotently on next load. */}}
async function replayJournal(db:IDBDatabase):Promise<number>{const journal=readJournal(),mutations=Object.values(journal.mutations);if(!mutations.length)return 0;for(const mutation of mutations)if(!mutation.key.startsWith(LEGACY_PREFIX)||mutation.key===JOURNAL_KEY)throw new Error('本机写入恢复日志包含未知键；原数据库未改变。');const tx=db.transaction('records','readwrite'),store=tx.objectStore('records');for(const mutation of mutations){if(mutation.type==='set')store.put(recordForValue(mutation.key,mutation.value));else store.delete(mutation.key);}await transactionDone(tx);try{localStorage.removeItem(JOURNAL_KEY);}catch{/* Database transaction is already authoritative. */}return mutations.length;}

async function migrateLegacy(db:IDBDatabase,storage:Storage):Promise<number>{
  if(await metaValue<boolean>(db,'legacy-localstorage-v1'))return 0;
  const records=collectLegacyRecords(storage);const tx=db.transaction(['records','meta'],'readwrite');const recordStore=tx.objectStore('records');
  for(const item of records)recordStore.put(item);
  tx.objectStore('meta').put({key:'legacy-localstorage-v1',value:true,completedAt:new Date().toISOString(),keys:records.map(item=>item.key)});
  await transactionDone(tx);
  for(const item of records){try{storage.removeItem(item.key);}catch{/* IndexedDB is authoritative after the committed marker. */}}
  return records.length;
}

function track(write:Promise<void>){pending.add(write);emit({lastError:null});write.catch(error=>emit({lastError:error instanceof Error?error.message:'本机写入失败；页面内容仍保留。'})).finally(()=>{pending.delete(write);emit({});});}
async function putRecord(item:LocalRecord){if(!database)throw new Error('本机数据库尚未就绪。');const tx=database.transaction('records','readwrite');tx.objectStore('records').put(item);await transactionDone(tx);}
async function deleteRecord(key:string){if(!database)throw new Error('本机数据库尚未就绪。');const tx=database.transaction('records','readwrite');tx.objectStore('records').delete(key);await transactionDone(tx);}

const indexedPort:StoragePort={
  getItem:key=>mirror.get(key)??null,
  setItem(key,value){const mutation:JournalMutation={token:crypto.randomUUID(),type:'set',key,value};stageMutation(mutation);mirror.set(key,value);track(putRecord(recordForValue(key,value)).then(()=>clearStagedMutation(mutation)));},
  removeItem(key){const mutation:JournalMutation={token:crypto.randomUUID(),type:'remove',key};stageMutation(mutation);mirror.delete(key);track(deleteRecord(key).then(()=>clearStagedMutation(mutation)));},
};

export function browserStoragePort():StoragePort{
  if(initialized&&status.phase==='ready')return indexedPort;
  if(typeof window!=='undefined'&&window.localStorage)return window.localStorage;
  return indexedPort;
}

export async function initializeBrowserPersistence():Promise<PersistenceStatus>{
  if(initialized)return copyStatus();initialized=true;emit({phase:'opening'});
  if(typeof indexedDB==='undefined'){emit({phase:'unavailable',lastError:'此浏览器未提供 IndexedDB；本次使用不能可靠保存。'});return copyStatus();}
  try{const db=await openDatabase();database=db;const migrated=typeof localStorage==='undefined'?0:await migrateLegacy(db,localStorage);const recovered=await replayJournal(db);mirror.clear();for(const item of await allRecords(db))mirror.set(item.key,item.value);emit({phase:'ready',migratedLegacyKeys:migrated+recovered,lastError:null});}
  catch(error){emit({phase:'unavailable',lastError:error instanceof Error?error.message:'本机存储无法打开。'});}
  return copyStatus();
}

export async function flushPersistence(){await Promise.allSettled([...pending]);if(status.lastError)throw new Error(status.lastError);}
export function listMirrorRecords():LocalRecord[]{return [...mirror].map(([key,value])=>recordForValue(key,value)).sort((a,b)=>a.key.localeCompare(b.key));}
export async function exportLocalBackup(now=new Date()):Promise<LocalBackup>{await flushPersistence();const records=database?await allRecords(database):listMirrorRecords();return {schemaVersion:1,id:`LOCAL-BACKUP-${now.toISOString().replace(/[:.]/g,'-')}`,revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'LocalBackup',appVersion:APP_VERSION,storageSchemaVersion:1,createdAt:now.toISOString(),records};}

const allowedNamespaces=new Set<LocalNamespace>(['progress','attempts','games','drafts','settings','exchange','discussions','positions','evidence','other']);
export function validateLocalBackup(value:unknown):BackupCheck{
  if(!value||typeof value!=='object'||Array.isArray(value))return {ok:false,message:'备份根结构不是对象；现有数据未改变。'};
  const item=value as Partial<LocalBackup>;if(item.schemaVersion!==1||item.kind!=='LocalBackup'||item.rulesetId!=='GO-CLUB-AREA-1'||item.storageSchemaVersion!==1||typeof item.id!=='string'||item.revision!==1||typeof item.createdAt!=='string'||typeof item.appVersion!=='string'||!Array.isArray(item.records))return {ok:false,message:'只支持 GO-CLUB-AREA-1 的本机备份主版本 1；现有数据未改变。'};
  if(item.records.length>1000)return {ok:false,message:'备份记录超过 1000 条上限；现有数据未改变。'};
  const keys=new Set<string>();for(const [index,row] of item.records.entries()){
    if(!row||typeof row!=='object'||typeof row.key!=='string'||!row.key.startsWith(LEGACY_PREFIX)||typeof row.value!=='string'||typeof row.updatedAt!=='string'||!allowedNamespaces.has(row.namespace)||!Number.isInteger(row.schemaVersion)||row.schemaVersion<1)return {ok:false,message:`第 ${index+1} 条备份记录格式不正确；现有数据未改变。`};
    if(keys.has(row.key))return {ok:false,message:`备份包含重复键 ${row.key}；现有数据未改变。`};keys.add(row.key);
    if(row.value.length>5_000_000)return {ok:false,message:`${row.key} 超过单条 5 MB 上限；现有数据未改变。`};
  }
  return {ok:true,backup:item as LocalBackup};
}

export async function restoreLocalBackup(value:unknown):Promise<{ok:true;count:number}|{ok:false;message:string}>{
  const checked=validateLocalBackup(value);if(!checked.ok)return checked;if(!database)return {ok:false,message:'本机数据库尚未就绪；现有数据未改变。'};
  try{const tx=database.transaction('records','readwrite'),store=tx.objectStore('records');store.clear();for(const row of checked.backup.records)store.put(row);await transactionDone(tx);mirror.clear();for(const row of checked.backup.records)mirror.set(row.key,row.value);return {ok:true,count:checked.backup.records.length};}
  catch(error){return {ok:false,message:`恢复失败，事务已回滚；原数据仍保留。${error instanceof Error?` ${error.message}`:''}`};}
}

export const CLEAR_GROUPS={
  progress:['progress','attempts'],games:['games','positions'],drafts:['drafts','exchange','discussions'],settings:['settings'],evidence:['evidence'],
} as const;
export type ClearGroup=keyof typeof CLEAR_GROUPS;
/** Additive T17 port: commit related evidence/draft records in one transaction. */
export async function commitLocalValues(values:Record<string,string>):Promise<void>{
  await flushPersistence();
  if(!database)throw new Error('本机保存尚未就绪；请保留页面内容或导出，不会标记为已保存。');
  const entries=Object.entries(values);
  for(const [key,value] of entries)if(!key.startsWith(LEGACY_PREFIX)||value.length>5_000_000)throw new Error('记录键或大小超出本机保存范围；原记录未改变。');
  const tx=database.transaction('records','readwrite'),done=transactionDone(tx);
  try{for(const [key,value] of entries)tx.objectStore('records').put(recordForValue(key,value));await done;}
  catch(error){try{tx.abort();}catch{/* A failed transaction may already be aborted. */}await done.catch(()=>{});throw error;}
  for(const [key,value] of entries)mirror.set(key,value);
}
export async function clearLocalGroup(group:ClearGroup):Promise<number>{
  if(!database)throw new Error('本机数据库尚未就绪。');const namespaces=new Set<string>(CLEAR_GROUPS[group]);const records=await allRecords(database),keys=records.filter(row=>namespaces.has(row.namespace)).map(row=>row.key);const tx=database.transaction('records','readwrite'),store=tx.objectStore('records');for(const key of keys)store.delete(key);await transactionDone(tx);for(const key of keys)mirror.delete(key);return keys.length;
}

export function __resetPersistenceForTests(){mirror.clear();database?.close();database=null;initialized=false;pending.clear();status={phase:'idle',pendingWrites:0,lastError:null,migratedLegacyKeys:0,storageSchemaVersion:1};}

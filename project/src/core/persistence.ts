import type {ContentDocument} from './content.generated';
import {parseContent,validateContent,type ValidationIssue} from './validation';
export interface StoragePort {getItem(key:string):string|null;setItem(key:string,value:string):void;removeItem(key:string):void}
export type StoreResult<T>={ok:true;value:T}|{ok:false;issues:ValidationIssue[]};
const storageError=():{ok:false;issues:ValidationIssue[]}=>({ok:false,issues:[{code:'STORAGE_UNAVAILABLE',path:'/',message:'本机保存不可用或空间不足；请保留当前内容，稍后重试。'}]});
// Single document per key; no offline caching or automatic progress tracking in T00.
export function createContentStore(port:StoragePort,options:{maxBytes?:number}={}) {
  const key=(id:string)=>`go-club:v1:${id}`;
  return {
    save(document:ContentDocument):StoreResult<ContentDocument>{
      const checked=validateContent(document);if(!checked.ok)return checked;
      const serialized=JSON.stringify(document);
      const readable=parseContent(serialized,options);if(!readable.ok)return readable;
      try{port.setItem(key(document.id),serialized);return {ok:true,value:document};}catch{return storageError();}
    },
    load(id:string):StoreResult<{document:ContentDocument;needsRulesReplay:boolean}|null>{
      try{const raw=port.getItem(key(id));if(raw===null)return {ok:true,value:null};const parsed=parseContent(raw,options);return parsed.ok?{ok:true,value:{document:parsed.value,needsRulesReplay:parsed.needsRulesReplay}}:parsed;}catch{return storageError();}
    },
    remove(id:string):StoreResult<null>{try{port.removeItem(key(id));return {ok:true,value:null};}catch{return storageError();}}
  };
}
export function browserContentStore():StoreResult<ReturnType<typeof createContentStore>>{
  try{return {ok:true,value:createContentStore(requireBrowserStoragePort())};}catch{return storageError();}
}

function requireBrowserStoragePort():StoragePort{
  // Lazy lookup avoids a module cycle during unit-only imports.
  const value=(globalThis as typeof globalThis&{__goClubStoragePort?:StoragePort}).__goClubStoragePort;
  if(value)return value;
  if(typeof window!=='undefined')return window.localStorage;
  throw new Error('Browser storage is unavailable');
}

export function installBrowserStoragePort(port:StoragePort){(globalThis as typeof globalThis&{__goClubStoragePort?:StoragePort}).__goClubStoragePort=port;}

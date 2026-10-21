import type {ContentDocument} from '../../core/content.generated';
import type {StoragePort} from '../../core/persistence';
import {validateContent} from '../../core/validation';
import type {ExchangeLibrary,StoredSgf} from './types';

export const T15_STORAGE_KEY='go-club:file-exchange:v1';
export const emptyExchangeLibrary=():ExchangeLibrary=>({schemaVersion:1,id:'LOCAL-T15-EXCHANGE',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'ExchangeLibrary',documents:[],sgfs:[]});
export type LibraryResult={ok:true;value:ExchangeLibrary;message:string}|{ok:false;fallback:ExchangeLibrary;message:string};

export function parseExchangeLibrary(value:unknown):LibraryResult{
  const fallback=emptyExchangeLibrary();if(!value||typeof value!=='object'||Array.isArray(value))return {ok:false,fallback,message:'本机交接库格式不正确，原记录未覆盖。'};
  const item=value as Partial<ExchangeLibrary>;if(item.schemaVersion!==1||item.id!=='LOCAL-T15-EXCHANGE'||item.rulesetId!=='GO-CLUB-AREA-1'||item.kind!=='ExchangeLibrary'||!Number.isInteger(item.revision)||!Array.isArray(item.documents)||!Array.isArray(item.sgfs))return {ok:false,fallback,message:'只支持 T15 交接库主版本 1；原记录未覆盖。'};
  for(const [index,document] of item.documents.entries()){const checked=validateContent(document);if(!checked.ok)return {ok:false,fallback,message:`第 ${index+1} 项内容未通过 schemaVersion 1；原记录未覆盖。`};}
  for(const [index,sgf] of item.sgfs.entries()){const value=sgf as Partial<StoredSgf>;if(typeof value.id!=='string'||!Number.isInteger(value.revision)||typeof value.filename!=='string'||typeof value.raw!=='string'||![5,9,13,19].includes(value.size as number)||typeof value.importedAt!=='string'||typeof value.selectedLineId!=='string')return {ok:false,fallback,message:`第 ${index+1} 份 SGF 元数据不完整；原记录未覆盖。`};}
  return {ok:true,value:item as ExchangeLibrary,message:'已恢复当前设备上的交接库。'};
}
export function createExchangeStore(port:StoragePort){return {
  load():LibraryResult{try{const raw=port.getItem(T15_STORAGE_KEY);return raw===null?{ok:true,value:emptyExchangeLibrary(),message:'当前设备还没有导入记录。'}:parseExchangeLibrary(JSON.parse(raw));}catch{return {ok:false,fallback:emptyExchangeLibrary(),message:'本机交接库暂时无法读取；原记录未覆盖。'};}},
  save(library:ExchangeLibrary):LibraryResult{const checked=parseExchangeLibrary(library);if(!checked.ok)return checked;try{port.setItem(T15_STORAGE_KEY,JSON.stringify(library));return {ok:true,value:library,message:'已保存到当前设备；没有上传到网络。'};}catch{return {ok:false,fallback:library,message:'本机存储不可用或空间不足；页面内容仍保留。'};}},
};}
export function addStoredSgf(library:ExchangeLibrary,sgf:StoredSgf,replace=false):{ok:true;value:ExchangeLibrary}|{ok:false;message:string}{
  const exact=library.sgfs.find(item=>item.id===sgf.id&&item.revision===sgf.revision);if(exact&&!replace)return {ok:false,message:'当前设备已有相同 SGF ID/revision；请选择显式替换或更改 ID。'};
  return {ok:true,value:{...library,revision:library.revision+1,sgfs:[...library.sgfs.filter(item=>!(item.id===sgf.id&&item.revision===sgf.revision)),sgf]}};
}
export function removeDocument(library:ExchangeLibrary,id:string,revision:number):ExchangeLibrary{return {...library,revision:library.revision+1,documents:library.documents.filter(item=>item.id!==id||item.revision!==revision)};}
export function contentList(library:ExchangeLibrary):readonly ContentDocument[]{return library.documents;}

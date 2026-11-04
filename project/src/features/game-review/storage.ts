import type {StoragePort} from '../../core/persistence';
import type {Color,GameState} from '../../core/content.generated';
import {rulesEngine,MAX_GAME_BYTES} from '../../core/rules';
import type {ReviewRecord} from './model';

const prefix='go-club:full-game:review:';
/** A deterministic bucket plus full equality check; hash is an index, never authentication. */
function sourceKey(game:GameState){let hash=14695981039346656037n;const text=JSON.stringify([game.id,game.setup,game.komi,game.moves]);for(let i=0;i<text.length;i++)hash=BigInt.asUintN(64,(hash^BigInt(text.charCodeAt(i)))*1099511628211n);return hash.toString(16);}
export function parseReviewRecord(text:string):ReviewRecord {
  if(new TextEncoder().encode(text).length>MAX_GAME_BYTES+200_000)throw Error('复盘记录过大。');
  const d=JSON.parse(text) as ReviewRecord;
  if(d?.schemaVersion!==1||d.rulesetId!=='GO-CLUB-AREA-1'||d.kind!=='GameReview'||!/^REVIEW-[a-f0-9]+$/.test(d.id)||!Number.isSafeInteger(d.revision)||d.revision<1||!['B','W'].includes(d.humanColor)||typeof d.title!=='string'||d.title.length>120||!Array.isArray(d.branches)||d.branches.length>100)throw Error('复盘记录格式有误。');
  const r=rulesEngine.restoreGame(d.game);if(!r.ok||r.value.mode!=='full-game')throw Error('原棋谱未通过重放校验。');
  if(!Number.isInteger(d.cursor)||d.cursor<0||d.cursor>r.value.moves.length)throw Error('复盘位置无效。');
  const ids=new Set<string>();
  for(const b of d.branches){if(!/^BRANCH-[a-zA-Z0-9-]{1,100}$/.test(b.id)||ids.has(b.id)||!['free','guided'].includes(b.mode)||!['B','W'].includes(b.humanColor)||!['relaxed','standard','challenge','extreme'].includes(b.difficulty)||!Number.isInteger(b.index)||b.index<0||b.index>r.value.moves.length||!Number.isInteger(b.floor)||b.floor<0||b.floor>r.value.moves.length+1||typeof b.createdAt!=='string')throw Error('分支记录无效。');ids.add(b.id);}
  return {...d,game:r.value};
}
export function saveReviewRecord(port:StoragePort,record:ReviewRecord){port.setItem(prefix+record.id,JSON.stringify(record));}
export function openReviewRecord(port:StoragePort,game:GameState,humanColor:Color,title:string,cursor:number):ReviewRecord {
  const id=`REVIEW-${sourceKey(game)}`,old=port.getItem(prefix+id);
  if(old){const d=parseReviewRecord(old);if(JSON.stringify(d.game.moves)!==JSON.stringify(game.moves)||JSON.stringify(d.game.setup)!==JSON.stringify(game.setup)||d.game.komi!==game.komi)throw Error('复盘索引冲突，未替换原记录。');const next={...d,revision:d.revision+1,humanColor,cursor};saveReviewRecord(port,next);return next;}
  const restored=rulesEngine.restoreGame(game);if(!restored.ok)throw Error('原棋谱未通过验证，未开始新分支。');
  const record:ReviewRecord={schemaVersion:1,id,revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'GameReview',title,game:restored.value,humanColor,cursor,branches:[]};saveReviewRecord(port,record);return record;
}
/** All writes stay in the branch namespace, including embedded AI/Guided autosaves. */
export function branchStoragePort(port:StoragePort,id:string):StoragePort {
  if(!/^BRANCH-[a-zA-Z0-9-]{1,100}$/.test(id))throw Error('分支编号无效。');
  const key=(k:string)=>`${prefix}${id}:${k}`;
  return {getItem:k=>port.getItem(key(k)),setItem:(k,v)=>port.setItem(key(k),v),removeItem:k=>port.removeItem(key(k))};
}

import type {StoragePort} from '../../core/persistence';
import type {PuzzleVerdict} from './grading';

export const PUZZLE_PROGRESS_KEY='go-club:puzzle-progress:v1';
export type PuzzleAttempt={puzzleId:string;puzzleRevision:number;attemptCount:number;hintLevels:number[];lastVerdict:PuzzleVerdict;completed:boolean};
export type PuzzleProgress={schemaVersion:1;id:'LOCAL-T10-PUZZLE-PROGRESS';revision:number;rulesetId:'GO-CLUB-AREA-1';attempts:Record<string,PuzzleAttempt>};
export type ProgressResult<T>={ok:true;value:T}|{ok:false;message:string;fallback:T};
export const emptyPuzzleProgress=():PuzzleProgress=>({schemaVersion:1,id:'LOCAL-T10-PUZZLE-PROGRESS',revision:1,rulesetId:'GO-CLUB-AREA-1',attempts:{}});
export const attemptKey=(id:string,revision:number)=>`${id}@${revision}`;

function validAttempt(value:unknown):value is PuzzleAttempt{
  if(!value||typeof value!=='object')return false;const item=value as PuzzleAttempt;
  return typeof item.puzzleId==='string'&&Number.isInteger(item.puzzleRevision)&&Number.isInteger(item.attemptCount)&&item.attemptCount>=0&&Array.isArray(item.hintLevels)&&item.hintLevels.every(n=>Number.isInteger(n)&&n>=0&&n<=2)&&typeof item.lastVerdict==='string'&&typeof item.completed==='boolean';
}
function validProgress(value:unknown):value is PuzzleProgress{
  if(!value||typeof value!=='object')return false;const progress=value as PuzzleProgress;
  return progress.schemaVersion===1&&progress.id==='LOCAL-T10-PUZZLE-PROGRESS'&&progress.rulesetId==='GO-CLUB-AREA-1'&&Number.isInteger(progress.revision)&&progress.revision>=1&&progress.attempts&&typeof progress.attempts==='object'&&Object.values(progress.attempts).every(validAttempt);
}

export function createPuzzleProgressStore(port:StoragePort){
  return {
    load():ProgressResult<PuzzleProgress>{
      const fallback=emptyPuzzleProgress();try{const raw=port.getItem(PUZZLE_PROGRESS_KEY);if(raw===null)return {ok:true,value:fallback};const parsed:unknown=JSON.parse(raw);return validProgress(parsed)?{ok:true,value:parsed}:{ok:false,message:'本机题目记录格式不正确，原记录已保留。',fallback};}catch{return {ok:false,message:'暂时无法读取本机题目记录；仍可继续作答。',fallback};}
    },
    save(progress:PuzzleProgress):ProgressResult<PuzzleProgress>{
      if(!validProgress(progress))return {ok:false,message:'题目记录格式不正确，未覆盖旧记录。',fallback:progress};
      try{port.setItem(PUZZLE_PROGRESS_KEY,JSON.stringify(progress));return {ok:true,value:progress};}catch{return {ok:false,message:'暂时无法保存本机题目记录；本次作答仍可继续。',fallback:progress};}
    },
  };
}

export function recordPuzzleAttempt(progress:PuzzleProgress,id:string,puzzleRevision:number,verdict:PuzzleVerdict,hints:number[]):PuzzleProgress{
  const key=attemptKey(id,puzzleRevision),previous=progress.attempts[key];
  const hintLevels=[...new Set([...(previous?.hintLevels??[]),...hints])].sort();
  const attempt: PuzzleAttempt={puzzleId:id,puzzleRevision,attemptCount:(previous?.attemptCount??0)+1,hintLevels,lastVerdict:verdict,completed:Boolean(previous?.completed||verdict==='success'||verdict==='discussion')};
  return {...progress,revision:progress.revision+1,attempts:{...progress.attempts,[key]:attempt}};
}

export function currentAttempt(progress:PuzzleProgress,id:string,revision:number){return progress.attempts[attemptKey(id,revision)];}

import type {StoragePort} from '../../core/persistence';
import {browserStoragePort} from '../../core/unified-persistence';
import type {LearningProgress,ProgressResult,StageId,StageMark} from './types';

export const LEARNING_PROGRESS_KEY='go-club:learning-progress:v1';

export const emptyLearningProgress=():LearningProgress=>({
  schemaVersion:1,id:'LOCAL-LEARNING-PROGRESS',revision:1,rulesetId:'GO-CLUB-AREA-1',visitedModuleIds:[],stageMarks:{},recentModuleId:null,
});

function validProgress(value:unknown):value is LearningProgress{
  if(!value||typeof value!=='object')return false;
  const item=value as Partial<LearningProgress>;
  if(item.schemaVersion!==1||item.id!=='LOCAL-LEARNING-PROGRESS'||item.rulesetId!=='GO-CLUB-AREA-1'||typeof item.revision!=='number')return false;
  if(!Array.isArray(item.visitedModuleIds)||!item.visitedModuleIds.every(id=>typeof id==='string'))return false;
  if(item.recentModuleId!==null&&typeof item.recentModuleId!=='string')return false;
  if(!item.stageMarks||typeof item.stageMarks!=='object'||Array.isArray(item.stageMarks))return false;
  return Object.entries(item.stageMarks).every(([id,mark])=>/^STAGE-0[1-6]$/.test(id)&&(mark==='learned'||mark==='practice'));
}

const storageFailure=(fallback:LearningProgress):ProgressResult<LearningProgress>=>({ok:false,issue:{code:'STORAGE_UNAVAILABLE',message:'本机学习记录暂时无法读取或保存；你仍可继续浏览。'},fallback});
const invalidFailure=(fallback:LearningProgress):ProgressResult<LearningProgress>=>({ok:false,issue:{code:'INVALID_PROGRESS',message:'本机学习记录格式无法识别；内容资料没有被删除，可清除记录后重新开始。'},fallback});

export function createLearningProgressStore(port:StoragePort){
  return {
    load():ProgressResult<LearningProgress>{
      const fallback=emptyLearningProgress();
      try{
        const raw=port.getItem(LEARNING_PROGRESS_KEY);
        if(raw===null)return {ok:true,value:fallback};
        let parsed:unknown;try{parsed=JSON.parse(raw);}catch{return invalidFailure(fallback);}
        return validProgress(parsed)?{ok:true,value:parsed}:invalidFailure(fallback);
      }catch{return storageFailure(fallback);}
    },
    save(progress:LearningProgress):ProgressResult<LearningProgress>{
      const fallback=emptyLearningProgress();
      if(!validProgress(progress))return invalidFailure(fallback);
      try{port.setItem(LEARNING_PROGRESS_KEY,JSON.stringify(progress));return {ok:true,value:progress};}catch{return storageFailure(progress);}
    },
    clear():ProgressResult<LearningProgress>{
      const fallback=emptyLearningProgress();
      try{port.removeItem(LEARNING_PROGRESS_KEY);return {ok:true,value:fallback};}catch{return storageFailure(fallback);}
    },
  };
}

export function browserLearningProgressStore(){return createLearningProgressStore(browserStoragePort());}

export function recordVisit(progress:LearningProgress,moduleId:string):LearningProgress{
  const visited=progress.visitedModuleIds.includes(moduleId)?progress.visitedModuleIds:[...progress.visitedModuleIds,moduleId];
  if(visited===progress.visitedModuleIds&&progress.recentModuleId===moduleId)return progress;
  return {...progress,revision:progress.revision+1,visitedModuleIds:visited,recentModuleId:moduleId};
}

export function setStageMark(progress:LearningProgress,stageId:StageId,mark:StageMark|null):LearningProgress{
  const stageMarks={...progress.stageMarks};
  if(mark===null)delete stageMarks[stageId];else stageMarks[stageId]=mark;
  return {...progress,revision:progress.revision+1,stageMarks};
}

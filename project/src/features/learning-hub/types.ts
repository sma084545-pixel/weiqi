import type {LessonProgress} from '../advanced-courses/types';
export type ModuleAvailability='available'|'planned';

export interface ModuleRegistration {
  id:string;
  route:`#/${string}`;
  label:string;
  requiredContentIds:readonly string[];
  availability:ModuleAvailability;
  returnRoute:`#/${string}`;
  trackVisit:boolean;
  requiresNetwork?:boolean;
}

export type RouteResolution=
  |{ok:true;module:ModuleRegistration}
  |{ok:false;reason:'not-found'|'not-installed'|'missing-content';requestedRoute:string;fallbackRoute:`#/${string}`;module?:ModuleRegistration;missingContentIds?:readonly string[]};

export interface ModuleRegistry {
  modules:readonly ModuleRegistration[];
  availableModules:readonly ModuleRegistration[];
  resolve(route:string):RouteResolution;
  getById(id:string):ModuleRegistration|undefined;
}

export type StageId='STAGE-01'|'STAGE-02'|'STAGE-03'|'STAGE-04'|'STAGE-05'|'STAGE-06'|'STAGE-07'|'STAGE-08'|'STAGE-09'|'STAGE-10'|'STAGE-11'|'STAGE-12';
export type StageMark='learned'|'practice';

export interface LearningProgress {
  schemaVersion:1;
  id:'LOCAL-LEARNING-PROGRESS';
  revision:number;
  rulesetId:'GO-CLUB-AREA-1';
  visitedModuleIds:string[];
  stageMarks:Partial<Record<StageId,StageMark>>;
  recentModuleId:string|null;
  advancedLessons?:Record<string,LessonProgress>;
}

export interface ProgressIssue {code:'STORAGE_UNAVAILABLE'|'INVALID_PROGRESS';message:string}
export type ProgressResult<T>={ok:true;value:T}|{ok:false;issue:ProgressIssue;fallback:T};


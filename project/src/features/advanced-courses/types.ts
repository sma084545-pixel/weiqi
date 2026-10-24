import type {Coord,Position,Move} from '../../core/content.generated';
export type LearningTier='Practice'|'Challenge'|'Mastery';
export type Verdict='success'|'suboptimal'|'failure'|'unknown'|'illegal'|'incomplete';
export interface Choice {id:string;label:string;at?:Coord;verdict:'success'|'suboptimal'|'failure';explanation:string;highlight?:Coord[]}
export interface AuthoredLine {id:string;label:string;moves:Extract<Move,{type:'place'|'pass'}>[];notes:string[];captures:number[];outcome:string;verdict:'success'|'suboptimal'|'failure'}
export interface CourseScene {
  schemaVersion:1;id:string;revision:number;rulesetId:'GO-CLUB-AREA-1';kind:'CourseScene';
  lesson:number;tier:LearningTier;level:1|2|3;title:string;prompt:string;goal:string;
  position:Position;illustrations?:{id:string;title:string;position:Position;text:string}[];comparison?:{label:string;position:Position};
  interaction:'choice'|'compare'|'point'|'group'|'points'|'sequence';
  targets:{at:Coord;label:string}[];conditions:string[];hints:[string,string,string];
  choices:Choice[];expectedPoints?:Coord[];libertyTargets?:{at:Coord;expected:Coord[]}[];
  lines:AuthoredLine[];explanation:string;
  evidence:{basis:'counted-points'|'legal-lines'|'bounded-comparison';handCalculation:string;covered:string[];humanReviewed:null;sourceIds:string[]};
}
export interface Concept {id:string;title:string;text:string;sceneId:string;takeaway:string}
export interface CourseLesson {
 schemaVersion:1;id:string;revision:number;rulesetId:'GO-CLUB-AREA-1';kind:'CourseLesson';
 number:number;title:string;english:string;goal:string;question:string;introSceneId:string;
 concepts:Concept[];guidedSceneIds:string[];sceneIds:string[];summary:string[];
}
export interface CourseBundle {schemaVersion:1;id:string;revision:number;rulesetId:'GO-CLUB-AREA-1';kind:'AdvancedCourseBundle';lessons:CourseLesson[];scenes:CourseScene[];sources:{id:string;title:string;url:string;accessed:string;use:string}[]}
export type SceneResponse={kind:'choice';id:string}|{kind:'point'|'group';at:Coord}|{kind:'points';points:Coord[]}|{kind:'sequence';moves:Coord[]};
export interface SceneAttempt {sceneRevision:number;response:SceneResponse;verdict:Exclude<Verdict,'illegal'|'incomplete'>;hintsUsed:number}
export interface LessonProgress {lessonRevision:number;lastPage:string;visitedPages:string[];attempts:Record<string,SceneAttempt>;lastSceneId?:string;selfMarkRevision?:number;selfMark?:'learned'|'practice';guidedGameFinished?:boolean;reflectionSkills?:string[]}
export interface SceneFeedback {verdict:Verdict;message:string;detail:string;highlight?:Coord[];missing?:Coord[];extra?:Coord[]}

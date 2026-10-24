import type {CourseLesson,CourseScene,LessonProgress,SceneAttempt,SceneResponse} from './types';
const coord=(v:unknown):boolean=>!!v&&typeof v==='object'&&Number.isInteger((v as {row:number}).row)&&Number.isInteger((v as {col:number}).col)&&(v as {row:number}).row>=0&&(v as {row:number}).row<19&&(v as {col:number}).col>=0&&(v as {col:number}).col<19;
export function validResponse(v:unknown):v is SceneResponse {
 if(!v||typeof v!=='object')return false;const r=v as SceneResponse;
 if(r.kind==='choice')return typeof r.id==='string'&&r.id.length<80;
 if(r.kind==='point'||r.kind==='group')return coord(r.at);
 if(r.kind==='points')return Array.isArray(r.points)&&r.points.length<=361&&r.points.every(coord);
 return r.kind==='sequence'&&Array.isArray(r.moves)&&r.moves.length<=64&&r.moves.every(coord);
}
export function validLessonRecords(v:unknown):v is Record<string,LessonProgress> {
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length>100)return false;
 return Object.entries(v).every(([id,p])=>{
  const s=p as LessonProgress;
  return /^STAGE-(0[7-9]|1[0-2])@\d+$/.test(id)&&s&&(s.selfMark===undefined||s.selfMark==='learned'||s.selfMark==='practice')&&(s.selfMarkRevision===undefined||(Number.isSafeInteger(s.selfMarkRevision)&&s.selfMarkRevision>0))&&(s.lastSceneId===undefined||typeof s.lastSceneId==='string')&&(s.guidedGameFinished===undefined||typeof s.guidedGameFinished==='boolean')&&(s.reflectionSkills===undefined||(Array.isArray(s.reflectionSkills)&&s.reflectionSkills.length<=6&&s.reflectionSkills.every(x=>typeof x==='string')))&&Number.isSafeInteger(s.lessonRevision)&&s.lessonRevision>0&&typeof s.lastPage==='string'&&Array.isArray(s.visitedPages)&&s.visitedPages.length<=50&&s.visitedPages.every(x=>typeof x==='string')&&s.attempts&&typeof s.attempts==='object'&&Object.keys(s.attempts).length<=100&&Object.entries(s.attempts).every(([scene,a])=>/^ADV-\d{2}-\d{2}$/.test(scene)&&a&&Number.isSafeInteger(a.sceneRevision)&&a.sceneRevision>0&&['success','suboptimal','failure','unknown'].includes(a.verdict)&&Number.isInteger(a.hintsUsed)&&a.hintsUsed>=0&&a.hintsUsed<=3&&validResponse(a.response));
 });
}
export const lessonKey=(lesson:CourseLesson)=>`${lesson.id}@${lesson.revision}`;
export const emptyLessonProgress=(revision:number):LessonProgress=>({lessonRevision:revision,lastPage:'intro',visitedPages:[],attempts:{}});
export function visitLessonPage(progress:LessonProgress,page:string):LessonProgress {
 if(progress.lastPage===page&&progress.visitedPages.includes(page))return progress;
 return {...progress,lastPage:page,visitedPages:progress.visitedPages.includes(page)?progress.visitedPages:[...progress.visitedPages,page]};
}
export function saveSceneAttempt(progress:LessonProgress,scene:CourseScene,attempt:SceneAttempt):LessonProgress {
 return {...progress,attempts:{...progress.attempts,[scene.id]:{...attempt,sceneRevision:scene.revision}}};
}
export function currentSceneAttempt(progress:LessonProgress,scene:CourseScene){const a=progress.attempts[scene.id];return a?.sceneRevision===scene.revision?a:undefined;}
export function learningStatus(lesson:CourseLesson,progress:LessonProgress|undefined,mark:string|undefined){
 if(mark==='learned'&&progress?.selfMarkRevision===lesson.revision)return '已完成（自选标记）';
 return progress?.visitedPages.length?'学习中':'可学习';
}
export function practiceReadiness(lesson:CourseLesson,scenes:CourseScene[],progress:LessonProgress){
 const practice=scenes.filter(s=>lesson.sceneIds.includes(s.id)&&s.tier==='Practice');
 const completed=practice.filter(s=>['success','suboptimal'].includes(currentSceneAttempt(progress,s)?.verdict??'')).length;
 return {completed,total:practice.length,recommended:practice.length>0&&completed/practice.length>=.7};
}

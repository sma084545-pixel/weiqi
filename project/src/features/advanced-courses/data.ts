import raw from '../../../content/advanced-courses/bundle.json' with {type:'json'};
import type {CourseBundle} from './types';
export const courseBundle=raw as CourseBundle;
export const advancedLessons=courseBundle.lessons;
export const advancedScenes=courseBundle.scenes;
export const lessonByNumber=(n:number)=>advancedLessons.find(l=>l.number===n);
export const sceneById=(id:string)=>advancedScenes.find(s=>s.id===id);

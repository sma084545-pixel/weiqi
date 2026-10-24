import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import Ajv from 'ajv';
import bundle from '../content/advanced-courses/bundle.json';
import schema from '../schemas/advanced-course.schema.json';
import contentSchema from '../schemas/content.schema.json';
import {sceneState,replayLine,judgeScene} from '../src/features/advanced-courses/model';
import {getLiberties,getGroup,tryMove} from '../src/core/rules';
import type {CourseBundle} from '../src/features/advanced-courses/types';
const ajv=new Ajv({allErrors:true,strict:false});ajv.addSchema(contentSchema);const check=ajv.compile(schema);
const b=bundle as CourseBundle;
const errors:string[]=[];
if(!check(bundle))errors.push(...(check.errors??[]).map(e=>`${e.instancePath} ${e.message}`));
const ids=new Set<string>();const reports=[];
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const key=(p:{row:number;col:number})=>`${p.row},${p.col}`;
for(const scene of b.scenes){
 const issues:string[]=[];if(ids.has(scene.id))issues.push('duplicate stable id');ids.add(scene.id);
 const root=sceneState(scene);if(!root.ok)issues.push(`setup ${JSON.stringify(root.error)}`);
 for(const position of [scene.comparison?.position,...(scene.illustrations??[]).map(x=>x.position)].filter(Boolean)){
  const r=sceneState({...scene,position:position!});if(!r.ok)issues.push(`supplemental setup ${position!.id}`);
 }
 if(scene.interaction==='points'&&!scene.expectedPoints)issues.push('point set missing');
 if(scene.interaction==='sequence'&&!scene.lines.length)issues.push('sequence missing covered lines');
 if(scene.interaction==='group'&&scene.choices.some(c=>!c.at))issues.push('group candidate missing coordinate');
 if(root.ok){
  for(const target of scene.targets)if(target.at.row>=root.value.size||target.at.col>=root.value.size)issues.push('target out of board');
  for(const c of scene.choices){if(c.at&&scene.interaction==='point'){const r=tryMove(root.value,{type:'place',color:root.value.toPlay,at:c.at});if(!r.ok)issues.push(`candidate ${c.id} illegal ${r.error.code}`);}if(c.at&&scene.interaction==='group'){const g=getGroup(root.value.board,c.at);if(!g.ok||!g.value)issues.push(`group ${c.id} empty`);}}
  for(const t of scene.libertyTargets??[]){const r=getLiberties(root.value.board,t.at);if(!r.ok||!equal(r.value.map(key).sort(),t.expected.map(key).sort()))issues.push(`independently listed liberty set mismatch at ${key(t.at)}`);}
 }
 for(const line of scene.lines){try{const r=replayLine(scene,line);if(line.notes.length!==line.moves.length||line.captures.length!==line.moves.length)issues.push(`line ${line.id} lengths`);if(!equal(r.events.map(e=>e.captured.length),line.captures))issues.push(`independent capture counts mismatch ${line.id}`);}catch(e){issues.push(String(e));}}
 for(const c of scene.choices){const r=judgeScene(scene,c.at&&scene.interaction==='point'?{kind:'point',at:c.at}:c.at&&scene.interaction==='group'?{kind:'group',at:c.at}:{kind:'choice',id:c.id});if(r.verdict!==c.verdict)issues.push(`choice ${c.id} dispatch mismatch`);}
 reports.push({id:scene.id,revision:scene.revision,structural:issues.length?'failed':'passed',legalMoves:issues.length?'failed':'passed',independentExpectationCrossCheck:issues.length?'failed':'passed',comparisonEvidence:scene.evidence.basis,covered:scene.evidence.covered,humanReviewed:null,issues});errors.push(...issues.map(x=>`${scene.id}: ${x}`));
}
for(const lesson of b.lessons){if(ids.has(lesson.id))errors.push('duplicate lesson id');ids.add(lesson.id);for(const id of [lesson.introSceneId,...lesson.sceneIds,...lesson.guidedSceneIds,...lesson.concepts.map(c=>c.sceneId)])if(!b.scenes.some(s=>s.id===id&&s.lesson===lesson.number))errors.push(`${lesson.id} broken scene ${id}`);}
const report={schemaVersion:1,id:'ADVANCED-VALIDATION',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'ValidationReport',resultVersion:'0.23.0-pages.1',status:errors.length?'failed':'passed',formalPuzzlesUnchanged:30,advancedLessons:b.lessons.length,advancedScenes:b.scenes.length,notCountedAsFormalBank:true,checks:reports,errors,humanReviewed:null,limits:'Legal replay and literal point/capture vectors are checked. Strategic comparisons are bounded authored goals, not universal engine evaluations; no human/classroom review.'};
const output=process.argv.includes('--write');if(output){mkdirSync('docs/advanced-courses/checks',{recursive:true});writeFileSync('docs/advanced-courses/checks/content-validation.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,lessons:b.lessons.length,scenes:b.scenes.length,errors},null,2));if(errors.length)process.exitCode=1;

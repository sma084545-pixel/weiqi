import {readFileSync,readdirSync,writeFileSync,mkdirSync} from 'node:fs';
import {parseContent} from '../src/core/validation';
const root='content/examples';
const results:{file:string;status:string;details:unknown}[]=[];
for(const file of readdirSync(`${root}/valid`).filter(f=>f.endsWith('.json'))){const result=parseContent(readFileSync(`${root}/valid/${file}`,'utf8'));results.push({file:`valid/${file}`,status:result.ok?'passed':'failed',details:result.ok?{level:result.level,needsRulesReplay:result.needsRulesReplay}:result.issues});}
for(const file of ['content/t04/liberty-demos.json','content/t05/capture-demos.json','content/t08/development-terminal.json']){const result=parseContent(readFileSync(file,'utf8'));results.push({file,status:result.ok?'passed':'failed',details:result.ok?{level:result.level,needsRulesReplay:result.needsRulesReplay}:result.issues});}
const expected=JSON.parse(readFileSync(`${root}/expected-errors.json`,'utf8'));
for(const c of expected.cases){const result=parseContent(readFileSync(`${root}/${c.file}`,'utf8'));const matched=!result.ok&&result.issues.some(e=>e.code===c.expectedCode&&e.path===c.expectedPath);results.push({file:c.file,status:matched?'passed':'failed',details:result.ok?'Unexpectedly accepted':result.issues});}
mkdirSync('output/validation',{recursive:true});
writeFileSync('output/validation/content-report.json',JSON.stringify({schemaVersion:1,id:'REPORT-T00-CONTENT',revision:1,rulesetId:'GO-CLUB-AREA-1',command:'pnpm validate:content',generatedAt:new Date().toISOString(),scope:'Structure and contextual fields only; no game-rule replay or human review.',results},null,2)+'\n');
for(const r of results)console.log(`${r.status.toUpperCase()} ${r.file} ${JSON.stringify(r.details)}`);
if(results.some(r=>r.status==='failed'))process.exitCode=1;

import {createHash} from 'node:crypto';
import {mkdir,readdir,readFile,stat,writeFile} from 'node:fs/promises';
import {join,relative,resolve} from 'node:path';

const base=resolve(process.argv[2]??'');
if(!process.argv[2])throw new Error('Usage: node scripts/verify-t15-preservation.mjs /path/to/T14/go-club');
const root=resolve(import.meta.dirname,'..');
const guarded=[
  'schemas','src/core','src/components','pnpm-lock.yaml',
  'content/puzzles','content/endgames','content/artwork','content/print','content/t09','content/tools','content/validation','content/validation-report.md',
  'src/features/capture-game','src/features/capture-lab','src/features/cooperative','src/features/experiment-board','src/features/full-game','src/features/liberty-lab','src/features/life-lab','src/features/puzzle-runner','src/features/teacher-editor','src/features/territory',
  'materials/t12','materials/t13'
];
const sha=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
async function files(path){const info=await stat(path);if(info.isFile())return [path];const out=[];for(const name of await readdir(path))out.push(...await files(join(path,name)));return out;}
const results=[];
for(const item of guarded){
  const before=await files(join(base,item)),after=await files(join(root,item));
  const beforeMap=new Map(await Promise.all(before.map(async path=>[relative(join(base,item),path),await sha(path)])));
  const afterMap=new Map(await Promise.all(after.map(async path=>[relative(join(root,item),path),await sha(path)])));
  const names=[...new Set([...beforeMap.keys(),...afterMap.keys()])].sort();
  const changed=names.filter(name=>beforeMap.get(name)!==afterMap.get(name));
  results.push({path:item,status:changed.length?'changed':'identical',fileCount:afterMap.size,changed});
}
const report={schemaVersion:1,id:'T15-PRESERVATION-001',revision:1,rulesetId:'GO-CLUB-AREA-1',taskId:'T15',baseVersion:'0.14.0',resultVersion:'0.15.0',status:results.every(item=>item.status==='identical')?'passed':'failed',guarded:results};
await mkdir(join(root,'docs/t15'),{recursive:true});
await writeFile(join(root,'docs/t15/preservation-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,groups:results.length,files:results.reduce((sum,item)=>sum+item.fileCount,0),changed:results.flatMap(item=>item.changed)},null,2));
if(report.status!=='passed')process.exitCode=1;

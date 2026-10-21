import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
export function verifyOnlineDependencies(root=process.cwd()){
 const text=name=>readFileSync(resolve(root,name),'utf8');const json=name=>JSON.parse(text(name));
 const sha=name=>createHash('sha256').update(readFileSync(resolve(root,name))).digest('hex');
 const change=json('docs/online/DEPENDENCY_CHANGE.json'),base=json('docs/online/provenance/HISTORY-package.json'),current=json('package.json'),manifest=json('docs/online/provenance/HISTORY-RELEASE_MANIFEST.json');
 assert.equal(change.schemaVersion,1);assert.equal(change.id,'ONLINE-DEPENDENCY-CHANGE');assert.equal(change.rulesetId,'GO-CLUB-AREA-1');assert.equal(change.resultVersion,'0.20.0-online.1');assert.equal(change.baseVersion,manifest.resultVersion);
 assert.equal(sha('docs/online/provenance/HISTORY-pnpm-lock.yaml'),change.baseLockSha256);assert.equal(change.baseLockSha256,manifest.files.find(item=>item.path==='pnpm-lock.yaml').sha256);
 assert.equal(sha('docs/online/provenance/HISTORY-package.json'),change.basePackageSha256);assert.equal(change.basePackageSha256,manifest.files.find(item=>item.path==='package.json').sha256);
 assert.equal(sha('pnpm-lock.yaml'),change.resultLockSha256);assert.match(current.version,/^0\.20\.\d+$/); // Deployment-only patches retain this exact audited lock.
 assert.deepEqual(change.addedDependencies,{ws:'8.22.0'});assert.deepEqual(change.addedDevDependencies,{'@types/ws':'8.18.2'});
 assert.deepEqual(current.dependencies,{...base.dependencies,...change.addedDependencies});assert.deepEqual(current.devDependencies,{...base.devDependencies,...change.addedDevDependencies});
 return change;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){verifyOnlineDependencies();console.log('PASS: only the documented ws 8.22.0 and @types/ws 8.18.2 additions; prior direct versions preserved and exact lock fingerprint verified.');}

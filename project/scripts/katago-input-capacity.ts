import {writeFileSync} from 'node:fs';
import {prepareAnalysis} from '../server/analysis/position';
const events:unknown[]=[];
for(let i=0;i<533;i++)events.push({type:'pass',color:'B'},{type:'pass',color:'W'},{type:'resume',requestedBy:'B'});
events.push({type:'resign',color:'B'});
const before=process.memoryUsage(),start=performance.now();
const prepared=prepareAnalysis({schemaVersion:1,positionId:'DEV-CAPACITY-1600',reviewIndex:events.length,game:{setup:{schemaVersion:1,id:'DEV-CAPACITY-SETUP',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size:19,stones:[],toPlay:'B',historyPolicy:'fresh-setup',history:null},komi:0,events}});
const report={testKind:'real-rule-replay-input-boundary',status:'passed',platform:process.platform,events:events.length,kataGoMoves:prepared.turnNumber,elapsedMs:performance.now()-start,before,after:process.memoryUsage(),finalPhase:prepared.state.phase,limits:'128MiB JavaScript heap; native process measurement only, not cloud concurrency or engine memory.'};
writeFileSync('docs/katago/checks/input-capacity.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

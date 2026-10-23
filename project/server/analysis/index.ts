import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {KataGoEngine} from './engine';
import {createAnalysisServer} from './http';

const appRoot=process.env.APP_ROOT??process.cwd();
const manifest=JSON.parse(readFileSync(resolve(appRoot,'analysis-engine/engine-manifest.json'),'utf8'));
const origin=process.env.PUBLIC_ORIGIN??'https://sma084545-pixel.github.io';
if(new URL(origin).origin!==origin||(!origin.startsWith('https://')&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)))throw Error('PUBLIC_ORIGIN must be one exact origin');
const maxVisits=Number(process.env.KATAGO_MAX_VISITS??64);if(!Number.isInteger(maxVisits)||maxVisits<1||maxVisits>64)throw Error('KATAGO_MAX_VISITS must be1..64');
const engine=new KataGoEngine({executable:process.env.KATAGO_PATH??'/opt/katago/katago',args:['analysis','-config',process.env.KATAGO_CONFIG??resolve(appRoot,'analysis-engine/analysis.cfg'),'-model',process.env.KATAGO_MODEL??'/opt/katago/model.bin.gz','-quit-without-waiting'],
  version:manifest.engine.version,model:manifest.model.name,maxVisits,maxQueue:2,timeoutMs:90_000,startupTimeoutMs:180_000,
  log:(event,data)=>console.log(JSON.stringify({event,...data,at:new Date().toISOString()}))});
const server=createAnalysisServer(engine,origin);
const port=Number(process.env.PORT??4207);if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT invalid');
server.listen(port,'0.0.0.0',()=>{console.log(JSON.stringify({event:'http_listening',port,engine:'KataGo',version:manifest.engine.version}));engine.start();});
let stopping=false;
async function shutdown(){if(stopping)return;stopping=true;server.close();server.closeIdleConnections();await engine.stop();server.closeAllConnections();}
process.on('SIGTERM',()=>{void shutdown();});process.on('SIGINT',()=>{void shutdown();});

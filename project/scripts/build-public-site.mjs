import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const config=JSON.parse(readFileSync(new URL('../deploy/github-pages.json',import.meta.url),'utf8'));
assert.equal(config.schemaVersion,1);assert.equal(config.id,'GO-CLUB-PUBLIC-HOSTING');assert.equal(config.rulesetId,'GO-CLUB-AREA-1');assert.equal(config.protocolVersion,1);
const site=new URL(config.siteUrl),server=new URL(config.serverOrigin);
assert.equal(site.protocol,'https:');assert.equal(server.protocol,'https:');
for(const value of [site,server])assert.ok(!value.username&&!value.password&&!value.search&&!value.hash,'Public configuration must not contain credentials, queries or fragments.');
assert.equal(server.pathname,'/');assert.equal(typeof config.roomsEphemeral,'boolean');
let analysisOrigin='';
if(config.analysisOrigin){const analysis=new URL(config.analysisOrigin);assert.equal(analysis.protocol,'https:');assert.equal(analysis.pathname,'/');assert.ok(!analysis.username&&!analysis.password&&!analysis.search&&!analysis.hash);analysisOrigin=analysis.origin;}
const manager=process.env.npm_execpath;if(!manager)throw Error('Run with pnpm build:pages (or corepack pnpm build:pages).');
const result=spawnSync(process.execPath,[manager,'run','build'],{stdio:'inherit',env:{...process.env,VITE_KATAGO_API_ORIGIN:analysisOrigin,VITE_ONLINE_SERVER_URL:server.origin,VITE_ONLINE_SITE_ORIGIN:site.origin,VITE_ONLINE_EPHEMERAL_ROOMS:String(config.roomsEphemeral)}});
if(result.error)throw result.error;process.exit(result.status??1);

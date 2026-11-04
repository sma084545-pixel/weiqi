import {writeFileSync,mkdirSync} from 'node:fs';
import {rulesEngine} from '../src/core/rules';
const v=<T>(r:{ok:true;value:T}|{ok:false;error:unknown}):T=>{if(!r.ok)throw Error(JSON.stringify(r));return r.value;};
let game=v(rulesEngine.startGame({schemaVersion:1,id:'DEV-REVIEW-40-START',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size:13,toPlay:'B',stones:[],history:null,historyPolicy:'fresh-setup'},{mode:'full-game',komi:0,gameId:'LOCAL-T08-FULL-GAME'}));
for(let i=0;i<45;i++)game=v(rulesEngine.tryMove(game,{type:'place',color:game.toPlay,at:{row:2*Math.floor(i/7),col:2*(i%7)}})).nextState;
mkdirSync('docs/game-review/fixtures',{recursive:true});
writeFileSync('docs/game-review/fixtures/development-40.json',JSON.stringify({schemaVersion:1,id:'DEV-REVIEW-BROWSER-40',revision:1,rulesetId:'GO-CLUB-AREA-1',developmentOnly:true,note:'Developer-generated legal path; expected index40 has20B/20W, zero captures, Black toPlay. Not formal teaching or member data.',game},null,2)+'\n');

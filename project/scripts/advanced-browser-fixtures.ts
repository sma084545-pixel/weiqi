import {writeFileSync,mkdirSync} from 'node:fs';
import {advancedLessons,advancedScenes} from '../src/features/advanced-courses/data';
import {createFullGameMatch,startFullGame,playAt} from '../src/features/full-game/model';
let started=startFullGame(createFullGameMatch());if(!started.ok)throw Error('test setup');let match=started.value;
for(const at of [{row:2,col:2},{row:6,col:6}]){const next=playAt(match,at);if(!next.ok)throw Error('test move');match=next.value;}
const scenes=advancedScenes.map(s=>({id:s.id,title:s.title,interaction:s.interaction,positive:s.choices.find(c=>c.verdict==='success'),points:s.expectedPoints,line:s.lines.find(l=>l.verdict==='success'),initialStones:s.position.stones.length}));
mkdirSync('docs/advanced-courses/checks',{recursive:true});
writeFileSync('docs/advanced-courses/checks/browser-input.json',JSON.stringify({schemaVersion:1,id:'ADVANCED-BROWSER-TEST-INPUT',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'DeveloperTestInput',purpose:'Explicit synthetic test data, not participant feedback or achieved learning. Used only in isolated disposable contexts.',lessons:advancedLessons,scenes,legacyGame:match.game},null,2)+'\n');

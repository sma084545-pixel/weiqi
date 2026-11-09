import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {diagramSource,svgForDiagram,pdfForDiagram} from '../src/features/file-exchange/graphics';
import type {Position,Size} from '../src/core/content.generated';
const out='docs/star-points/checks/exports';mkdirSync(out,{recursive:true});
const cases=[{size:5,count:1,centre:'2,2'},{size:9,count:5,centre:'4,4'},{size:13,count:5,centre:'6,6'},{size:19,count:9,centre:'9,9'}] as const;
const checks=[];
for(const {size,count,centre} of cases){
 const position:Position={schemaVersion:1,id:`DEV-STARS-${size}`,revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size:size as Size,toPlay:'B',stones:[],history:null,historyPolicy:'fresh-setup'};
 const source=diagramSource(position)!;const svg=svgForDiagram(source);assert.equal((svg.match(/class="star-point"/g)??[]).length,count);
 const [row,col]=centre.split(',');assert.ok(svg.includes(`data-star-row="${row}" data-star-col="${col}"`));assert.ok(svg.indexOf('data-layer="star-points"')<svg.indexOf('data-layer="stones"'));
 const pdf=pdfForDiagram(source);assert.equal((new TextDecoder().decode(pdf).match(/0\.15 0\.14 0\.12 rg/g)??[]).length,count);
 writeFileSync(`${out}/${position.id}.svg`,svg);writeFileSync(`${out}/${position.id}.pdf`,pdf);checks.push({size,count,centre,svg:'passed',pdf:'passed'});
}
const source=diagramSource({schemaVersion:1,id:'DEV-STARS-CROP',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size:19,toPlay:'B',stones:[],history:null,historyPolicy:'fresh-setup'} satisfies Position)!;
const cropped=svgForDiagram(source,{crop:{rowStart:0,colStart:0,rowEnd:4,colEnd:4}});assert.equal((cropped.match(/class="star-point"/g)??[]).length,1);assert.ok(cropped.includes('data-star-row="3" data-star-col="3"'));assert.ok(!cropped.includes('data-star-row="2" data-star-col="2"'));
writeFileSync(`${out}/DEV-STARS-CROP.svg`,cropped);
writeFileSync('docs/star-points/checks/exports.json',JSON.stringify({schemaVersion:1,id:'BOARD-STARS-EXPORT-CHECK',revision:1,rulesetId:'GO-CLUB-AREA-1',status:'passed',checks,crop:'original full-board coordinates preserved; no invented crop-centre star',note:'Explicit development empty positions, not formal puzzles or student records.'},null,2)+'\n');
console.log(JSON.stringify({status:'passed',sizes:checks.length,crop:'passed'}));

import {mkdir,writeFile} from 'node:fs/promises';
import {T14_TEMPLATES} from '../src/features/teacher-editor/templates';
import {batchDiagramZip,diagramSource,pdfForDiagram,svgForDiagram} from '../src/features/file-exchange/graphics';
import {previewSgf,serializeSgfTree} from '../src/features/file-exchange/sgf';

const out=new URL('../content/t15/',import.meta.url),samples=new URL('./samples/',out),exportsDir=new URL('./exports/',out);await mkdir(samples,{recursive:true});await mkdir(exportsDir,{recursive:true});
const puzzle=structuredClone(T14_TEMPLATES[0]);puzzle.id='TEST-T15-LIB-ROUNDTRIP';puzzle.initialPosition.id='POS-TEST-T15-LIB-ROUNDTRIP';puzzle.prompt='开发往返样例：数出目标黑子的气。';puzzle.sources[0].note+=' T15 开发样例，不计入正式30题。';
await writeFile(new URL('TEST-T15-LIB-ROUNDTRIP.json',samples),JSON.stringify(puzzle,null,2)+'\n');
const sgf='(;GM[1]FF[4]CA[UTF-8]AP[GoClub:0.15.0]SZ[19]RU[GO-CLUB-AREA-1]KM[0]PL[B]AB[aa]AW[ss]C[中文、右括号 \\]、反斜线 \\\\ 与 (括号)];B[as];W[](;B[sa]C[分支一])(;B[bb]C[分支二]))';
await writeFile(new URL('TEST-T15-two-branches.sgf',samples),sgf+'\n');const parsed=previewSgf(sgf,'TEST-T15-two-branches.sgf');if(!parsed.ok)throw new Error(JSON.stringify(parsed.issues));await writeFile(new URL('TEST-T15-two-branches-roundtrip.sgf',samples),serializeSgfTree(parsed.games[0]));
const source=diagramSource(puzzle)!;await writeFile(new URL('TEST-T15-LIB-r1-question.svg',exportsDir),svgForDiagram(source,{preset:'question'}));await writeFile(new URL('TEST-T15-LIB-r1-answer.svg',exportsDir),svgForDiagram(source,{preset:'answer'}));await writeFile(new URL('TEST-T15-LIB-r1-question.pdf',exportsDir),pdfForDiagram(source,{preset:'question',printWidthMm:160}));
const batch=await batchDiagramZip(T14_TEMPLATES.map(item=>diagramSource(item)!), 'svg',{preset:'question'});await writeFile(new URL('T15-question-svg-batch.zip',exportsDir),batch.zip);await writeFile(new URL('T15-question-svg-manifest.json',exportsDir),JSON.stringify(batch.manifest,null,2)+'\n');
console.log('T15 samples created');

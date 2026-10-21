import {describe,it,expect} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';
import {validateContent,parseContent} from '../src/core/validation';
const read=(name:string)=>JSON.parse(readFileSync(`content/examples/valid/${name}.json`,'utf8'));
const reject=(value:unknown,code:string,path:string)=>{const before=JSON.stringify(value);const result=validateContent(value);expect(result.ok).toBe(false);if(!result.ok)expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({code,path})]));expect(JSON.stringify(value)).toBe(before);};
describe('closed structure and contextual validation',()=>{
 for(const file of readdirSync('content/examples/valid').filter(f=>f.endsWith('.json')))it(`accepts developer ${file}`,()=>expect(validateContent(read(file.slice(0,-5))).ok).toBe(true));
 const negatives=JSON.parse(readFileSync('content/examples/expected-errors.json','utf8'));
 for(const c of negatives.cases)it(`rejects ${c.file} without mutation`,()=>reject(JSON.parse(readFileSync(`content/examples/${c.file}`,'utf8')),c.expectedCode,c.expectedPath));
 it('rejects negative coordinates',()=>{const p=read('position');p.stones[0].row=-1;reject(p,'SCHEMA_FIELD','/stones/0/row');});
 it('rejects fractional coordinates',()=>{const p=read('position');p.stones[0].col=1.5;reject(p,'SCHEMA_FIELD','/stones/0/col');});
 it('rejects unknown nested major version',()=>{const p=read('puzzle');p.initialPosition.schemaVersion=7;const r=validateContent(p);expect(r.ok).toBe(false);if(!r.ok)expect(r.issues.some(e=>e.path==='/initialPosition/schemaVersion')).toBe(true);});
 it('does not invent history for recorded positions',()=>{const p=read('position');p.historyPolicy='recorded';expect(validateContent(p).ok).toBe(false);});
 it('rejects fabricated fresh-setup history',()=>{const p=read('position');p.history={layouts:['5|............B............']};expect(validateContent(p).ok).toBe(false);});
 it('accepts a structurally recorded board but requires rule verification',()=>{const p=read('position');p.historyPolicy='recorded';p.history={layouts:['5|............B............']};const r=validateContent(p);expect(r.ok).toBe(true);if(r.ok)expect(r.needsRulesReplay).toBe(true);});
 it('recorded current board must be final layout',()=>{const p=read('position');p.historyPolicy='recorded';p.history={layouts:['5|.........................']};reject(p,'HISTORY_CURRENT','/history/layouts');});
 it('distinguishes setup from moves',()=>{const p=read('move');p.move={type:'setup-set',at:{row:0,col:0},color:'B'};expect(validateContent(p).ok).toBe(false);});
 it('rejects mis-sized matrix',()=>{const p=read('game');p.board.pop();reject(p,'BOARD_SHAPE','/board');});
 it('accepts null matrix but not null sparse stone',()=>{expect(validateContent(read('game')).ok).toBe(true);const p=read('position');p.stones[0].color=null;reject(p,'SCHEMA_FIELD','/stones/0/color');});
 it('rejects empty target',()=>{const p=read('puzzle');p.targetMarkers[0].points=[{row:0,col:0}];reject(p,'TARGET_EMPTY','/targetMarkers/0/points/0');});
 it('rejects different first player',()=>{const p=read('puzzle');p.firstPlayer='B';reject(p,'FIRST_PLAYER','/firstPlayer');});
 it('does not convert model check into human review',()=>{const p=read('puzzle');p.validation.modelChecked={status:'partial',method:'model-only',checkedAt:'2026-09-05',evidence:['development calculation']};const r=validateContent(p);expect(r.ok).toBe(true);expect(p.validation.humanReviewed).toBeNull();});
 it.each([
 {type:'open-text',criteria:['说明一个理由'],sampleConsiderations:[],automaticVerdict:false},
 {type:'number',value:4,explanation:'四个气'},
 {type:'region-labels',labels:[{at:{row:0,col:0},owner:'unknown'}],explanation:'预览'},
 {type:'reason-choice',options:[{optionId:'a',text:'正交'},{optionId:'b',text:'斜邻'}],acceptedOptionIds:['a'],explanation:'连接判断'}
 ])('supports independent response/answer $type',answer=>{const p=read('puzzle');p.answer=answer;expect(validateContent(p).ok).toBe(true);});
 it('does not give DISC a unique move answer',()=>{const p=read('puzzle');p.category='DISC';reject(p,'DISC_OPEN','/answer/type');});
 it('rejects proven terminal label without evidence',()=>{const p=read('puzzle');p.answer={type:'move-tree',rootNodeId:'root',nodes:[{nodeId:'root',move:null,children:[],outcome:'success',terminalStatus:'verified-alive',evidence:[],explanation:'unsupported'}],uncoveredPolicy:'unknown',uniquenessClaim:false,uniquenessEvidence:[]};reject(p,'TERMINAL_EVIDENCE','/answer/nodes/0/evidence');});
 it('rejects cyclic move tree',()=>{const p=read('puzzle');p.answer={type:'move-tree',rootNodeId:'root',nodes:[{nodeId:'root',move:null,children:['root'],outcome:'unknown',terminalStatus:'unknown',evidence:[],explanation:''}],uncoveredPolicy:'unknown',uniquenessClaim:false,uniquenessEvidence:[]};reject(p,'TREE_CYCLE','/answer/nodes');});
 it('rejects bundle revision mismatch',()=>{const p=read('bundle');p.items.find((x:any)=>x.kind==='Lesson').contentRefs[0].revision=99;const r=validateContent(p);expect(r.ok).toBe(false);if(!r.ok)expect(r.issues.some(e=>e.code==='CONTENT_REFERENCE')).toBe(true);});
 it('rejects settled score for an unsettled fixture',()=>{const p=read('terminal');p.status='unsettled';reject(p,'UNSETTLED_SCORE','/expectedScore');});
 it('rejects extra prisoner points',()=>{const p=read('terminal');p.expectedScore.blackTotal=17;reject(p,'SCORE_ARITHMETIC','/expectedScore');});
 it('leaves rule legality unchecked even for zero-liberty setup',()=>{const p=read('position');p.stones=[{row:0,col:0,color:'B'},{row:0,col:1,color:'W'},{row:1,col:0,color:'W'}];const r=validateContent(p);expect(r.ok).toBe(true);if(r.ok)expect(r.level).toBe('structural');});
 it('preserves HTML as inert text and never fetches source URLs',()=>{const p=read('puzzle');p.prompt='<script>throw new Error("x")</script>';expect(parseContent(JSON.stringify(p)).ok).toBe(true);});
 it('rejects script URLs in source fields',()=>{const p=read('puzzle');p.sources[0].url='javascript:alert(1)';expect(validateContent(p).ok).toBe(false);});
 it('malformed JSON is recoverable',()=>{expect(parseContent('{')).toEqual({ok:false,issues:[{code:'JSON_PARSE',path:'/',message:expect.any(String)}]});});
 it('limits import size',()=>{const r=parseContent('x'.repeat(2_000_001));expect(r.ok).toBe(false);if(!r.ok)expect(r.issues[0].code).toBe('IMPORT_SIZE');});
});
it('requires context for coordinate feedback',()=>{const p=read('feedback-blank');p.response={type:'point-set',points:[{row:0,col:0}]};reject(p,'RESPONSE_CONTEXT','/responseContext');});
it('uses feedback context for relative bounds',()=>{const p=read('feedback-blank');p.responseContext={size:5,contentRef:null};p.response={type:'point-set',points:[{row:5,col:0}]};reject(p,'COORD_BOUNDS','/response/points/0/row');});

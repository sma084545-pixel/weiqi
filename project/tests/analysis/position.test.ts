import {describe,it,expect} from 'vitest';
import {prepareAnalysis,normalizeAnalysis,KATAGO_RULES} from '../../server/analysis/position';
import {displayCoord,parseCoord} from '../../src/core/coordinates';
import type {Size} from '../../src/core/content.generated';
const request=(size:Size=5)=>({schemaVersion:1,positionId:`test-${size}`,reviewIndex:1,game:{setup:{schemaVersion:1,id:'DEV-ANALYSIS-SETUP',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size,stones:[],toPlay:'B',historyPolicy:'fresh-setup',history:null},komi:0,events:[{type:'place',color:'B',at:{row:0,col:0}},{type:'resign',color:'W'}]}});
describe('analysis contract: independent coordinate and rule expectations',()=>{
 for(const size of [5,9,13,19] as const)it(`${size} four corners, first turn, pass and real setup`,()=>{
   const n=size;expect(displayCoord({row:0,col:0},n)).toBe(`A${n}`);expect(displayCoord({row:n-1,col:n-1},n)).toBe(`${n===5?'E':n===9?'J':n===13?'N':'T'}1`);expect(parseCoord('I1',n)).toBeNull();
   const data=request(n),p=prepareAnalysis(data);expect(p.query.moves).toEqual([['B',`A${n}`]]);expect(p.state.toPlay).toBe('W');expect(p.query.rules).toEqual(KATAGO_RULES);expect((p.query.rules as any).whiteHandicapBonus).toBe('0');
   data.reviewIndex=0;expect(prepareAnalysis(data).query.moves).toEqual([]);
 });
 it('does not invent an order for starting stones; preserves pass and handicap white first',()=>{
   const d:any=request(9);d.game.setup.toPlay='W';d.game.setup.stones=[{row:0,col:0,color:'B'},{row:8,col:8,color:'B'}];d.game.events=[{type:'pass',color:'W'},{type:'resign',color:'B'}];
   const p=prepareAnalysis(d);expect(p.query.initialPlayer).toBe('W');expect(p.query.initialStones).toEqual([['B','A9'],['B','J1']]);expect(p.query.moves).toEqual([['W','pass']]);expect(p.state.toPlay).toBe('B');
 });
 it('dispute preserves two passes and original stones/history without dead-stone mutation',()=>{
   const d:any=request();d.game.events=[{type:'place',color:'B',at:{row:0,col:0}},{type:'pass',color:'W'},{type:'pass',color:'B'},{type:'resume',requestedBy:'W'},{type:'place',color:'W',at:{row:4,col:4}},{type:'resign',color:'B'}];d.reviewIndex=5;
   const p=prepareAnalysis(d);expect(p.query.moves).toEqual([['B','A5'],['W','pass'],['B','pass'],['W','E1']]);expect(p.state.history.layouts).toHaveLength(3);expect(p.state.board[0][0]).toBe('B');expect(p.state.toPlay).toBe('B');
 });
 it.each([
   ['schema', (d:any)=>d.schemaVersion=2,'/schemaVersion'],
   ['rules',(d:any)=>d.game.setup.rulesetId='chinese','/game/setup/rulesetId'],
   ['fractional komi',(d:any)=>d.game.komi=1.1,'/game/komi'],
   ['wrong turn',(d:any)=>d.game.events[0].color='W','/game/events/0'],
   ['out of bounds',(d:any)=>d.game.events[0].at.row=5,'/game/events/0'],
   ['arbitrary params',(d:any)=>d.overrideSettings={maxVisits:999999},'/'],
   ['unknown setup history',(d:any)=>d.game.setup.historyPolicy='recorded','/game/setup'],
   ['duplicate setup',(d:any)=>d.game.setup.stones=[{row:0,col:0,color:'B'},{row:0,col:0,color:'W'}],'/game/setup'],
   ['index',(d:any)=>d.reviewIndex=3,'/reviewIndex'],
 ])('rejects %s with field',(_name,mutate,path)=>{const d=request();(mutate as any)(d);try{prepareAnalysis(d);expect.fail();}catch(e:any){expect(e.field).toContain(path);}});
 it('unfinished game cannot obtain analysis',()=>{const d=request();d.game.events.pop();expect(()=>prepareAnalysis(d)).toThrow('先完成');});
 it('full black perspective is not inverted when white to play, filters occupied moves and invalid PV continuation',()=>{
   const p=prepareAnalysis(request());const raw={id:'id1',turnNumber:1,isDuringSearch:false,rootInfo:{currentPlayer:'W',winrate:.7,scoreLead:2.5,visits:64},moveInfos:[{move:'A5',winrate:.9,scoreLead:10,visits:30,pv:['A5']},{move:'E1',winrate:.7,scoreLead:2.5,visits:30,pv:['E1','A5']},{move:'pass',winrate:.6,scoreLead:1,visits:4,pv:['pass','C3']}]};
   const result=normalizeAnalysis(raw,p,'id1',20,{version:'1.18.1',model:'test',maxVisits:64});expect(result.blackWinrate).toBe(.7);expect(result.blackScoreLead).toBe(2.5);expect(result.candidates).toHaveLength(2);expect(result.candidates[0].pv).toEqual([{type:'place',at:{row:4,col:4}}]);expect(result.candidates[1].move).toEqual({type:'pass'});
   expect(()=>normalizeAnalysis({...raw,id:'old'},p,'new',0,{version:'1',model:'x',maxVisits:64})).toThrow('不匹配');
 });
});

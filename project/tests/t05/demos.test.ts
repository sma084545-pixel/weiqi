import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import rawBundle from '../../content/t05/capture-demos.json';
import {CAPTURE_DEMOS,CAPTURE_DEMO_IDS} from '../../src/features/capture-lab/demos';
import {parseContent} from '../../src/core/validation';
import {rulesEngine} from '../../src/core/rules';
import type {Coord} from '../../src/core/content.generated';

const fixture=JSON.parse(readFileSync('tests/fixtures/t05-capture-expected.json','utf8')) as {vectors:{id:string;candidate:Coord;captured:Coord[];finalLiberties:Coord[];illegalComparison?:{at:Coord;error:string}}[]};
const sort=(points:readonly Coord[])=>[...points].sort((a,b)=>a.row-b.row||a.col-b.col);

describe('T05 fixed capture demos',()=>{
  it('loads exactly six stable development puzzles with separate validation evidence',()=>{
    expect(CAPTURE_DEMO_IDS).toEqual(['DEMO-CAP-001','DEMO-CAP-002','DEMO-CAP-003','DEMO-CAP-004','DEMO-CAP-005','DEMO-CAP-006']);
    const parsed=parseContent(JSON.stringify(rawBundle));expect(parsed.ok).toBe(true);
    for(const demo of CAPTURE_DEMOS){expect(demo.puzzle.developmentOnly).toBe(true);expect(demo.puzzle.category).toBe('CAP');expect(demo.puzzle.validation.structure?.status).toBe('passed');expect(demo.puzzle.validation.moveLegality?.status).toBe('passed');expect(demo.puzzle.validation.solutionChecked?.status).toBe('passed');expect(demo.puzzle.validation.humanReviewed).toBeNull();}
  });

  it('cross-checks every independent expected capture and final-liberty set through T01',()=>{
    for(const vector of fixture.vectors){
      const demo=CAPTURE_DEMOS.find(item=>item.id===vector.id)!;
      const setup=rulesEngine.validateSetup(demo.puzzle.initialPosition);expect(setup.ok,vector.id).toBe(true);
      const game=rulesEngine.startGame(demo.puzzle.initialPosition,{mode:'full-game',komi:0,gameId:`TEST-${vector.id}`});expect(game.ok).toBe(true);if(!game.ok)continue;
      const trial=rulesEngine.tryMove(game.value,{type:'place',color:'B',at:vector.candidate});expect(trial.ok,vector.id).toBe(true);if(!trial.ok)continue;
      expect(sort(trial.value.event.captured),`${vector.id} captured`).toEqual(sort(vector.captured));
      expect(sort(trial.value.event.libertiesAfter),`${vector.id} liberties`).toEqual(sort(vector.finalLiberties));
      expect(game.value.moves).toHaveLength(0);
    }
  });

  it('captures four distinct groups without duplicates and accepts no-capture as a legal move',()=>{
    const multi=fixture.vectors[2],none=fixture.vectors[3];
    for(const [vector,count] of [[multi,4],[none,0]] as const){const demo=CAPTURE_DEMOS.find(item=>item.id===vector.id)!;const start=rulesEngine.startGame(demo.puzzle.initialPosition,{mode:'full-game',komi:0,gameId:vector.id});if(!start.ok)throw new Error('setup');const trial=rulesEngine.tryMove(start.value,{type:'place',color:'B',at:vector.candidate});if(!trial.ok)throw new Error(trial.error.code);expect(new Set(trial.value.event.captured.map(point=>`${point.row},${point.col}`)).size).toBe(count);expect(trial.value.event.captured).toHaveLength(count);}
  });

  it('accepts capture-first liberty and rejects true suicide without changing state',()=>{
    const vector=fixture.vectors[5],demo=CAPTURE_DEMOS[5];const start=rulesEngine.startGame(demo.puzzle.initialPosition,{mode:'full-game',komi:0,gameId:'COMPARE'});if(!start.ok)throw new Error('setup');
    const before=JSON.stringify(start.value);const illegal=rulesEngine.tryMove(start.value,{type:'place',color:'B',at:vector.illegalComparison!.at});expect(illegal).toEqual({ok:false,error:{code:'SUICIDE',field:'/move/at',at:{row:4,col:4}}});expect(JSON.stringify(start.value)).toBe(before);
    const legal=rulesEngine.tryMove(start.value,{type:'place',color:'B',at:vector.candidate});expect(legal.ok).toBe(true);if(legal.ok)expect(legal.value.event.captured).toHaveLength(3);
  });
});

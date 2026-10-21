import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import expected from '../fixtures/t04-liberty-expected.json';
import {parseContent} from '../../src/core/validation';
import {rulesEngine} from '../../src/core/rules';
import {LIBERTY_DEMOS,demoBoardStones} from '../../src/features/liberty-lab/demos';

const keys=(points:readonly {row:number;col:number}[])=>points.map(point=>`${point.row},${point.col}`).sort();

describe('T04 development demos',()=>{
  it('loads one schema-valid bundle with eight stable development IDs',()=>{
    const parsed=parseContent(readFileSync('content/t04/liberty-demos.json','utf8'));
    expect(parsed.ok).toBe(true);
    expect(LIBERTY_DEMOS.map(demo=>demo.id)).toEqual(Array.from({length:8},(_,index)=>`DEMO-LIB-${String(index+1).padStart(3,'0')}`));
    for(const demo of LIBERTY_DEMOS){
      expect(demo.puzzle.developmentOnly).toBe(true);
      expect(demo.puzzle.validation.humanReviewed).toBeNull();
      expect(demo.puzzle.answer.type).toBe('point-set');
      expect(demo.puzzle.sources.every(source=>source.type==='original')).toBe(true);
    }
  });

  it('cross-checks every independent group and liberty vector with T01',()=>{
    for(const vector of expected.cases){
      const demo=LIBERTY_DEMOS.find(item=>item.id===vector.id)!;
      const phase=demo.phases.find(item=>item.id===vector.phase)!;
      const group=rulesEngine.getGroup(phase.board,vector.target);
      const liberties=rulesEngine.getLiberties(phase.board,vector.target);
      expect(group.ok,`${vector.id}/${vector.phase} group`).toBe(true);
      expect(liberties.ok,`${vector.id}/${vector.phase} liberties`).toBe(true);
      if(group.ok&&liberties.ok){expect(keys(group.value?.stones??[])).toEqual(keys(vector.group));expect(keys(liberties.value)).toEqual(keys(vector.liberties));}
      const setup=rulesEngine.validateSetup({schemaVersion:1,id:`CHECK-${vector.id}-${vector.phase}`,revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size:5,stones:demoBoardStones(phase.board),toPlay:'W',historyPolicy:'fresh-setup',history:null});
      expect(setup.ok,`${vector.id}/${vector.phase} setup`).toBe(true);
    }
  });

  it('keeps content answers equal to the independently recorded before vectors',()=>{
    for(const demo of LIBERTY_DEMOS){
      const vector=expected.cases.find(item=>item.id===demo.id&&item.phase==='before')!;
      expect(demo.puzzle.answer.type).toBe('point-set');
      if(demo.puzzle.answer.type==='point-set')expect(keys(demo.puzzle.answer.points)).toEqual(keys(vector.liberties));
    }
  });

  it('proves diagonal stones stay separate and shared liberties are unique',()=>{
    const diagonal=LIBERTY_DEMOS[4].phases[0].board;
    const first=rulesEngine.getGroup(diagonal,{row:1,col:1});
    const second=rulesEngine.getGroup(diagonal,{row:2,col:2});
    expect(first.ok&&first.value?.stones.length).toBe(1);expect(second.ok&&second.value?.stones.length).toBe(1);
    const shared=rulesEngine.getLiberties(LIBERTY_DEMOS[5].phases[0].board,{row:2,col:1});
    expect(shared.ok&&shared.value.length).toBe(7);
    if(shared.ok)expect(new Set(keys(shared.value)).size).toBe(shared.value.length);
  });

  it('freezes the loaded task definitions so interaction cannot rewrite them',()=>{
    expect(Object.isFrozen(LIBERTY_DEMOS)).toBe(true);
    expect(Object.isFrozen(LIBERTY_DEMOS[0].puzzle)).toBe(true);
    expect(Object.isFrozen(LIBERTY_DEMOS[7].phases[1].board)).toBe(true);
  });
});

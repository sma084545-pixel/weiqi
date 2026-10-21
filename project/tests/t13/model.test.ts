import {describe,expect,it} from 'vitest';
import type {AreaOwner,PointLabels} from '../../src/features/territory/model';
import {
  END_FIXTURES,captureComparison,commitLabels,emptyLabelHistory,fixtureBoard,gradeRegions,
  labelPoint,regionEvidence,terminalDecision,undoLabels,verifiedFixtureScore,
} from '../../src/features/territory/model';

const key=(point:{row:number;col:number})=>point.row+','+point.col;
const expectedLabels=(fixtureId:string):PointLabels=>{
  const fixture=END_FIXTURES.find(item=>item.id===fixtureId)!;
  const score=verifiedFixtureScore(fixture)!;
  const out:PointLabels={};
  for(const point of score.blackTerritory)out[key(point)]='B';
  for(const point of score.whiteTerritory)out[key(point)]='W';
  for(const point of score.neutralPoints)out[key(point)]='neutral';
  return out;
};

describe('T13 terminal fixtures and scoring boundaries',()=>{
  it('loads exactly END-001 through END-006 at published revision 1',()=>{
    expect(END_FIXTURES.map(item=>item.id)).toEqual(['END-001','END-002','END-003','END-004','END-005','END-006']);
    expect(END_FIXTURES.every(item=>item.revision===1&&item.rulesetId==='GO-CLUB-AREA-1')).toBe(true);
  });

  it('keeps the unsettled counterexample scoreless and gives both recovery choices',()=>{
    const fixture=END_FIXTURES[5];
    expect(fixture.status).toBe('unsettled');expect(verifiedFixtureScore(fixture)).toBeNull();
    expect(terminalDecision(fixture,'ready').ok).toBe(false);
    expect(terminalDecision(fixture,'continue-play').ok).toBe(true);
    expect(terminalDecision(fixture,'confirm-dispute').ok).toBe(true);
  });

  it('recomputes all five teaching fixtures through T01 scoreArea and matches independent T09 vectors',()=>{
    for(const fixture of END_FIXTURES.slice(0,5)){
      const actual=verifiedFixtureScore(fixture);
      expect(actual,fixture.id).toEqual(fixture.expectedScore);
      expect(terminalDecision(fixture,'ready').ok).toBe(true);
      expect(terminalDecision(fixture,'continue-play').ok).toBe(false);
      expect(actual!.blackStones+actual!.whiteStones+actual!.blackTerritory.length+actual!.whiteTerritory.length+actual!.neutralPoints.length).toBe(25);
    }
  });

  it('removes only explicitly agreed dead stones for the exercise board',()=>{
    const fixture=END_FIXTURES.find(item=>item.id==='END-003')!;
    expect(fixtureBoard(fixture)[0][2]).toBe('W');
    expect(fixtureBoard(fixture,true)[0][2]).toBeNull();
    expect(fixtureBoard(END_FIXTURES[5],true)[2][2]).toBe('W');
  });
});

describe('T13 connected-region answers',()=>{
  it('uses T01 ownership while exposing auditable connected boundaries',()=>{
    for(const fixture of END_FIXTURES.slice(0,5)){
      const regions=regionEvidence(fixture);
      const labels=expectedLabels(fixture.id);
      expect(regions.flatMap(region=>region.points).map(key).sort()).toEqual(Object.keys(labels).sort());
      expect(gradeRegions(regions,labels).every(item=>item.status==='correct'),fixture.id).toBe(true);
      for(const region of regions)expect(new Set(region.points.map(point=>labels[key(point)]))).toEqual(new Set([region.owner]));
    }
  });

  it('marks one point or a whole connected region and supports undo',()=>{
    const fixture=END_FIXTURES.find(item=>item.id==='END-002')!,regions=regionEvidence(fixture);
    const middle=regions.find(region=>region.points.length===5)!;
    const one=labelPoint({},middle.points[0],'neutral',regions,false);
    expect(Object.keys(one)).toHaveLength(1);
    const whole=labelPoint({},middle.points[0],'neutral',regions,true);
    expect(Object.keys(whole)).toHaveLength(5);
    const committed=commitLabels(emptyLabelHistory(),whole);
    expect(undoLabels(committed)).toEqual(emptyLabelHistory());
  });

  it('identifies missing, mixed and wrong regions with boundary evidence',()=>{
    const fixture=END_FIXTURES[0],regions=regionEvidence(fixture),target=regions[0];
    expect(gradeRegions(regions,{}).every(item=>item.status==='missing')).toBe(true);
    const wrong:PointLabels={};for(const point of target.points)wrong[key(point)]=(target.owner==='B'?'W':'B') as AreaOwner;
    expect(gradeRegions(regions,wrong)[0].message).toMatch(/边界只有|边界同时|没有棋子边界/);
  });
});

describe('T13 komi and capture comparison',()=>{
  it('changes only the white komi component in a teaching trial',()=>{
    const fixture=END_FIXTURES.find(item=>item.id==='END-004')!;
    const original=verifiedFixtureScore(fixture)!,trial=verifiedFixtureScore(fixture,2.5)!;
    expect(trial.blackTotal).toBe(original.blackTotal);
    expect(trial.whiteTotal-original.whiteTotal).toBe(2);
    expect(fixture.komi).toBe(.5);
  });

  it('shows identical area results for identical boards with different capture ledgers',()=>{
    const [plain,many]=captureComparison();
    expect(plain.fixture.captureCountsForComparison.B).toBe(0);
    expect(many.fixture.captureCountsForComparison.B).toBe(12);
    expect(plain.score).toEqual(many.score);
  });
});

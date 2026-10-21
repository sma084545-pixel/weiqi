import {describe,expect,it} from 'vitest';
import type {Puzzle} from '../../src/core/content.generated';
import {AVAILABLE_PUZZLES,createCatalog,inspectPuzzle,PUZZLE_CATALOG} from '../../src/features/puzzle-runner/catalog';

describe('T10 puzzle catalog',()=>{
  it('loads exactly 30 formal puzzles across six categories and all six answer types',()=>{
    expect(PUZZLE_CATALOG).toHaveLength(30);expect(AVAILABLE_PUZZLES).toHaveLength(30);
    expect(new Set(AVAILABLE_PUZZLES.map(item=>item.puzzle.category))).toEqual(new Set(['LIB','CAP','CON','LIFE','AREA','DISC']));
    expect(new Set(AVAILABLE_PUZZLES.map(item=>item.puzzle.answer.type))).toEqual(new Set(['number','point-set','move-tree','region-labels','reason-choice','open-text']));
  });
  it('keeps IDs unique and carries the authored first player, target, and conditions',()=>{
    const ids=AVAILABLE_PUZZLES.map(item=>item.puzzle.id);expect(new Set(ids).size).toBe(30);
    for(const {puzzle} of AVAILABLE_PUZZLES){expect(puzzle.revision).toBe(1);expect(['B','W']).toContain(puzzle.firstPlayer);expect(puzzle.targetMarkers.length).toBeGreaterThan(0);expect(puzzle.conditions.external.length).toBeGreaterThan(0);}
  });
  it('separates malformed, unpublished, unsupported, and development content',()=>{
    const base=AVAILABLE_PUZZLES[0].puzzle;
    expect(inspectPuzzle({...base,id:'BAD-VERSION',schemaVersion:2} as unknown as Puzzle)?.status).toBe('malformed');
    expect(inspectPuzzle({...base,id:'UNVERIFIED',validation:{...base.validation,solutionChecked:{...base.validation.solutionChecked!,status:'failed'}}})?.status).toBe('unverified');
    expect(inspectPuzzle({...base,id:'UNSUPPORTED',answer:{type:'future-answer'}} as unknown as Puzzle)?.status).toBe('unsupported');
    expect(inspectPuzzle({...base,id:'DEV-ONLY',developmentOnly:true})?.status).toBe('development');
    expect(createCatalog({schemaVersion:2,items:[]})).toEqual([]);
  });
});

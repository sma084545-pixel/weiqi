import {describe,expect,it} from 'vitest';
import type {Ownership,Puzzle,Response} from '../../src/core/content.generated';
import {AVAILABLE_PUZZLES} from '../../src/features/puzzle-runner/catalog';
import {applyAuthoredReply,gradeStaticAnswer,gradeTreeMove,initialPuzzleState} from '../../src/features/puzzle-runner/grading';

const puzzle=(id:string)=>AVAILABLE_PUZZLES.find(item=>item.puzzle.id===id)!.puzzle;
describe('T10 response grading',()=>{
  it.each([
    ['LIB-001',{type:'number',value:4},'success'],
    ['LIB-002',{type:'point-set',points:[{row:0,col:1},{row:1,col:0}]},'success'],
    ['AREA-005',{type:'reason-choice',optionIds:['area']},'success'],
    ['DISC-001',{type:'open-text',text:'我选 E5 连接；白方可以从 E4 回应，我会先听同伴如何看两块棋。'},'discussion'],
  ] as const)('grades %s without forcing it into a move response',(id,response,verdict)=>{
    expect(gradeStaticAnswer(puzzle(id),response as Response).verdict).toBe(verdict);
  });
  it('grades all nine explicit region labels and reports incomplete ownership separately',()=>{
    const labels:Ownership[]=[{at:{row:0,col:1},owner:'B'},{at:{row:0,col:3},owner:'B'},{at:{row:4,col:1},owner:'W'},{at:{row:4,col:3},owner:'W'},...Array.from({length:5},(_,col):Ownership=>({at:{row:2,col},owner:'neutral'}))];
    expect(gradeStaticAnswer(puzzle('AREA-002'),{type:'region-labels',labels:[...labels]}).verdict).toBe('success');
    const incomplete=gradeStaticAnswer(puzzle('AREA-002'),{type:'region-labels',labels:[...labels].slice(0,-1)});expect(incomplete.verdict).toBe('failure');expect(incomplete.detail).toContain('1 个应标空点未标');
  });
  it('accepts both independently listed solutions for CON-002',()=>{
    for(const at of [{row:1,col:2},{row:2,col:1}]){const start=initialPuzzleState(puzzle('CON-002'));expect(start.ok).toBe(true);if(start.ok)expect(gradeTreeMove(puzzle('CON-002'),start.value,'root',at).verdict).toBe('success');}
  });
  it('keeps an uncovered legal move unknown and an illegal occupied move immutable',()=>{
    const item=puzzle('CAP-001'),start=initialPuzzleState(item);expect(start.ok).toBe(true);if(!start.ok)return;
    const unknown=gradeTreeMove(item,start.value,'root',{row:4,col:4});expect(unknown.verdict).toBe('unknown');expect(unknown.state?.moves).toHaveLength(1);
    const before=JSON.stringify(start.value),illegal=gradeTreeMove(item,start.value,'root',{row:2,col:2});expect(illegal.verdict).toBe('illegal');expect(JSON.stringify(start.value)).toBe(before);
  });
  it('uses only the authored legal refutation after a covered failure',()=>{
    const item=puzzle('CAP-001'),start=initialPuzzleState(item);if(!start.ok)throw Error('bad fixture');
    const failed=gradeTreeMove(item,start.value,'root',{row:1,col:3});expect(failed.verdict).toBe('failure');expect(failed.reply).toEqual({type:'place',color:'W',at:{row:2,col:3}});
    const replied=applyAuthoredReply(failed.state!,failed.reply!);expect(replied.state?.board[2][3]).toBe('W');expect(replied.state?.moves).toHaveLength(2);
  });
  it('does not accept empty, negative, or fractional number input',()=>{
    const item=puzzle('LIB-001');for(const value of [-1,1.5,Number.NaN])expect(gradeStaticAnswer(item,{type:'number',value}).verdict).toBe('invalid');
  });
});

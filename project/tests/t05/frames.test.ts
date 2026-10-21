import {describe,expect,it} from 'vitest';
import {CAPTURE_DEMOS} from '../../src/features/capture-lab/demos';
import {createCaptureFrames} from '../../src/features/capture-lab/frames';
import {rulesEngine} from '../../src/core/rules';

function trial(index=0){const demo=CAPTURE_DEMOS[index];const start=rulesEngine.startGame(demo.puzzle.initialPosition,{mode:'full-game',komi:0,gameId:'FRAMES'});if(!start.ok)throw new Error('setup');const result=rulesEngine.tryMove(start.value,{type:'place',color:'B',at:demo.recommended});if(!result.ok)throw new Error(result.error.code);return {demo,start:start.value,trial:result.value};}

describe('T05 display-only frames',()=>{
  it('uses the fixed four-step order and keeps captured stones until the remove frame',()=>{const {demo,trial:result}=trial();const frames=createCaptureFrames(result,'B',5);expect(frames.map(frame=>frame.id)).toEqual(['place','inspect-opponent','remove','inspect-self']);expect(frames[0].board[2][3]).toBe('B');expect(frames[0].board[2][2]).toBe('W');expect(frames[1].board[2][2]).toBe('W');expect(frames[2].board).toEqual(result.event.after);expect(frames[3].board).toEqual(result.event.after);expect(demo.board[2][3]).toBeNull();});
  it('marks only event-provided final liberties and freezes every frame',()=>{const {trial:result}=trial(4);const frames=createCaptureFrames(result,'B',5);expect(frames[3].markers.filter(marker=>marker.kind==='liberty').map(marker=>marker.at)).toEqual(result.event.libertiesAfter);expect(Object.isFrozen(frames)).toBe(true);expect(Object.isFrozen(frames[0].board)).toBe(true);});
  it('does not mutate trial or source state while constructing temporary views',()=>{const {start,result:result}= {start:trial(2).start,result:trial(2).trial};const before=JSON.stringify({start,result});createCaptureFrames(result,'B',5);expect(JSON.stringify({start,result})).toBe(before);});
});


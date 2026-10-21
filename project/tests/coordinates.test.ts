import {it,expect} from 'vitest';
import {displayCoord,parseCoord,layoutKey} from '../src/core/coordinates';
it.each([[5,0,0,'A5'],[9,0,8,'J9'],[13,12,12,'N1'],[19,0,18,'T19'],[19,18,0,'A1']] as const)('maps full %i board (%i,%i) to %s', (n,row,col,label)=>{expect(displayCoord({row,col},n)).toBe(label);expect(parseCoord(label,n)).toEqual({row,col});});
it.each(['I1','A0','A20','T20','J10','AA1','A1x'])('rejects 9-board label %s',label=>expect(parseCoord(label,9)).toBeNull());
it('uses complete layout without turn information',()=>{expect(layoutKey(Array.from({length:5},()=>Array(5).fill(null)))).toBe('5|.........................');});
it('rejects malformed board encoding',()=>expect(()=>layoutKey([[null]])).toThrow());

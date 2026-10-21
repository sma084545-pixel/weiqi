import {it,expect} from 'vitest';
import fixture from '../content/examples/valid/terminal.json';
// Expected partition was written as a 5x5 table before any code, see RULES R5.
// This checks one teaching fixture; it does NOT implement or test a general scoring engine.
it('matches the independently written board diagram',()=>{
 const rows=['BB.BB','BBBBB','.....','WWWWW','WW.WW'];
 for(let row=0;row<5;row++)for(let col=0;col<5;col++){const stone=fixture.position.stones.find(s=>s.row===row&&s.col===col);expect(stone?.color??'.').toBe(rows[row][col]);}
 expect(fixture.position.stones.filter(s=>s.color==='B')).toHaveLength(9);expect(fixture.position.stones.filter(s=>s.color==='W')).toHaveLength(9);
 expect(fixture.expectedScore).toMatchObject({blackStones:9,whiteStones:9,blackTerritory:[{row:0,col:2}],whiteTerritory:[{row:4,col:2}],neutralPoints:[{row:2,col:0},{row:2,col:1},{row:2,col:2},{row:2,col:3},{row:2,col:4}],blackTotal:10,whiteTotal:10,difference:0,winner:'draw',basis:'teaching-assumption'});
});
it('hand arithmetic excludes prisoners and counts all intersections',()=>{expect(9+1).toBe(10);expect(9+1+0).toBe(10);expect(9+9+1+1+5).toBe(25);expect(fixture.captureCountsForComparison).toEqual({B:7,W:2});expect(fixture.expectedScore.blackTotal).not.toBe(17);expect(fixture.expectedScore.whiteTotal).not.toBe(12);});

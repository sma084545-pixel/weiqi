import {it,expect} from 'vitest';
import {getGroup,getLiberties,tryMove,undo,redo,restoreGame,serializeGame,createVerifiedGameStore,scoreArea} from '../../src/core/rules';
import {parseContent} from '../../src/core/validation';
import {value,game,board,place,snapshot} from './helpers';
import type {Board,Coord,Size,GameState} from '../../src/core/content.generated';
// Independent test oracle: union-find over right/down edges (runtime uses BFS).
function oracle(b:Board){const n=b.length,parent=Array.from({length:n*n},(_,i)=>i);const root=(i:number):number=>parent[i]===i?i:(parent[i]=root(parent[i]));
 for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(b[r][c])for(const [rr,cc] of [[r+1,c],[r,c+1]])if(rr<n&&cc<n&&b[r][c]===b[rr][cc])parent[root(r*n+c)]=root(rr*n+cc);
 const map=new Map<number,{stones:Coord[];liberties:Coord[]}>();
 for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(b[r][c]){const k=root(r*n+c);if(!map.has(k))map.set(k,{stones:[],liberties:[]});map.get(k)!.stones.push({row:r,col:c});}
 for(const g of map.values()){const set=new Set<number>();for(const {row:r,col:c} of g.stones)for(const [rr,cc] of [[r-1,c],[r+1,c],[r,c-1],[r,c+1]])if(rr>=0&&rr<n&&cc>=0&&cc<n&&b[rr][cc]===null)set.add(rr*n+cc);g.liberties=[...set].sort((a,b)=>a-b).map(i=>({row:Math.floor(i/n),col:i%n}));}return [...map.values()];
}
const rng=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const sum=(b:Board,color:'B'|'W')=>b.flat().filter(s=>s===color).length;
for(const n of [5,9,13,19] as Size[]){
 it(`T01 seeded union-find oracle checks groups/liberties on ${n}x${n}`,()=>{const random=rng(910+n);for(let k=0;k<12;k++){const b=Array.from({length:n},()=>Array.from({length:n},()=>[null,'B','W'][Math.floor(random()*3)])) as Board;for(const g of oracle(b)){expect(value(getGroup(b,g.stones[0]))?.stones).toEqual(g.stones);expect(value(getLiberties(b,g.stones[0]))).toEqual(g.liberties);}}});
 it(`T01 seeded legal path invariants on ${n}x${n}`,()=>{const random=rng(701+n);let s=game(n),placedB=0,placedW=0,success=0;
  for(let i=0;i<180;i++){const before=s,text=JSON.stringify(s),move={type:'place' as const,color:s.toPlay,at:{row:Math.floor(random()*n),col:Math.floor(random()*n)}},r=tryMove(s,move);expect(JSON.stringify(s)).toBe(text);if(!r.ok)continue;
   s=r.value.nextState;success++;if(move.color==='B')placedB++;else placedW++;
   expect(sum(s.board,'B')+s.captures.W).toBe(placedB);expect(sum(s.board,'W')+s.captures.B).toBe(placedW);
   expect(oracle(s.board).every(g=>g.liberties.length>0)).toBe(true);expect(new Set(s.history.layouts).size).toBe(s.history.layouts.length);
   const back=value(undo(s));expect(snapshot(back)).toEqual(snapshot(before));expect(snapshot(value(redo(back)))).toEqual(snapshot(s));
   if(success%20===0)expect(value(restoreGame(s))).toEqual(s);
  }expect(success).toBeGreaterThan(15);
 // Correctness checks keep all 180 seeded attempts; allow shared CI/desktop CPU load.
 },60000);
}
it('T01 90-degree rotation preserves legal result/captures/area',()=>{
 const original=board(['..B..','.BWB.','BW...','.B...','.....']);const rotate=(b:Board)=>b.map((r,i)=>r.map((c,j)=>b[b.length-1-j][i]));
 const a=game(original.map(r=>r.map(c=>c??'.').join(''))),b=game(rotate(original).map(r=>r.map(c=>c??'.').join('')));
 const ta=value(tryMove(a,{type:'place',color:'B',at:{row:2,col:2}})),tb=value(tryMove(b,{type:'place',color:'B',at:{row:2,col:2}}));expect(rotate(ta.nextState.board)).toEqual(tb.nextState.board);expect(ta.nextState.captures).toEqual(tb.nextState.captures);
 const request=(board:Board)=>({board,komi:0,agreement:{deadStones:[],neutralPoints:[],confirmedBy:[]},basis:'preview' as const,assumptions:[]});const sa=value(scoreArea(request(a.board))),sb=value(scoreArea(request(b.board)));expect(sa.blackTotal).toBe(sb.blackTotal);expect(sa.whiteTotal).toBe(sb.whiteTotal);
});
it('T01 long 19x19 full-snapshot export exceeds old 2MB limit and round-trips with redo',()=>{
 const random=rng(190019);let s=game(19),count=0;
 for(let attempt=0;attempt<5000&&count<240;attempt++){const r=tryMove(s,{type:'place',color:s.toPlay,at:{row:Math.floor(random()*19),col:Math.floor(random()*19)}});if(r.ok){s=r.value.nextState;count++;}}
 expect(count).toBe(240);s=value(undo(value(undo(s))));const json=value(serializeGame(s));expect(new TextEncoder().encode(json).length).toBeGreaterThan(2_000_000);expect(parseContent(json).ok).toBe(false);expect(value(restoreGame(json))).toEqual(s);
 const data=new Map<string,string>(),store=createVerifiedGameStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 expect(store.save(s).ok).toBe(true);expect(store.load(s.id)).toEqual({ok:true,value:s});
},30000);

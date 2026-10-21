import type {Coord,Color} from '../content.generated';
import type {Result,RuleError,RuleErrorCode,BoardMatrix,GroupStatus} from './contract';
import {inBounds,layoutKey} from '../coordinates';
export class RuleFailure extends Error {constructor(readonly detail:RuleError){super(detail.code);}}
export function fail(code:RuleErrorCode,field?:string,at?:Coord):never {throw new RuleFailure({code,...(field?{field}:{}),...(at?{at:{...at}}:{})});}
export function attempt<T>(fn:()=>T):Result<T>{try{return {ok:true,value:fn()};}catch(e){return {ok:false,error:e instanceof RuleFailure?e.detail:{code:'INVALID_ARGUMENT',field:'/'}};}}
export function unwrap<T>(r:Result<T>):T {if(!r.ok)throw new RuleFailure(r.error);return r.value;}
export function freeze<T>(v:T):T {if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
export const clone=<T>(v:T):T=>structuredClone(v);
export const pointKey=(p:Coord)=>`${p.row},${p.col}`;
export const order=(a:Coord,b:Coord)=>a.row-b.row||a.col-b.col;
export function sorted(points:Iterable<Coord>):Coord[]{return [...new Map([...points].map(p=>[pointKey(p),{row:p.row,col:p.col}])).values()].sort(order);}
export function checkBoard(board:BoardMatrix):void {try{if(!Array.isArray(board)||board.some(r=>!Array.isArray(r)))fail('INVALID_BOARD','/board');layoutKey(board);for(const row of board)for(const s of row)if(s!==null&&s!=='B'&&s!=='W')fail('INVALID_BOARD','/board');}catch{fail('INVALID_BOARD','/board');}}
export function checkAt(at:Coord,n:number):void {if(!at||!inBounds(at,n))fail('OUT_OF_BOUNDS','/at',at&&typeof at==='object'?at:undefined);}
export function checkColor(c:Color):void {if(c!=='B'&&c!=='W')fail('INVALID_ARGUMENT','/color');}
export const other=(c:Color):Color=>c==='B'?'W':'B';
export function neighbors(p:Coord,n:number):Coord[]{return [{row:p.row-1,col:p.col},{row:p.row,col:p.col-1},{row:p.row,col:p.col+1},{row:p.row+1,col:p.col}].filter(q=>inBounds(q,n));}
// Shared orthogonal flood fill. Caller has checked matrix and coordinate.
export function groupAt(board:BoardMatrix,at:Coord):GroupStatus|null {
 const color=board[at.row][at.col];if(color===null)return null;
 const queue=[at],seen=new Set([pointKey(at)]),liberties:Coord[]=[];
 for(let i=0;i<queue.length;i++)for(const p of neighbors(queue[i],board.length)) {
  const value=board[p.row][p.col];if(value===null)liberties.push(p);
  else if(value===color&&!seen.has(pointKey(p))){seen.add(pointKey(p));queue.push(p);}
 }
 const gas=sorted(liberties);return {color,stones:sorted(queue),liberties:gas,isAtari:gas.length===1};
}
export function allGroups(board:BoardMatrix):GroupStatus[]{
 const seen=new Set<string>(),groups:GroupStatus[]=[];
 for(let row=0;row<board.length;row++)for(let col=0;col<board.length;col++)if(board[row][col]!==null&&!seen.has(`${row},${col}`)){
  const g=groupAt(board,{row,col})!;groups.push(g);for(const p of g.stones)seen.add(pointKey(p));
 }return groups;
}
// Object field order is irrelevant; array order is contractual.
export function equal(a:unknown,b:unknown):boolean {
 if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
 if(Array.isArray(a)!==Array.isArray(b))return false;
 const ka=Object.keys(a),kb=Object.keys(b);return ka.length===kb.length&&ka.every(k=>Object.hasOwn(b,k)&&equal((a as Record<string,unknown>)[k],(b as Record<string,unknown>)[k]));
}

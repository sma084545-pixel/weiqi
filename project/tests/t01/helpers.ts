import type {Board,Color,GameState,Position,Size} from '../../src/core/content.generated';
import type {Result} from '../../src/core/rules';
import {startGame,tryMove} from '../../src/core/rules';
export const value=<T>(r:Result<T>):T=>{if(!r.ok)throw Error(JSON.stringify(r.error));return r.value;};
export const board=(rows:string[]):Board=>rows.map(r=>[...r].map(c=>c==='.'?null:c as Color));
export const rows=(b:Board)=>b.map(r=>r.map(c=>c??'.').join(''));
export function position(input:Size|string[]=5,toPlay:Color='B'):Position {
 const n=(typeof input==='number'?input:input.length) as Size;
 return {schemaVersion:1,id:'DEV-T01-POSITION',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size:n,toPlay,historyPolicy:'fresh-setup',history:null,stones:typeof input==='number'?[]:input.flatMap((r,row)=>[...r].flatMap((c,col)=>c==='.'?[]:[{row,col,color:c as Color}]))};
}
export function game(input:Size|string[]=5,mode:'full-game'|'capture-first'='full-game',komi=0,toPlay:Color='B'){return value(startGame(position(input,toPlay),{mode,komi,gameId:'DEV-T01-GAME'}));}
export const place=(s:GameState,row:number,col:number)=>value(tryMove(s,{type:'place',color:s.toPlay,at:{row,col}})).nextState;
export const snapshot=(s:GameState)=>{const {schemaVersion,id,revision,rulesetId,kind,setup,mode,undoStack,redoStack,...rest}=s;return rest;};
export const points=(pairs:number[][])=>pairs.map(([row,col])=>({row,col}));

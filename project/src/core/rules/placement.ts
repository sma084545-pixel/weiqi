import type {Color,Move,History,Board} from '../content.generated';
import type {BoardMatrix,TransitionEvent,Result} from './contract';
import {layoutKey} from '../coordinates';
import {attempt,checkBoard,checkAt,checkColor,fail,neighbors,groupAt,allGroups,pointKey,sorted} from './internal';
export type PlacementContext={board:BoardMatrix;toPlay:Color;history:History};
export type PlacementResult={board:Board;layout:string;event:TransitionEvent};
/** The ONE placement kernel used by tryMove. A context is not an authenticated game.
 * Explicit-history fixtures may exercise superko here; restoreGame never trusts such histories. */
export function evaluatePlacement(context:PlacementContext,move:Extract<Move,{type:'place'}>):Result<PlacementResult>{return attempt(()=>{
 checkBoard(context.board);checkColor(context.toPlay);checkColor(move.color);
 if(move.type!=='place')fail('INVALID_ARGUMENT','/move/type');
 if(move.color!==context.toPlay)fail('NOT_YOUR_TURN','/move/color');
 checkAt(move.at,context.board.length);
 if(context.board[move.at.row][move.at.col]!==null)fail('OCCUPIED','/move/at',move.at);
 const before=context.board.map(row=>[...row]);
 const groupsBefore=allGroups(before);
 if(groupsBefore.some(g=>!g.liberties.length))fail('INVALID_SETUP','/board');
 const keys=context.history?.layouts,n=before.length;
 if(!Array.isArray(keys)||!keys.length||keys.at(-1)!==layoutKey(before)||new Set(keys).size!==keys.length||keys.some(k=>typeof k!=='string'||!new RegExp(`^${n}\\|[.BW]{${n*n}}$`).test(k)))fail('HISTORY_REQUIRED','/history/layouts');
 const adjacent=neighbors(move.at,n);
 const libertiesBefore=sorted(adjacent.flatMap(p=>before[p.row][p.col]===move.color?groupAt(before,p)!.liberties:[]));
 const after=before.map(row=>[...row]);after[move.at.row][move.at.col]=move.color;
 const seen=new Set<string>(),captured=[];
 // Collect every enemy block BEFORE removing any; one block touching twice counts once.
 for(const p of adjacent)if(after[p.row][p.col]!==null&&after[p.row][p.col]!==move.color&&!seen.has(pointKey(p))){
  const g=groupAt(after,p)!;g.stones.forEach(q=>seen.add(pointKey(q)));if(g.liberties.length===0)captured.push(...g.stones);
 }
 for(const p of captured)after[p.row][p.col]=null;
 const libertiesAfter=groupAt(after,move.at)!.liberties;
 if(!libertiesAfter.length)fail('SUICIDE','/move/at',move.at);
 const layout=layoutKey(after);if(keys.includes(layout))fail('SUPERKO','/move/at',move.at);
 return {board:after,layout,event:{before,after,placed:{...move.at},captured:sorted(captured),libertiesBefore,libertiesAfter,groupsBefore,groupsAfter:allGroups(after)}};
});}

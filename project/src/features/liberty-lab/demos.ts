import rawBundle from '../../../content/t04/liberty-demos.json';
import type {Color,Coord,ContentBundle,Puzzle,Stone} from '../../core/content.generated';
import {boardFromPosition} from '../../core/coordinates';
import type {BoardMatrix} from '../../core/rules';

export interface LibertyDemoPhase {
  id:'before'|'after';
  label:string;
  board:BoardMatrix;
  target:Coord;
}

export interface LibertyDemo {
  id:string;
  title:string;
  puzzle:Puzzle;
  phases:readonly LibertyDemoPhase[];
}

const TITLES=[
  '棋盘中央','棋盘边缘','棋盘一角','相连两子',
  '斜邻两子','弯形棋块','被包围的棋块','连接前后',
] as const;

const bundle=rawBundle as unknown as ContentBundle;
const puzzleItems=bundle.items.filter((item):item is Puzzle=>item.kind==='Puzzle');

function addStone(board:BoardMatrix,at:Coord,color:Color):BoardMatrix{
  return board.map((row,rowIndex)=>row.map((value,colIndex)=>rowIndex===at.row&&colIndex===at.col?color:value));
}

function firstTarget(puzzle:Puzzle):Coord{
  const target=puzzle.targetMarkers[0]?.points[0];
  if(!target)throw new Error(`${puzzle.id} 缺少目标棋块坐标`);
  return target;
}

function phasesFor(puzzle:Puzzle):readonly LibertyDemoPhase[]{
  const before=boardFromPosition(puzzle.initialPosition);
  const phases:LibertyDemoPhase[]=[{id:'before',label:puzzle.id==='DEMO-LIB-008'?'连接前':'当前棋形',board:before,target:firstTarget(puzzle)}];
  if(puzzle.id==='DEMO-LIB-008')phases.push({id:'after',label:'放下连接子后',board:addStone(before,{row:2,col:2},'B'),target:{row:2,col:2}});
  return phases;
}

function deepFreeze<T>(value:T):T{
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    Object.freeze(value);
    for(const nested of Object.values(value as Record<string,unknown>))deepFreeze(nested);
  }
  return value;
}

if(puzzleItems.length!==8)throw new Error('T04 气实验室必须恰好载入 8 个开发演示');

export const LIBERTY_DEMOS:readonly LibertyDemo[]=deepFreeze(puzzleItems.map((puzzle,index)=>({
  id:puzzle.id,
  title:TITLES[index],
  puzzle,
  phases:phasesFor(puzzle),
})));

export const LIBERTY_DEMO_IDS=LIBERTY_DEMOS.map(demo=>demo.id);

export function demoBoardStones(board:BoardMatrix):Stone[]{
  const stones:Stone[]=[];
  board.forEach((row,rowIndex)=>row.forEach((value,colIndex)=>{if(value)stones.push({row:rowIndex,col:colIndex,color:value});}));
  return stones;
}

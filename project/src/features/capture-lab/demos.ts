import rawBundle from '../../../content/t05/capture-demos.json';
import type {ContentBundle,Coord,Puzzle} from '../../core/content.generated';
import {boardFromPosition} from '../../core/coordinates';
import type {BoardMatrix} from '../../core/rules';

export interface CaptureDemo {
  id:string;
  title:string;
  shortTitle:string;
  puzzle:Puzzle;
  board:BoardMatrix;
  recommended:Coord;
  illegalComparison?:Coord;
  teacherNote:string;
  discussion:string;
}

const META:readonly Omit<CaptureDemo,'puzzle'|'board'>[]=[
  {id:'DEMO-CAP-001',title:'提走一颗棋',shortTitle:'提单子',recommended:{row:2,col:3},teacherNote:'落在 D3 后，C3 白棋最后一口气被占；提走的是整块，而这块刚好只有一颗。',discussion:'如果把目标白棋移到边上，最后一口气可能在哪里？'},
  {id:'DEMO-CAP-002',title:'提走一整块',shortTitle:'提整块',recommended:{row:2,col:4},teacherNote:'C3、D3 正交相连，必须作为同一棋块检查。E3 被占后整块无气，两颗一起移除。',discussion:'为什么不能只拿走靠近落子点的那一颗？'},
  {id:'DEMO-CAP-003',title:'同时提走多块',shortTitle:'同时多块',recommended:{row:2,col:2},teacherNote:'四颗白棋互为斜邻，不相连；C3 同时占住四块各自的最后一口气，所以四块一起移除。',discussion:'你怎样确认四颗白棋是四个棋块，而不是一整块？'},
  {id:'DEMO-CAP-004',title:'还没收尽气',shortTitle:'不会提子',recommended:{row:3,col:2},teacherNote:'C2 落下后，C3 白棋仍可在 D3 呼吸；没有无气的对方棋块，所以不会提子。',discussion:'再走在哪一点，才会收尽目标白棋的气？'},
  {id:'DEMO-CAP-005',title:'先提子再获得气',shortTitle:'先提后有气',recommended:{row:0,col:0},teacherNote:'A5 暂放时相邻点都被白棋占住，但规则先移除无气白棋；随后新黑棋得到 B5、A4 两口气。',discussion:'如果先检查新黑棋的气，会产生什么错误结论？'},
  {id:'DEMO-CAP-006',title:'自杀与合法提子对照',shortTitle:'两种角点',recommended:{row:0,col:0},illegalComparison:{row:4,col:4},teacherNote:'E1 不会提走相邻白棋，且新黑棋最终无气，所以拒绝；A5 会先提白棋再获得气，所以合法。',discussion:'两处角点看起来都很拥挤，决定是否合法的差别是什么？'},
];

const bundle=rawBundle as unknown as ContentBundle;
const puzzles=bundle.items.filter((item):item is Puzzle=>item.kind==='Puzzle');
if(puzzles.length!==6)throw new Error('T05 提子实验室必须恰好载入 6 个开发演示');

function deepFreeze<T>(value:T):T{
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    Object.freeze(value);
    for(const nested of Object.values(value as Record<string,unknown>))deepFreeze(nested);
  }
  return value;
}

export const CAPTURE_DEMOS:readonly CaptureDemo[]=deepFreeze(META.map(meta=>{
  const puzzle=puzzles.find(item=>item.id===meta.id);
  if(!puzzle)throw new Error(`${meta.id} 缺少内容文档`);
  return {...meta,puzzle,board:boardFromPosition(puzzle.initialPosition)};
}));

export const CAPTURE_DEMO_IDS=CAPTURE_DEMOS.map(demo=>demo.id);


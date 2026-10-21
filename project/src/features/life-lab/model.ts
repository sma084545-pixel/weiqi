import life001Json from '../../../content/puzzles/LIFE-001.json';
import life002Json from '../../../content/puzzles/LIFE-002.json';
import life003Json from '../../../content/puzzles/LIFE-003.json';
import life004Json from '../../../content/puzzles/LIFE-004.json';
import life005Json from '../../../content/puzzles/LIFE-005.json';
import type {Color,Coord,Position,Puzzle,StoneValue} from '../../core/content.generated';
import {getGroup,getLiberties,startGame,tryMove} from '../../core/rules';

export const LIFE_PUZZLES=[life001Json,life002Json,life003Json,life004Json,life005Json] as Puzzle[];
export const LIFE_BY_ID=new Map(LIFE_PUZZLES.map(puzzle=>[puzzle.id,puzzle]));
export const LIFE_REFERENCES=LIFE_PUZZLES.map(puzzle=>({id:puzzle.id,revision:puzzle.revision})) as readonly {id:string;revision:number}[];

export type LifeScenarioId='false-eye'|'two-eyes'|'key-black'|'key-white';
export type LifeScenario={
  id:LifeScenarioId;title:string;puzzleId:string;toPlay:Color;candidate:Coord;
  expectedLegal:boolean;expectedCaptured:readonly Coord[];question:string;explanation:string;
};

export const LIFE_SCENARIOS:Record<LifeScenarioId,LifeScenario>={
  'false-eye':{
    id:'false-eye',title:'看似被围住：假眼',puzzleId:'LIFE-002',toPlay:'W',candidate:{row:2,col:2},expectedLegal:true,
    expectedCaptured:[{row:1,col:2},{row:2,col:1},{row:2,col:3}],
    question:'白方能否合法落在 C3？',
    explanation:'可以。C3 是三个目标黑块共同的最后一口气；白先提走它们，落下的白子因此获得气。这只说明 C3 在此局面是假眼，不判断其他黑棋的全盘死活。',
  },
  'two-eyes':{
    id:'two-eyes',title:'两个独立真眼',puzzleId:'LIFE-001',toPlay:'W',candidate:{row:1,col:1},expectedLegal:false,expectedCaptured:[],
    question:'白方能否先合法落在 B4？',
    explanation:'不可以。B4 与 D4 是两个彼此不连通的眼；白先填 B4 时没有提掉黑块，白子也没有气，因此是自杀禁着。此结论要求黑方不主动填掉自己的眼。',
  },
  'key-black':{
    id:'key-black',title:'黑先占关键点',puzzleId:'LIFE-003',toPlay:'B',candidate:{row:0,col:1},expectedLegal:true,expectedCaptured:[],
    question:'黑先落 B5，会把内部空间怎样分开？',
    explanation:'黑 B5 与目标黑块连接，把 A5 和 C5 分成两个独立单点空区；这是 LIFE-003 已核查的成功首手。',
  },
  'key-white':{
    id:'key-white',title:'白先占关键点',puzzleId:'LIFE-003',toPlay:'W',candidate:{row:0,col:1},expectedLegal:true,expectedCaptured:[],
    question:'改为白先，白能否合法占 B5？',
    explanation:'可以。白 B5 此时有 A5、C5 两口气，并未自杀；它也使黑方不能再用 B5 立即分成 LIFE-003 的两个黑眼。后续死活仍需继续走，这里不宣布黑棋已死。',
  },
};

const coordKey=(point:Coord)=>`${point.row},${point.col}`;
export const samePoint=(a:Coord,b:Coord)=>a.row===b.row&&a.col===b.col;

export function puzzleForScenario(scenario:LifeScenario):Puzzle{
  const puzzle=LIFE_BY_ID.get(scenario.puzzleId);
  if(!puzzle)throw new Error(`Missing puzzle ${scenario.puzzleId}`);
  return puzzle;
}

export function positionWithTurn(puzzle:Puzzle,toPlay:Color,id:string):Position{
  return {...puzzle.initialPosition,id,revision:1,toPlay,stones:puzzle.initialPosition.stones.map(stone=>({...stone}))};
}

export function boardForPosition(position:Position):StoneValue[][]{
  const board=Array.from({length:position.size},()=>Array<StoneValue>(position.size).fill(null));
  for(const stone of position.stones)board[stone.row][stone.col]=stone.color;
  return board;
}

export function runLifeScenario(scenario:LifeScenario){
  const puzzle=puzzleForScenario(scenario);
  const position=positionWithTurn(puzzle,scenario.toPlay,`POS-T11-${scenario.id.toUpperCase()}`);
  const started=startGame(position,{mode:'full-game',komi:0,gameId:`T11-${scenario.id}`});
  if(!started.ok)return {ok:false as const,error:started.error,position};
  const moved=tryMove(started.value,{type:'place',color:scenario.toPlay,at:scenario.candidate});
  return moved.ok?{ok:true as const,trial:moved.value,position}:{ok:false as const,error:moved.error,position};
}

export function targetGroupPoints(puzzle:Puzzle):Coord[]{
  const board=boardForPosition(puzzle.initialPosition),points=new Map<string,Coord>();
  for(const marker of puzzle.targetMarkers)for(const at of marker.points){
    const group=getGroup(board,at);
    if(group.ok&&group.value)for(const stone of group.value.stones)points.set(coordKey(stone),stone);
  }
  return [...points.values()];
}

const OUTER_FILLERS:readonly Coord[]=[{row:0,col:2},{row:2,col:0},{row:2,col:4}];
export type OuterLibertyFrame={step:number;title:string;description:string;position:Position;remaining:Coord[];targetLiberties:Coord[]};

export function createOuterLibertyFrames():OuterLibertyFrame[]{
  const puzzle=LIFE_BY_ID.get('LIFE-002')!;
  const fillerKeys=new Set(OUTER_FILLERS.map(coordKey));
  const fixed=puzzle.initialPosition.stones.filter(stone=>!fillerKeys.has(coordKey(stone)));
  const copy=(n:number):Position=>({...puzzle.initialPosition,id:`POS-T11-OUTER-${n}`,revision:1,toPlay:'W',stones:[...fixed,...puzzle.initialPosition.stones.filter(stone=>OUTER_FILLERS.slice(0,n).some(point=>samePoint(point,stone)))]});
  const titles=['三处外气仍在','先填 C5','再填 A3','最后填 E3'];
  const descriptions=[
    'C5、A3、E3 仍是目标黑块的外气；现在直接落 C3，不会一次提掉三个目标块。',
    'C4 的外气 C5 已被占，但 B3、D3 仍各有一处外气。',
    '再占 A3 后，B3 只剩 C3；D3 仍有 E3。',
    'E3 也被占后，三个目标黑块都只剩共同点 C3；白 C3 才成为先提子后有气的合法着。',
  ];
  return [0,1,2,3].map(step=>{
    const position=copy(step),board=boardForPosition(position),liberties=new Map<string,Coord>();
    for(const at of [{row:1,col:2},{row:2,col:1},{row:2,col:3}]){
      const result=getLiberties(board,at);if(result.ok)for(const liberty of result.value)liberties.set(coordKey(liberty),liberty);
    }
    return {step,title:titles[step],description:descriptions[step],position,remaining:OUTER_FILLERS.slice(step).map(point=>({...point})),targetLiberties:[...liberties.values()]};
  });
}

export const OUTER_LIBERTY_FRAMES=createOuterLibertyFrames();

export function connectedEmptyPair(puzzleId:'LIFE-001'|'LIFE-005',a:Coord,b:Coord):boolean{
  const puzzle=LIFE_BY_ID.get(puzzleId)!;
  const board=boardForPosition(puzzle.initialPosition);
  return board[a.row][a.col]===null&&board[b.row][b.col]===null&&Math.abs(a.row-b.row)+Math.abs(a.col-b.col)===1;
}

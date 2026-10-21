import bundleJson from '../../../content/t09/bundle.json';
import pedagogyJson from '../../../content/t09/pedagogy.json';
import type {ContentBundle,Puzzle} from '../../core/content.generated';

export const PUZZLE_CATEGORIES={
  LIB:'气与连接',CAP:'提子与打吃',CON:'连接与切断',LIFE:'眼与基础死活',AREA:'面积与终局',DISC:'开放讨论',
} as const;
export const PUZZLE_DIFFICULTIES={
  beginner:'入门',elementary:'进阶', 'optional-challenge':'自选挑战',
} as const;
export const SUPPORTED_ANSWER_TYPES=new Set(['number','point-set','move-tree','region-labels','reason-choice','open-text']);

export type CatalogStatus='available'|'development'|'unverified'|'unsupported'|'malformed';
export type PedagogyItem={title:string;success:string;explanation:string;commonErrors:string;peerDiscussion:string};
export type CatalogItem={puzzle:Puzzle;status:CatalogStatus;message:string;title:string;pedagogy:PedagogyItem|null};

function publishReady(puzzle:Puzzle){
  return [puzzle.validation.structure,puzzle.validation.moveLegality,puzzle.validation.solutionChecked].every(check=>check?.status==='passed');
}

export function inspectPuzzle(value:unknown,pedagogy:Record<string,PedagogyItem>={}):CatalogItem|null{
  if(!value||typeof value!=='object'||(value as {kind?:unknown}).kind!=='Puzzle')return null;
  const puzzle=value as Puzzle;
  const title=pedagogy[puzzle.id]?.title||puzzle.id||'未命名题目';
  const base={puzzle,title,pedagogy:pedagogy[puzzle.id]??null};
  if(puzzle.schemaVersion!==1||puzzle.rulesetId!=='GO-CLUB-AREA-1'||!puzzle.id||!Number.isInteger(puzzle.revision)||!puzzle.answer?.type)return {...base,status:'malformed',message:'题目格式或版本不正确，暂不能打开。'};
  if(puzzle.developmentOnly)return {...base,status:'development',message:'这是开发示例，不在正式题目列表中。'};
  if(!publishReady(puzzle))return {...base,status:'unverified',message:'这道题尚未通过发布检查，请选择其他题目。'};
  if(!SUPPORTED_ANSWER_TYPES.has(puzzle.answer.type))return {...base,status:'unsupported',message:'当前播放器尚不支持这类作答方式。'};
  return {...base,status:'available',message:'可作答'};
}

export function createCatalog(bundle:unknown=bundleJson,teaching:unknown=pedagogyJson):CatalogItem[]{
  if(!bundle||typeof bundle!=='object'||(bundle as {schemaVersion?:unknown}).schemaVersion!==1||!Array.isArray((bundle as {items?:unknown}).items))return [];
  const teachingItems=teaching&&typeof teaching==='object'&&typeof (teaching as {items?:unknown}).items==='object'?(teaching as {items:Record<string,PedagogyItem>}).items:{};
  return (bundle as ContentBundle).items.map(item=>inspectPuzzle(item,teachingItems)).filter((item):item is CatalogItem=>item!==null);
}

export const PUZZLE_CATALOG=createCatalog();
export const AVAILABLE_PUZZLES=PUZZLE_CATALOG.filter(item=>item.status==='available');

export function positionBoard(puzzle:Puzzle){
  const board=Array.from({length:puzzle.initialPosition.size},()=>Array(puzzle.initialPosition.size).fill(null)) as ('B'|'W'|null)[][];
  for(const stone of puzzle.initialPosition.stones)if(board[stone.row]?.[stone.col]===null)board[stone.row][stone.col]=stone.color;
  return board;
}

export function learnerConditions(puzzle:Puzzle):string[]{
  const hidden=/^(成功标准|常见错误|同伴讨论|新教学起点)/;
  return [puzzle.conditions.external,...puzzle.conditions.assumptions.filter(text=>!hidden.test(text))];
}

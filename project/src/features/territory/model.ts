import bundleJson from '../../../content/t09/bundle.json';
import type {AreaScore,Board as BoardMatrix,Color,Coord,TerminalFixture} from '../../core/content.generated';
import {scoreArea} from '../../core/rules';

export type AreaOwner='B'|'W'|'neutral';
export type TerminalDecision='ready'|'continue-play'|'confirm-dispute';
export type PointLabels=Record<string,AreaOwner>;
export type RegionEvidence={id:string;points:Coord[];owner:AreaOwner;boundary:Color[];touchesBoardEdge:boolean};
export type RegionFeedback={region:RegionEvidence;status:'correct'|'missing'|'mixed'|'wrong';message:string};

const pointKey=(point:Coord)=>`${point.row},${point.col}`;
const fromKey=(value:string):Coord=>{const [row,col]=value.split(',').map(Number);return {row,col};};
const sortPoints=(points:Coord[])=>[...points].sort((a,b)=>a.row-b.row||a.col-b.col);
const adjacent=(point:Coord,size:number)=>[
  {row:point.row-1,col:point.col},{row:point.row+1,col:point.col},
  {row:point.row,col:point.col-1},{row:point.row,col:point.col+1},
].filter(item=>item.row>=0&&item.col>=0&&item.row<size&&item.col<size);

export const END_FIXTURES=(bundleJson.items as unknown[])
  .filter((item):item is TerminalFixture=>Boolean(item&&typeof item==='object'&&(item as {kind?:string}).kind==='TerminalFixture'))
  .sort((a,b)=>a.id.localeCompare(b.id));

export function fixtureBoard(fixture:TerminalFixture,removeAgreedDead=false):BoardMatrix{
  const board=Array.from({length:fixture.position.size},()=>Array(fixture.position.size).fill(null)) as BoardMatrix;
  for(const stone of fixture.position.stones)board[stone.row][stone.col]=stone.color;
  if(removeAgreedDead)for(const point of fixture.agreement.deadStones)board[point.row][point.col]=null;
  return board;
}

export function terminalDecision(fixture:TerminalFixture,decision:TerminalDecision){
  if(fixture.status==='unsettled'){
    if(decision==='ready')return {ok:false as const,message:'这个局面尚未完成确认，不能生成最终胜负。应继续对弈，或先由双方确认有争议的棋块。'};
    return {ok:true as const,message:decision==='continue-play'?'判断正确：先继续对弈，用实际着法解决局部。':'判断正确：两次停手后仍要双方确认死子和中立点；有争议就恢复对弈。'};
  }
  return decision==='ready'
    ?{ok:true as const,message:'可以按本例明确写出的教学假设进行面积试算；这不是某场实战的双方确认记录。'}
    :{ok:false as const,message:'本例已明确给出教学假设，可进入面积试算。实际对局仍必须经过双方终局确认。'};
}

export function verifiedFixtureScore(fixture:TerminalFixture,komi=fixture.komi):AreaScore|null{
  if(fixture.status==='unsettled'||fixture.expectedScore===null)return null;
  const result=scoreArea({
    board:fixtureBoard(fixture),
    komi,
    agreement:fixture.agreement,
    basis:'teaching-assumption',
    assumptions:fixture.assumptions,
  });
  if(!result.ok)throw new Error(`${fixture.id} scoreArea failed: ${result.error.code}`);
  return result.value;
}

function expectedOwner(score:AreaScore,point:Coord):AreaOwner{
  const key=pointKey(point);
  if(score.blackTerritory.some(item=>pointKey(item)===key))return 'B';
  if(score.whiteTerritory.some(item=>pointKey(item)===key))return 'W';
  return 'neutral';
}

/** Builds connected empty regions for selection and evidence; ownership comes from T01 scoreArea. */
export function regionEvidence(fixture:TerminalFixture):RegionEvidence[]{
  const score=verifiedFixtureScore(fixture);
  if(!score)return [];
  const board=fixtureBoard(fixture,true),size=fixture.position.size,seen=new Set<string>(),regions:RegionEvidence[]=[];
  for(let row=0;row<size;row++)for(let col=0;col<size;col++){
    if(board[row][col]!==null||seen.has(`${row},${col}`))continue;
    const points:Coord[]=[{row,col}],boundary=new Set<Color>();seen.add(`${row},${col}`);
    for(let index=0;index<points.length;index++)for(const next of adjacent(points[index],size)){
      const stone=board[next.row][next.col];
      if(stone)boundary.add(stone);
      else if(!seen.has(pointKey(next))){seen.add(pointKey(next));points.push(next);}
    }
    const sorted=sortPoints(points);
    regions.push({
      id:`R${regions.length+1}`,
      points:sorted,
      owner:expectedOwner(score,sorted[0]),
      boundary:[...boundary].sort(),
      touchesBoardEdge:sorted.some(point=>point.row===0||point.col===0||point.row===size-1||point.col===size-1),
    });
  }
  return regions;
}

export function labelPoint(labels:PointLabels,point:Coord,owner:AreaOwner,regions:RegionEvidence[],wholeRegion=false):PointLabels{
  const region=regions.find(item=>item.points.some(candidate=>pointKey(candidate)===pointKey(point)));
  const points=wholeRegion&&region?region.points:[point];
  const next={...labels};for(const item of points)next[pointKey(item)]=owner;return next;
}

export function gradeRegions(regions:RegionEvidence[],labels:PointLabels):RegionFeedback[]{
  return regions.map(region=>{
    const assigned=region.points.map(point=>labels[pointKey(point)]).filter((value):value is AreaOwner=>Boolean(value));
    const unique=new Set(assigned);
    const boundaryText=region.boundary.length===0?'没有棋子边界':region.boundary.length===1?(region.boundary.includes('B')?'边界只有黑棋':'边界只有白棋'):'边界同时接触黑棋和白棋';
    if(assigned.length===0)return {region,status:'missing',message:`${region.id} 尚未标记；${boundaryText}。`} as RegionFeedback;
    if(assigned.length!==region.points.length||unique.size>1)return {region,status:'mixed',message:`${region.id} 没有整区一致标完；连通空区必须作为同一个区域核对。 ${boundaryText}。`} as RegionFeedback;
    const chosen=assigned[0];
    if(chosen!==region.owner)return {region,status:'wrong',message:`${region.id} 标为${ownerZh(chosen)}，但${boundaryText}，所以本例应标为${ownerZh(region.owner)}。`} as RegionFeedback;
    return {region,status:'correct',message:`${region.id} 正确：${boundaryText}，共 ${region.points.length} 点。`} as RegionFeedback;
  });
}

export function ownerZh(owner:AreaOwner){return owner==='B'?'黑方空点':owner==='W'?'白方空点':'中立点';}
export function coordText(point:Coord,size:number){const columns='ABCDEFGHJKLMNOPQRST';return `${columns[point.col]}${size-point.row}`;}
export function boardMarkers(labels:PointLabels){
  return Object.entries(labels).map(([value,owner])=>({markerId:`answer-${value}`,kind:'ownership' as const,at:fromKey(value),owner,label:`已标记为${ownerZh(owner)}`}));
}

export type LabelHistory={past:PointLabels[];present:PointLabels};
export const emptyLabelHistory=():LabelHistory=>({past:[],present:{}});
export function commitLabels(history:LabelHistory,next:PointLabels):LabelHistory{return {past:[...history.past,history.present],present:next};}
export function undoLabels(history:LabelHistory):LabelHistory{
  if(!history.past.length)return history;
  return {past:history.past.slice(0,-1),present:history.past.at(-1)??{}};
}

export const CAPTURE_COMPARISON_IDS=['END-001','END-005'] as const;
export function captureComparison(){
  return CAPTURE_COMPARISON_IDS.map(id=>{
    const fixture=END_FIXTURES.find(item=>item.id===id);
    if(!fixture)throw new Error(`Missing ${id}`);
    return {fixture,score:verifiedFixtureScore(fixture)!};
  });
}

import type {Coord,Size} from '../../core/content.generated';
import {displayCoord} from '../../core/coordinates';

const key=(point:Coord)=>`${point.row},${point.col}`;
const order=(a:Coord,b:Coord)=>a.row-b.row||a.col-b.col;

export interface PointSetEvaluation {
  correct:boolean;
  missing:Coord[];
  extra:Coord[];
  duplicates:Coord[];
}

export function evaluateLibertySet(expected:readonly Coord[],selected:readonly Coord[]):PointSetEvaluation{
  const expectedMap=new Map(expected.map(point=>[key(point),point]));
  const seen=new Map<string,Coord>();
  const duplicates=new Map<string,Coord>();
  for(const point of selected){const pointKey=key(point);if(seen.has(pointKey))duplicates.set(pointKey,point);else seen.set(pointKey,point);}
  const missing=[...expectedMap].filter(([pointKey])=>!seen.has(pointKey)).map(([,point])=>point).sort(order);
  const extra=[...seen].filter(([pointKey])=>!expectedMap.has(pointKey)).map(([,point])=>point).sort(order);
  return {correct:missing.length===0&&extra.length===0&&duplicates.size===0,missing,extra,duplicates:[...duplicates.values()].sort(order)};
}

export type PredictionErrorCode='EMPTY_PREDICTION'|'NEGATIVE_PREDICTION'|'NON_INTEGER_PREDICTION';
export type PredictionEvaluation=
  |{valid:false;code:PredictionErrorCode;message:string}
  |{valid:true;correct:boolean;value:number;message:string};

export function evaluateLibertyCount(expected:number,raw:string):PredictionEvaluation{
  const normalized=raw.trim();
  if(!normalized)return {valid:false,code:'EMPTY_PREDICTION',message:'请先写下一个气数，再提交验证。'};
  const value=Number(normalized);
  if(!Number.isFinite(value)||!Number.isInteger(value))return {valid:false,code:'NON_INTEGER_PREDICTION',message:'气数要用完整的非负整数表示，例如 0、1、2。'};
  if(value<0)return {valid:false,code:'NEGATIVE_PREDICTION',message:'气数不会小于 0，请重新观察后输入。'};
  if(value===expected)return {valid:true,correct:true,value,message:'点集与数量已经核对一致。'};
  if(value<expected)return {valid:true,correct:false,value,message:'你的预测偏少。可能漏看了棋块另一侧，或只检查了其中一颗棋子。'};
  return {valid:true,correct:false,value,message:'你的预测偏多。检查是否把斜角当成气，或把同一个共享空点重复计算。'};
}

export function pointList(points:readonly Coord[],size:Size):string{
  return points.length?points.map(point=>displayCoord(point,size)).join('、'):'无';
}

import type {Coord} from '../../core/content.generated';

const key=(point:Coord)=>`${point.row},${point.col}`;
const sort=(points:readonly Coord[])=>[...points].sort((a,b)=>a.row-b.row||a.col-b.col);

export interface CapturePrediction {
  selected:readonly Coord[];
  explicitNone:boolean;
}

export interface CaptureEvaluation {
  valid:boolean;
  correct:boolean;
  missing:Coord[];
  extra:Coord[];
  message:string;
}

export function evaluateCapturePrediction(actual:readonly Coord[],prediction:CapturePrediction):CaptureEvaluation{
  if(!prediction.explicitNone&&prediction.selected.length===0)return {valid:false,correct:false,missing:[],extra:[],message:'请先选择至少一颗目标棋，或明确选择“不会提子”。'};
  const expected=new Map(actual.map(point=>[key(point),point]));
  const selected=new Map(prediction.selected.map(point=>[key(point),point]));
  const missing=sort([...expected].filter(([id])=>!selected.has(id)).map(([,point])=>point));
  const extra=sort([...selected].filter(([id])=>!expected.has(id)).map(([,point])=>point));
  const correct=missing.length===0&&extra.length===0&&prediction.explicitNone===(actual.length===0);
  return {valid:true,correct,missing,extra,message:correct?(actual.length===0?'预测一致：这手不会提子。':'预测点集与引擎事件完全一致。'):'预测已经记录；播放结束后会显示漏选和误选。'};
}


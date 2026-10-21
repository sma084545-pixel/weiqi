import type {Color,Coord,Size} from '../../core/content.generated';
import {displayCoord} from '../../core/coordinates';
import type {BoardMarker,BoardMatrix,Trial} from '../../core/rules';

export type CaptureStepId='place'|'inspect-opponent'|'remove'|'inspect-self';
export interface CaptureFrame {
  id:CaptureStepId;
  title:string;
  explanation:string;
  board:BoardMatrix;
  markers:readonly BoardMarker[];
}

const same=(a:Coord,b:Coord)=>a.row===b.row&&a.col===b.col;
const copyBoard=(board:BoardMatrix)=>board.map(row=>[...row]);
function seal<T>(value:T):T{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value as Record<string,unknown>).forEach(seal);Object.freeze(value);}return value;}

export function createCaptureFrames(trial:Trial,color:Color,size:Size):readonly CaptureFrame[]{
  const placed=trial.event.placed;
  if(!placed)throw new Error('提子分步演示需要一个已验证的落子事件');
  const temporary=copyBoard(trial.event.before);temporary[placed.row][placed.col]=color;
  const affected=(trial.event.groupsBefore??[]).filter(group=>group.color!==color&&group.liberties.some(point=>same(point,placed)));
  const groupMarkers:BoardMarker[]=affected.flatMap((group,groupIndex)=>group.stones.map((at,index)=>({markerId:`affected-${groupIndex}-${index}`,kind:'group',at,label:'正在检查的相邻对方棋块'})));
  const remaining=affected.flatMap(group=>group.liberties.filter(point=>!same(point,placed)));
  const coordinate=displayCoord(placed,size);
  const captureText=trial.event.captured.length?`${trial.event.captured.length} 颗棋被移除：${trial.event.captured.map(point=>displayCoord(point,size)).join('、')}。`:'没有相邻对方棋块无气，因此不移除棋子。';
  const frames:CaptureFrame[]=[
    {id:'place',title:'落子',explanation:`先把${color==='B'?'黑':'白'}棋暂放在 ${coordinate}。这只是演示帧，尚未写入真实历史。`,board:temporary,markers:[{markerId:'placed',kind:'last-move',at:placed,label:`暂放在 ${coordinate}`} ]},
    {id:'inspect-opponent',title:'检查对方气',explanation:affected.length?`检查与新棋相邻的 ${affected.length} 个对方棋块；${remaining.length?`仍可见的气有 ${remaining.map(point=>displayCoord(point,size)).join('、')}。`:'它们的最后一口气已被占住。'}`:'新棋旁没有需要提走的对方棋块。',board:temporary,markers:[...groupMarkers,...remaining.map((at,index)=>({markerId:`remaining-${index}`,kind:'liberty' as const,at,label:'对方棋块仍有的气'}))]},
    {id:'remove',title:'移除被提棋',explanation:captureText,board:trial.event.after,markers:trial.event.captured.map((at,index)=>({markerId:`removed-${index}`,kind:'target',at,label:'刚刚移除的棋子位置'}))},
    {id:'inspect-self',title:'查看己方气',explanation:`提子处理完成后，再检查新棋所在己方棋块：共有 ${trial.event.libertiesAfter.length} 口气。`,board:trial.event.after,markers:[{markerId:'final-move',kind:'last-move',at:placed,label:'已验证的最后一手'},...trial.event.libertiesAfter.map((at,index):BoardMarker=>({markerId:`self-liberty-${index}`,kind:'liberty',at,label:'最终己方棋块的气'}))]},
  ];
  return seal(frames);
}

export function isCapturedTarget(at:Coord,trial:Trial):boolean{return trial.event.captured.some(point=>same(point,at));}

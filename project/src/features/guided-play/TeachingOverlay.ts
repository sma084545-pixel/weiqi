import type {BoardMarker} from '../../core/rules';
import type {TeachingAnalysis,TeachingOverlayView} from './types';

/** Render only disclosed levels. Hidden answers never enter cell labels or the accessible tree. */
export function teachingOverlay(analysis:TeachingAnalysis|null,level:number,danger=false):TeachingOverlayView {
  if(!analysis)return {markers:[],caption:''};
  const markers:BoardMarker[]=[];
  if(danger)analysis.urgentGroups.flatMap(g=>g.stones).forEach((at,i)=>markers.push({markerId:`guided-danger-${i}`,kind:'group',at,label:'当前观察的一气棋块'}));
  if(level===2)analysis.region.forEach((at,i)=>markers.push({markerId:`guided-region-${i}`,kind:'candidate',at,label:'提示区域（并非确定落点）',text:'·'}));
  if(level===3)analysis.candidates.forEach((candidate,i)=>markers.push({markerId:`guided-candidate-${i}`,kind:'candidate',at:candidate.at,label:`候选 ${'ABC'[i]}`,text:'ABC'[i]}));
  if(level===4&&analysis.recommended)markers.push({markerId:'guided-recommended',kind:'candidate',at:analysis.recommended.at,label:'建议尝试点',text:'试'});
  return {markers,caption:level===2?'淡色点组成提示区域；仍需要你自己选择。':level===3?'A / B / C 是合法候选，不是每点的棋力评分。':level===4?'“试”是基于局部规则的建议；仍由你决定。':danger?'双线框标出正在观察的一气棋块。':''};
}

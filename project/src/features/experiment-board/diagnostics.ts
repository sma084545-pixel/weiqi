import {rulesEngine} from '../../core/rules';
import type {Coord} from '../../core/content.generated';
import {positionFromSnapshot,type SetupSnapshot} from './model';

export interface SetupDiagnosis {ok:boolean;code:string;message:string;points:Coord[]}
export function diagnoseSetup(snapshot:SetupSnapshot):SetupDiagnosis{
  const position=positionFromSnapshot(snapshot,'LOCAL-T06-DIAGNOSIS',1);
  const checked=rulesEngine.validateSetup(position);
  if(checked.ok)return {ok:true,code:'READY',message:'当前摆棋局面可作为新的规则起点。',points:[]};
  if(checked.error.at){
    const group=rulesEngine.getGroup(snapshot.board,checked.error.at);
    const points=group.ok&&group.value?group.value.stones:[checked.error.at];
    return {ok:false,code:checked.error.code,message:'标出的棋块没有气；摆棋示意可以保留，但规则试下必须先修复。',points};
  }
  return {ok:false,code:checked.error.code,message:'当前盘面或轮次不符合规则起点要求，请按字段提示修复。',points:[]};
}

import type {ContentBundle,MarkerDocument,Position} from '../../core/content.generated';
import {parseContent,validateContent} from '../../core/validation';
import {boardFromPosition} from '../../core/coordinates';
import {createSetupEditor,type ExperimentMarker,type SetupEditor,type SetupSnapshot,positionFromSnapshot} from './model';

export const T06_WORKSPACE_ID='LOCAL-T06-WORKSPACE';
export function bundleFromEditor(editor:SetupEditor):ContentBundle{
  const position=positionFromSnapshot(editor.current,'LOCAL-T06-POSITION',editor.revision);
  const markerDocuments:MarkerDocument[]=editor.current.markers.map((marker,index)=>({schemaVersion:1,id:`LOCAL-T06-MARKER-${index+1}`,revision:editor.revision,rulesetId:'GO-CLUB-AREA-1',kind:'Marker',size:editor.current.size,
    marker:{markerId:marker.markerId,type:marker.kind,points:[marker.at],label:marker.kind==='sequence'?`数字 ${marker.number??1}`:'目标',owner:null}}));
  return {schemaVersion:1,id:T06_WORKSPACE_ID,revision:editor.revision,rulesetId:'GO-CLUB-AREA-1',kind:'ContentBundle',developmentOnly:true,title:'T06 本机临时实验棋盘',items:[position,...markerDocuments]};
}
export function positionJson(editor:SetupEditor):string{return JSON.stringify(positionFromSnapshot(editor.current,'LOCAL-T06-POSITION',editor.revision),null,2)+'\n';}
export function bundleJson(editor:SetupEditor):string{return JSON.stringify(bundleFromEditor(editor),null,2)+'\n';}
export type RestoreResult={ok:true;value:SetupEditor}|{ok:false;issues:{code:string;path:string;message:string}[]};
export function restoreExperiment(input:unknown):RestoreResult{
  const checked=typeof input==='string'?parseContent(input):validateContent(input);if(!checked.ok)return checked;
  if(checked.value.kind!=='ContentBundle')return {ok:false,issues:[{code:'T06_BUNDLE_REQUIRED',path:'/kind',message:'完整实验回读需要包含 Position 与 Marker 的 ContentBundle。'}]};
  const positions=checked.value.items.filter((item):item is Position=>item.kind==='Position');
  const markers=checked.value.items.filter((item):item is MarkerDocument=>item.kind==='Marker');
  if(positions.length!==1)return {ok:false,issues:[{code:'T06_POSITION_COUNT',path:'/items',message:'实验包必须恰好包含一份 Position。'}]};
  const position=positions[0];
  const restoredMarkers:ExperimentMarker[]=[];
  for(const document of markers){
    if(document.size!==position.size||document.marker.points.length!==1||!['target','sequence'].includes(document.marker.type))return {ok:false,issues:[{code:'T06_MARKER_FORMAT',path:'/items',message:'实验包只接受与 Position 同尺寸的单点目标或数字标记。'}]};
    const at=document.marker.points[0];
    if(document.marker.type==='sequence'){
      const match=/^数字 ([1-9][0-9]?)$/.exec(document.marker.label);if(!match)return {ok:false,issues:[{code:'T06_SEQUENCE_LABEL',path:'/items',message:'数字标记须使用“数字 1”至“数字 99”的可回读标签。'}]};
      restoredMarkers.push({markerId:document.marker.markerId,kind:'sequence',at:{...at},number:Number(match[1])});
    }else restoredMarkers.push({markerId:document.marker.markerId,kind:'target',at:{...at}});
  }
  const snapshot:SetupSnapshot={size:position.size,board:boardFromPosition(position),toPlay:position.toPlay,markers:restoredMarkers};
  return {ok:true,value:{...createSetupEditor(snapshot),revision:checked.value.revision}};
}

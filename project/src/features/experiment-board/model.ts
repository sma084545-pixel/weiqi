import type {Color,Coord,Position,Size,StoneValue} from '../../core/content.generated';

export type SetupTool='place-B'|'place-W'|'erase'|'select-group'|'target-marker'|'sequence-marker';
export interface ExperimentMarker {markerId:string;kind:'target'|'sequence';at:Coord;number?:number}
export interface SetupSnapshot {size:Size;board:StoneValue[][];toPlay:Color;markers:ExperimentMarker[]}
export interface SetupEditor {current:SetupSnapshot;undoStack:SetupSnapshot[];redoStack:SetupSnapshot[];revision:number}

const copyBoard=(board:readonly (readonly StoneValue[])[])=>board.map(row=>[...row]);
export const copySnapshot=(value:SetupSnapshot):SetupSnapshot=>({size:value.size,board:copyBoard(value.board),toPlay:value.toPlay,markers:value.markers.map(marker=>({...marker,at:{...marker.at}}))});
export const emptySnapshot=(size:Size=9):SetupSnapshot=>({size,board:Array.from({length:size},()=>Array<StoneValue>(size).fill(null)),toPlay:'B',markers:[]});
export const createSetupEditor=(snapshot:SetupSnapshot=emptySnapshot()):SetupEditor=>({current:copySnapshot(snapshot),undoStack:[],redoStack:[],revision:1});
const sameSnapshot=(a:SetupSnapshot,b:SetupSnapshot)=>JSON.stringify(a)===JSON.stringify(b);

export function commitSnapshot(editor:SetupEditor,next:SetupSnapshot):SetupEditor{
  if(sameSnapshot(editor.current,next))return editor;
  return {current:copySnapshot(next),undoStack:[...editor.undoStack,copySnapshot(editor.current)],redoStack:[],revision:editor.revision+1};
}

export function applyPointTool(editor:SetupEditor,tool:SetupTool,at:Coord,sequenceNumber=1):SetupEditor{
  if(at.row<0||at.col<0||at.row>=editor.current.size||at.col>=editor.current.size)return editor;
  if(tool==='select-group')return editor;
  const next=copySnapshot(editor.current);
  if(tool==='place-B'||tool==='place-W')next.board[at.row][at.col]=tool==='place-B'?'B':'W';
  else if(tool==='erase'){
    next.board[at.row][at.col]=null;
    next.markers=next.markers.filter(marker=>marker.at.row!==at.row||marker.at.col!==at.col);
  }else if(tool==='target-marker'){
    const exists=next.markers.some(marker=>marker.kind==='target'&&marker.at.row===at.row&&marker.at.col===at.col);
    next.markers=next.markers.filter(marker=>marker.kind!=='target'||marker.at.row!==at.row||marker.at.col!==at.col);
    if(!exists)next.markers.push({markerId:`T06-TARGET-${at.row}-${at.col}`,kind:'target',at:{...at}});
  }else{
    const number=Math.max(1,Math.min(99,Math.trunc(sequenceNumber)));
    next.markers=next.markers.filter(marker=>marker.kind!=='sequence'||marker.at.row!==at.row||marker.at.col!==at.col);
    next.markers.push({markerId:`T06-SEQUENCE-${at.row}-${at.col}`,kind:'sequence',at:{...at},number});
  }
  return commitSnapshot(editor,next);
}

export function clearSetup(editor:SetupEditor):SetupEditor{return commitSnapshot(editor,emptySnapshot(editor.current.size));}
export function setSetupTurn(editor:SetupEditor,toPlay:Color):SetupEditor{return commitSnapshot(editor,{...copySnapshot(editor.current),toPlay});}
export function resizeLoss(snapshot:SetupSnapshot,size:Size){return {stones:snapshot.board.flatMap((row,r)=>row.flatMap((value,c)=>value!==null&&(r>=size||c>=size)?[1]:[])).length,markers:snapshot.markers.filter(marker=>marker.at.row>=size||marker.at.col>=size).length};}
export function resizeSetup(editor:SetupEditor,size:Size):SetupEditor{
  const next=emptySnapshot(size);next.toPlay=editor.current.toPlay;
  const limit=Math.min(size,editor.current.size);
  for(let row=0;row<limit;row++)for(let col=0;col<limit;col++)next.board[row][col]=editor.current.board[row][col];
  next.markers=editor.current.markers.filter(marker=>marker.at.row<size&&marker.at.col<size).map(marker=>({...marker,at:{...marker.at}}));
  return commitSnapshot(editor,next);
}
export function undoEdit(editor:SetupEditor):SetupEditor{
  const previous=editor.undoStack.at(-1);if(!previous)return editor;
  return {current:copySnapshot(previous),undoStack:editor.undoStack.slice(0,-1),redoStack:[...editor.redoStack,copySnapshot(editor.current)],revision:editor.revision+1};
}
export function redoEdit(editor:SetupEditor):SetupEditor{
  const next=editor.redoStack.at(-1);if(!next)return editor;
  return {current:copySnapshot(next),undoStack:[...editor.undoStack,copySnapshot(editor.current)],redoStack:editor.redoStack.slice(0,-1),revision:editor.revision+1};
}
export function positionFromSnapshot(snapshot:SetupSnapshot,id='LOCAL-T06-POSITION',revision=1):Position{
  return {schemaVersion:1,id,revision:Math.max(1,revision),rulesetId:'GO-CLUB-AREA-1',kind:'Position',size:snapshot.size,toPlay:snapshot.toPlay,historyPolicy:'fresh-setup',history:null,
    stones:snapshot.board.flatMap((row,r)=>row.flatMap((color,c)=>color?[{row:r,col:c,color}]:[]))};
}

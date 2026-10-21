import {describe,expect,it} from 'vitest';
import {applyPointTool,clearSetup,createSetupEditor,redoEdit,resizeLoss,resizeSetup,undoEdit} from '../../src/features/experiment-board/model';
import {diagnoseSetup} from '../../src/features/experiment-board/diagnostics';

const at=(row:number,col:number)=>({row,col});
describe('T06 setup editor history',()=>{
  it('keeps an intentionally no-liberty stone instead of auto-capturing it',()=>{
    let editor=createSetupEditor({size:5,toPlay:'B',markers:[],board:Array.from({length:5},()=>Array(5).fill(null))});
    editor=applyPointTool(editor,'place-B',at(2,2));for(const point of [at(1,2),at(2,1),at(2,3),at(3,2)])editor=applyPointTool(editor,'place-W',point);
    expect(editor.current.board[2][2]).toBe('B');expect(diagnoseSetup(editor.current)).toMatchObject({ok:false,points:[at(2,2)]});
    editor=applyPointTool(editor,'erase',at(1,2));expect(diagnoseSetup(editor.current).ok).toBe(true);
  });
  it('separates undo/redo and truncates redo after a new edit',()=>{
    let editor=createSetupEditor();editor=applyPointTool(editor,'place-B',at(0,0));editor=applyPointTool(editor,'place-W',at(0,1));const undone=undoEdit(editor);expect(undone.current.board[0][1]).toBeNull();expect(redoEdit(undone).current.board[0][1]).toBe('W');
    const branch=applyPointTool(undone,'place-W',at(1,0));expect(branch.redoStack).toEqual([]);expect(branch.current.board[0][0]).toBe('B');
  });
  it('stores target/number marks, erases both, and clears reversibly',()=>{
    let editor=createSetupEditor();editor=applyPointTool(editor,'target-marker',at(2,2));editor=applyPointTool(editor,'sequence-marker',at(2,3),7);expect(editor.current.markers.map(m=>[m.kind,m.number])).toEqual([['target',undefined],['sequence',7]]);
    editor=applyPointTool(editor,'erase',at(2,3));expect(editor.current.markers).toHaveLength(1);const cleared=clearSetup(editor);expect(cleared.current.markers).toEqual([]);expect(undoEdit(cleared).current.markers).toHaveLength(1);
  });
  it('reports crop loss before resizing and undo restores size and cropped content',()=>{
    let editor=createSetupEditor();editor=applyPointTool(editor,'place-B',at(4,4));editor=applyPointTool(editor,'place-W',at(8,8));editor=applyPointTool(editor,'target-marker',at(8,8));expect(resizeLoss(editor.current,5)).toEqual({stones:1,markers:1});
    const resized=resizeSetup(editor,5);expect(resized.current.size).toBe(5);expect(resized.current.board[4][4]).toBe('B');const restored=undoEdit(resized);expect(restored.current.size).toBe(9);expect(restored.current.board[8][8]).toBe('W');
  });
});

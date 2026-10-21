import {describe,expect,it} from 'vitest';
import {applyPointTool,createSetupEditor,undoEdit} from '../../src/features/experiment-board/model';
import {enterRules,returnToSetup,rulePass,rulePlace,ruleRedo,ruleUndo} from '../../src/features/experiment-board/machine';

const at=(row:number,col:number)=>({row,col});
describe('T06 setup/rules state machine',()=>{
  it('blocks invalid setup and requires explicit fresh-history confirmation',()=>{
    let editor=createSetupEditor({size:5,toPlay:'B',markers:[],board:Array.from({length:5},()=>Array(5).fill(null))});editor=applyPointTool(editor,'place-B',at(2,2));for(const p of [at(1,2),at(2,1),at(2,3),at(3,2)])editor=applyPointTool(editor,'place-W',p);
    expect(enterRules(editor,{toPlay:'B',komi:0,practiceMode:'full-game',confirmedFreshStart:false})).toMatchObject({ok:false,error:{code:'CONFIRM_FRESH_START'}});
    expect(enterRules(editor,{toPlay:'B',komi:0,practiceMode:'full-game',confirmedFreshStart:true})).toMatchObject({ok:false,error:{code:'INVALID_SETUP'}});
  });
  it('starts with exactly one root layout, alternates turn, and game undo never changes edit history',()=>{
    let editor=createSetupEditor();editor=applyPointTool(editor,'place-B',at(2,2));const started=enterRules(editor,{toPlay:'B',komi:0,practiceMode:'full-game',confirmedFreshStart:true});if(!started.ok)throw Error(JSON.stringify(started.error));
    expect(started.value.game.history.layouts).toHaveLength(1);expect(started.value.game.moves).toEqual([]);const played=rulePlace(started.value,at(0,0));if(!played.ok)throw Error(JSON.stringify(played.error));expect(played.value.game).toMatchObject({toPlay:'W'});expect(played.value.game.moves).toHaveLength(1);expect(played.value.game.history.layouts).toHaveLength(2);expect(played.value.sourceEditor.undoStack).toHaveLength(1);
    const undone=ruleUndo(played.value);if(!undone.ok)throw Error(JSON.stringify(undone.error));expect(undone.value.game.moves).toHaveLength(0);expect(undone.value.sourceEditor.undoStack).toHaveLength(1);const redone=ruleRedo(undone.value);expect(redone.ok&&redone.value.game.moves).toHaveLength(1);
  });
  it('two passes enter confirmation without adding repeated layouts',()=>{
    const started=enterRules(createSetupEditor(),{toPlay:'B',komi:0,practiceMode:'full-game',confirmedFreshStart:true});if(!started.ok)throw Error();const once=rulePass(started.value);if(!once.ok)throw Error();const twice=rulePass(once.value);if(!twice.ok)throw Error();expect(twice.value.game).toMatchObject({phase:'scoring',consecutivePasses:2});expect(twice.value.game.history.layouts).toHaveLength(1);
  });
  it('returning from rules creates one undoable setup edit and does not preserve a false game record',()=>{
    const editor=createSetupEditor();const started=enterRules(editor,{toPlay:'B',komi:0,practiceMode:'full-game',confirmedFreshStart:true});if(!started.ok)throw Error();const played=rulePlace(started.value,at(0,0));if(!played.ok)throw Error();const returned=returnToSetup(played.value);expect(returned.mode).toBe('setup');expect(returned.editor.current.board[0][0]).toBe('B');expect(returned.editor.undoStack).toHaveLength(1);expect(undoEdit(returned.editor).current.board[0][0]).toBeNull();
  });
});

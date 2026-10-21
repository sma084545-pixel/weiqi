import {describe,expect,it} from 'vitest';
import {applyPointTool,createSetupEditor,setSetupTurn} from '../../src/features/experiment-board/model';
import {bundleFromEditor,bundleJson,positionJson,restoreExperiment} from '../../src/features/experiment-board/storage';
import {parseContent,validateContent} from '../../src/core/validation';

const at=(row:number,col:number)=>({row,col});
describe('T06 Position and marker export',()=>{
  it('exports a standalone valid Position and a lossless schema-valid bundle',()=>{
    let editor=createSetupEditor();editor=applyPointTool(editor,'place-W',at(3,4));editor=applyPointTool(editor,'target-marker',at(3,4));editor=applyPointTool(editor,'sequence-marker',at(4,4),12);editor=setSetupTurn(editor,'W');
    const position=parseContent(positionJson(editor));expect(position.ok&&position.value.kind).toBe('Position');const bundle=parseContent(bundleJson(editor));expect(bundle.ok&&bundle.value.kind).toBe('ContentBundle');const restored=restoreExperiment(bundleJson(editor));if(!restored.ok)throw Error(JSON.stringify(restored.issues));expect(restored.value.current).toEqual(editor.current);
  });
  it('rejects duplicate and out-of-bounds imported stones before changing an editor',()=>{
    const base=bundleFromEditor(createSetupEditor());const position=base.items[0];if(position.kind!=='Position')throw Error();position.stones=[{row:0,col:0,color:'B'},{row:0,col:0,color:'W'}];expect(restoreExperiment(base)).toMatchObject({ok:false,issues:[{code:'DUPLICATE_POINT',path:'/items/0/stones/1'}]});
    const outside=bundleFromEditor(createSetupEditor());const p=outside.items[0];if(p.kind!=='Position')throw Error();p.stones=[{row:20,col:0,color:'B'}];const result=restoreExperiment(outside);expect(result.ok).toBe(false);if(!result.ok)expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({code:'SCHEMA_FIELD',path:'/items/0/stones/0/row'})]));
  });
  it('rejects unknown schema major through the shared validator',()=>{const value={...bundleFromEditor(createSetupEditor()),schemaVersion:2};expect(validateContent(value)).toMatchObject({ok:false,issues:[{code:'SCHEMA_VERSION',path:'/schemaVersion'}]});});
});

import {describe,expect,it} from 'vitest';
import type {StoragePort} from '../../src/core/persistence';
import {createLearningProgressStore,emptyLearningProgress,LEARNING_PROGRESS_KEY,recordVisit,setStageMark} from '../../src/features/learning-hub/progress';

function memoryPort(seed:Record<string,string>={}):StoragePort&{data:Map<string,string>}{
  const data=new Map(Object.entries(seed));
  return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);},removeItem:key=>{data.delete(key);}};
}

describe('T03 local learning progress',()=>{
  it('persists visit, self mark, and recent module across a fresh store instance',()=>{
    const port=memoryPort();
    const first=createLearningProgressStore(port);
    let progress=recordVisit(emptyLearningProgress(),'stage-01-guide');
    progress=setStageMark(progress,'STAGE-01','practice');
    expect(first.save(progress)).toMatchObject({ok:true});
    expect(createLearningProgressStore(port).load()).toEqual({ok:true,value:progress});
  });
  it('clear removes only the progress key and preserves content records',()=>{
    const contentKey='go-club:v1:DEV-LIB-001';
    const port=memoryPort({[contentKey]:'{"kind":"Puzzle"}',[LEARNING_PROGRESS_KEY]:JSON.stringify(recordVisit(emptyLearningProgress(),'board-lab'))});
    const cleared=createLearningProgressStore(port).clear();
    expect(cleared).toEqual({ok:true,value:emptyLearningProgress()});
    expect(port.data.has(LEARNING_PROGRESS_KEY)).toBe(false);
    expect(port.data.get(contentKey)).toBe('{"kind":"Puzzle"}');
  });
  it('does not silently replace malformed or unknown-version progress',()=>{
    for(const raw of ['{',JSON.stringify({...emptyLearningProgress(),schemaVersion:2})]){
      const port=memoryPort({[LEARNING_PROGRESS_KEY]:raw});
      const result=createLearningProgressStore(port).load();
      expect(result).toMatchObject({ok:false,issue:{code:'INVALID_PROGRESS'}});
      expect(port.data.get(LEARNING_PROGRESS_KEY)).toBe(raw);
    }
  });
  it('reports unavailable storage while preserving an in-memory fallback',()=>{
    const blocked:StoragePort={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('quota');},removeItem:()=>{throw Error('blocked');}};
    const store=createLearningProgressStore(blocked);
    expect(store.load()).toMatchObject({ok:false,issue:{code:'STORAGE_UNAVAILABLE'},fallback:{visitedModuleIds:[]}});
    const progress=recordVisit(emptyLearningProgress(),'stage-05-guide');
    expect(store.save(progress)).toMatchObject({ok:false,fallback:progress});
  });
  it('does not duplicate visits and allows marks to be changed or removed',()=>{
    const once=recordVisit(emptyLearningProgress(),'stage-05-guide');
    expect(recordVisit(once,'stage-05-guide')).toBe(once);
    const learned=setStageMark(once,'STAGE-05','learned');
    expect(learned.stageMarks['STAGE-05']).toBe('learned');
    const practice=setStageMark(learned,'STAGE-05','practice');
    expect(practice.stageMarks['STAGE-05']).toBe('practice');
    expect(setStageMark(practice,'STAGE-05',null).stageMarks['STAGE-05']).toBeUndefined();
  });
});


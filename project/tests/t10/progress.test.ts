import {describe,expect,it} from 'vitest';
import type {StoragePort} from '../../src/core/persistence';
import {attemptKey,createPuzzleProgressStore,currentAttempt,emptyPuzzleProgress,PUZZLE_PROGRESS_KEY,recordPuzzleAttempt} from '../../src/features/puzzle-runner/progress';
const memory=():StoragePort&{data:Map<string,string>}=>{const data=new Map<string,string>();return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);},removeItem:key=>{data.delete(key);}};};
describe('T10 local puzzle progress',()=>{
  it('stores attempts and hint use under schema, id, and exact puzzle revision',()=>{
    const port=memory(),store=createPuzzleProgressStore(port);let progress=recordPuzzleAttempt(emptyPuzzleProgress(),'LIB-001',1,'failure',[0]);progress=recordPuzzleAttempt(progress,'LIB-001',1,'success',[1]);expect(store.save(progress).ok).toBe(true);
    const restored=store.load();expect(restored.ok).toBe(true);if(restored.ok){expect(currentAttempt(restored.value,'LIB-001',1)).toMatchObject({attemptCount:2,hintLevels:[0,1],completed:true});expect(currentAttempt(restored.value,'LIB-001',2)).toBeUndefined();}
    expect(JSON.parse(port.data.get(PUZZLE_PROGRESS_KEY)!).attempts[attemptKey('LIB-001',1)].puzzleRevision).toBe(1);
  });
  it('does not turn unknown into a failure or completed result',()=>{const next=recordPuzzleAttempt(emptyPuzzleProgress(),'CAP-001',1,'unknown',[]);expect(currentAttempt(next,'CAP-001',1)).toMatchObject({lastVerdict:'unknown',completed:false});});
  it('preserves malformed external data and falls back without deleting it',()=>{const port=memory();port.data.set(PUZZLE_PROGRESS_KEY,'{"schemaVersion":2}');const result=createPuzzleProgressStore(port).load();expect(result.ok).toBe(false);expect(port.data.get(PUZZLE_PROGRESS_KEY)).toBe('{"schemaVersion":2}');});
});

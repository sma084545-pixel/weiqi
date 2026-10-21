import {describe,expect,it} from 'vitest';
import {collectLegacyRecords,namespaceForKey,recordForValue,validateLocalBackup,type LocalBackup} from '../../src/core/unified-persistence';
import {blankDraft} from '../../src/features/teacher-editor/model';
import {parseEditorSession} from '../../src/features/teacher-editor/storage';

class MemoryStorage implements Storage{
  private values=new Map<string,string>();get length(){return this.values.size;}clear(){this.values.clear();}getItem(key:string){return this.values.get(key)??null;}key(index:number){return [...this.values.keys()][index]??null;}removeItem(key:string){this.values.delete(key);}setItem(key:string,value:string){this.values.set(key,value);}
}
const base=():LocalBackup=>({schemaVersion:1,id:'LOCAL-BACKUP-TEST',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'LocalBackup',appVersion:'0.16.0',storageSchemaVersion:1,createdAt:'2026-09-20T00:00:00.000Z',records:[]});

describe('T16 unified persistence contracts',()=>{
  it('classifies all installed local domains without treating content revision as storage revision',()=>{
    expect(namespaceForKey('go-club:learning-progress:v1')).toBe('progress');expect(namespaceForKey('go-club:puzzle-progress:v1')).toBe('attempts');expect(namespaceForKey('go-club:v1:LOCAL-T08-FULL-GAME')).toBe('games');expect(namespaceForKey('go-club:teacher-drafts:v1')).toBe('drafts');expect(namespaceForKey('go-club:file-exchange:v1')).toBe('exchange');expect(namespaceForKey('go-club:peer-discussions:v1')).toBe('discussions');expect(namespaceForKey('go-club:settings:v1')).toBe('settings');
    expect(recordForValue('go-club:puzzle-progress:v1',JSON.stringify({schemaVersion:1,id:'LOCAL',revision:7}))).toMatchObject({schemaVersion:1,contentId:'LOCAL',contentRevision:7});
  });
  it('collects only go-club legacy keys and preserves originals for a later atomic migration',()=>{const storage=new MemoryStorage();storage.setItem('other','leave');storage.setItem('go-club:learning-progress:v1','{"schemaVersion":1}');const records=collectLegacyRecords(storage);expect(records).toHaveLength(1);expect(records[0]).toMatchObject({key:'go-club:learning-progress:v1',namespace:'progress'});expect(storage.getItem('go-club:learning-progress:v1')).not.toBeNull();});
  it('accepts a valid backup and rejects unknown major, duplicate keys, and oversized values',()=>{const valid=base();valid.records=[recordForValue('go-club:settings:v1',JSON.stringify({schemaVersion:1,id:'LOCAL-APP-SETTINGS',revision:1}))];expect(validateLocalBackup(valid).ok).toBe(true);expect(validateLocalBackup({...valid,schemaVersion:2}).ok).toBe(false);expect(validateLocalBackup({...valid,records:[valid.records[0],valid.records[0]]}).ok).toBe(false);expect(validateLocalBackup({...valid,records:[{...valid.records[0],value:'x'.repeat(5_000_001)}]}).ok).toBe(false);});
  it('rejects non-project keys before restore so a damaged backup cannot clear current data',()=>{const invalid=base();invalid.records=[{...recordForValue('go-club:settings:v1','{}'),key:'foreign:key'}];const checked=validateLocalBackup(invalid);expect(checked.ok).toBe(false);if(!checked.ok)expect(checked.message).toContain('现有数据未改变');});
  it('validates an in-progress teacher editor session without treating it as a published draft',()=>{const checked=parseEditorSession({schemaVersion:1,id:'LOCAL-T14-EDITOR-SESSION',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'TeacherEditorSession',entry:blankDraft(1),readOnly:false,updatedAt:'2026-09-21T00:00:00.000Z'});expect(checked.ok).toBe(true);expect(parseEditorSession({...((checked.ok&&checked.value)||{}),schemaVersion:2}).ok).toBe(false);});
});

import {describe,expect,it} from 'vitest';
import type {ContentBundle,ContentDocument,Position} from '../../src/core/content.generated';
import {rulesEngine} from '../../src/core/rules';
import {T14_TEMPLATES} from '../../src/features/teacher-editor/templates';
import {commitJsonImport,documentKey,previewJsonImport,safeFilename} from '../../src/features/file-exchange/json';
import {emptyExchangeLibrary} from '../../src/features/file-exchange/storage';

const position:Position={schemaVersion:1,id:'TEST-POSITION',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size:5,stones:[{row:0,col:0,color:'B'}],toPlay:'W',historyPolicy:'fresh-setup',history:null};

describe('T15 JSON import',()=>{
  it('round-trips Puzzle metadata, hints and variation tree without changing it',()=>{
    const source=T14_TEMPLATES.find(item=>item.id==='TEMPLATE-LIFE-001')!;
    const preview=previewJsonImport(JSON.stringify(source),'life.json');expect(preview.ok).toBe(true);expect(preview.counts).toEqual({Puzzle:1});
    const result=commitJsonImport(emptyExchangeLibrary(),preview,{},new Set());expect(result.ok).toBe(true);if(!result.ok)return;
    expect(result.imported[0]).toEqual(source);expect((result.imported[0] as typeof source).hints).toEqual(source.hints);expect((result.imported[0] as typeof source).answer).toEqual(source.answer);
  });

  it('accepts Position, verified GameRecord/GameState and ContentBundle',()=>{
    const started=rulesEngine.startGame(position,{mode:'full-game',komi:0,gameId:'TEST-GAME'});expect(started.ok).toBe(true);if(!started.ok)return;
    const bundle:ContentBundle={schemaVersion:1,id:'TEST-BUNDLE',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'ContentBundle',developmentOnly:true,title:'测试包',items:[position,started.value]};
    const preview=previewJsonImport(JSON.stringify(bundle),'bundle.json');expect(preview.ok).toBe(true);expect(preview.counts).toEqual({Position:1,GameState:1});expect(preview.candidates).toHaveLength(2);
  });

  it('rejects unknown major, forged game state and configured limits without mutating the library',()=>{
    const library={...emptyExchangeLibrary(),documents:[position]};const before=JSON.stringify(library);
    expect(previewJsonImport(JSON.stringify({...position,schemaVersion:2}),'bad.json').issues[0]).toMatchObject({code:'SCHEMA_VERSION',path:'/schemaVersion'});
    const started=rulesEngine.startGame(position,{mode:'full-game',komi:0,gameId:'TEST-FORGED'});if(!started.ok)throw new Error('start');const forged={...started.value,captures:{B:99,W:0}};
    expect(previewJsonImport(JSON.stringify(forged),'forged.json').issues.some(item=>item.code==='IMPORT_MISMATCH')).toBe(true);
    expect(previewJsonImport(JSON.stringify(position),'large.json',{limits:{maxBytes:20}}).issues[0].code).toBe('IMPORT_SIZE');
    expect(previewJsonImport(JSON.stringify({a:{b:{c:{d:1}}}}),'deep.json',{limits:{maxDepth:2}}).issues[0].code).toBe('IMPORT_DEPTH');
    const bad=previewJsonImport('{','bad.json');expect(commitJsonImport(library,bad,{},new Set())).toMatchObject({ok:false});expect(JSON.stringify(library)).toBe(before);
  });

  it('requires explicit conflict handling and never replaces official IDs',()=>{
    const preview=previewJsonImport(JSON.stringify(position),'position.json',{localDocuments:[position]});expect(preview.conflicts[0]).toMatchObject({kind:'local',allowed:['skip','replace','keep-copy']});expect(commitJsonImport({...emptyExchangeLibrary(),documents:[position]},preview,{},new Set()).ok).toBe(false);
    const replaced=commitJsonImport({...emptyExchangeLibrary(),documents:[position]},preview,{[documentKey(position)]:'replace'},new Set());expect(replaced.ok).toBe(true);if(replaced.ok)expect(replaced.library.documents).toHaveLength(1);
    const official=previewJsonImport(JSON.stringify(position),'official.json',{officialIds:new Set([position.id])});expect(official.conflicts[0].allowed).toEqual(['skip','keep-copy']);const kept=commitJsonImport(emptyExchangeLibrary(),official,{[documentKey(position)]:'keep-copy'},new Set([position.id]));expect(kept.ok).toBe(true);if(kept.ok)expect(kept.imported[0].id).toMatch(/^TEST-POSITION-COPY-/);
  });

  it('normalizes hostile filenames',()=>{expect(safeFilename('../<script>:题?.json')).toBe('-script-题-.json');});
});

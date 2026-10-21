import {describe,expect,it} from 'vitest';
import {CAPTURE_GAME_ROUTE,CAPTURE_LAB_ROUTE,COOPERATIVE_ROUTE,createModuleRegistry,EXPERIMENT_BOARD_ROUTE,HOME_ROUTE,INSTALLED_CONTENT_IDS,LEGACY_PUZZLE_ROUTE,LIBERTY_LAB_ROUTE,LIFE_LAB_ROUTE,MODULE_DEFINITIONS,moduleRegistry,PUZZLE_ROUTE,TERRITORY_ROUTE} from '../../src/features/learning-hub/registry';

describe('T03 module registry',()=>{
  it('registers unique ids and routes with explicit return addresses',()=>{
    expect(new Set(MODULE_DEFINITIONS.map(item=>item.id)).size).toBe(MODULE_DEFINITIONS.length);
    expect(new Set(MODULE_DEFINITIONS.map(item=>item.route)).size).toBe(MODULE_DEFINITIONS.length);
    for(const item of MODULE_DEFINITIONS){expect(item.returnRoute).toMatch(/^#\//);expect(Array.isArray(item.requiredContentIds)).toBe(true);}
  });
  it('exposes only installed modules as available navigation targets',()=>{
    expect(moduleRegistry.resolve('#/route/STAGE-01')).toMatchObject({ok:true,module:{id:'stage-01-guide'}});
    expect(moduleRegistry.resolve(LIBERTY_LAB_ROUTE)).toMatchObject({ok:true,module:{id:'liberty-lab'}});
    expect(moduleRegistry.resolve(CAPTURE_LAB_ROUTE)).toMatchObject({ok:true,module:{id:'capture-lab'}});
    expect(moduleRegistry.resolve(EXPERIMENT_BOARD_ROUTE)).toMatchObject({ok:true,module:{id:'experiment-board'}});
    expect(moduleRegistry.resolve(CAPTURE_GAME_ROUTE)).toMatchObject({ok:true,module:{id:'capture-game'}});
    expect(moduleRegistry.resolve(PUZZLE_ROUTE)).toMatchObject({ok:true,module:{id:'puzzle-runner'}});
    expect(moduleRegistry.resolve(LEGACY_PUZZLE_ROUTE)).toMatchObject({ok:true,module:{id:'puzzle-runner-legacy'}});
    expect(moduleRegistry.resolve(LIFE_LAB_ROUTE)).toMatchObject({ok:true,module:{id:'life-lab'}});
    expect(moduleRegistry.resolve(COOPERATIVE_ROUTE)).toMatchObject({ok:true,module:{id:'cooperative-challenge'}});
    expect(moduleRegistry.resolve(TERRITORY_ROUTE)).toMatchObject({ok:true,module:{id:'territory-trainer'}});
  });
  it('reports missing content and provides a usable fallback',()=>{
    const withoutLesson=new Set([...INSTALLED_CONTENT_IDS].filter(id=>id!=='DEV-LIB-001'));
    const registry=createModuleRegistry(MODULE_DEFINITIONS,withoutLesson);
    expect(registry.resolve('#/route/STAGE-01')).toEqual(expect.objectContaining({ok:false,reason:'missing-content',fallbackRoute:'#/route',missingContentIds:['DEV-LIB-001']}));
    expect(registry.resolve('#/route')).toMatchObject({ok:true});
  });
  it('fails the T04 module closed when one required demo is missing',()=>{
    const withoutDemo=new Set([...INSTALLED_CONTENT_IDS].filter(id=>id!=='DEMO-LIB-008'));
    expect(createModuleRegistry(MODULE_DEFINITIONS,withoutDemo).resolve(LIBERTY_LAB_ROUTE)).toEqual(expect.objectContaining({ok:false,reason:'missing-content',fallbackRoute:'#/route/STAGE-01',missingContentIds:['DEMO-LIB-008']}));
  });
  it('fails the T05 module closed when one required demo is missing',()=>{
    const withoutDemo=new Set([...INSTALLED_CONTENT_IDS].filter(id=>id!=='DEMO-CAP-006'));
    expect(createModuleRegistry(MODULE_DEFINITIONS,withoutDemo).resolve(CAPTURE_LAB_ROUTE)).toEqual(expect.objectContaining({ok:false,reason:'missing-content',fallbackRoute:'#/route/STAGE-02',missingContentIds:['DEMO-CAP-006']}));
  });
  it('fails the T11 module closed when a referenced LIFE revision is missing',()=>{
    const withoutLife=new Set([...INSTALLED_CONTENT_IDS].filter(id=>id!=='LIFE-005'));
    expect(createModuleRegistry(MODULE_DEFINITIONS,withoutLife).resolve(LIFE_LAB_ROUTE)).toEqual(expect.objectContaining({ok:false,reason:'missing-content',fallbackRoute:'#/route/STAGE-05',missingContentIds:['LIFE-005']}));
  });
  it('fails the T12 module closed when a referenced discussion puzzle is missing',()=>{
    const withoutDiscussion=new Set([...INSTALLED_CONTENT_IDS].filter(id=>id!=='DISC-005'));
    expect(createModuleRegistry(MODULE_DEFINITIONS,withoutDiscussion).resolve(COOPERATIVE_ROUTE)).toEqual(expect.objectContaining({ok:false,reason:'missing-content',fallbackRoute:'#/route/STAGE-06',missingContentIds:['DISC-005']}));
  });
  it('fails the T13 module closed when a referenced END fixture is missing',()=>{
    const withoutFixture=new Set([...INSTALLED_CONTENT_IDS].filter(id=>id!=='END-006'));
    expect(createModuleRegistry(MODULE_DEFINITIONS,withoutFixture).resolve(TERRITORY_ROUTE)).toEqual(expect.objectContaining({ok:false,reason:'missing-content',fallbackRoute:'#/route/STAGE-03',missingContentIds:['END-006']}));
  });
  it('unknown routes fail closed to the home recovery path',()=>{
    expect(moduleRegistry.resolve('#/not-a-module')).toEqual({ok:false,reason:'not-found',requestedRoute:'#/not-a-module',fallbackRoute:HOME_ROUTE});
  });
  it('rejects duplicate module identifiers and routes',()=>{
    expect(()=>createModuleRegistry([...MODULE_DEFINITIONS,MODULE_DEFINITIONS[0]],INSTALLED_CONTENT_IDS)).toThrow('Duplicate module id');
    const duplicateRoute={...MODULE_DEFINITIONS[0],id:'another-home'};
    expect(()=>createModuleRegistry([...MODULE_DEFINITIONS,duplicateRoute],INSTALLED_CONTENT_IDS)).toThrow('Duplicate module route');
  });
});

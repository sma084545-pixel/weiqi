import {describe,expect,it} from 'vitest';
import {evaluateLibertyCount,evaluateLibertySet,pointList} from '../../src/features/liberty-lab/evaluation';

const expected=[{row:1,col:2},{row:2,col:1}];

describe('T04 point-set evaluation',()=>{
  it('compares sets independently of order',()=>expect(evaluateLibertySet(expected,[{row:2,col:1},{row:1,col:2}])).toEqual({correct:true,missing:[],extra:[],duplicates:[]}));
  it('reports missing, extra, and duplicate points separately',()=>expect(evaluateLibertySet(expected,[{row:1,col:2},{row:1,col:2},{row:0,col:0}])).toEqual({correct:false,missing:[{row:2,col:1}],extra:[{row:0,col:0}],duplicates:[{row:1,col:2}]}));
  it('formats display coordinates with the shared top-left data convention',()=>expect(pointList([{row:0,col:0},{row:4,col:4}],5)).toBe('A5、E1'));
});

describe('T04 numeric prediction evaluation',()=>{
  it('rejects blank, negative, and non-integer input with stable codes',()=>{
    expect(evaluateLibertyCount(4,'  ')).toMatchObject({valid:false,code:'EMPTY_PREDICTION'});
    expect(evaluateLibertyCount(4,'-1')).toMatchObject({valid:false,code:'NEGATIVE_PREDICTION'});
    expect(evaluateLibertyCount(4,'2.5')).toMatchObject({valid:false,code:'NON_INTEGER_PREDICTION'});
    expect(evaluateLibertyCount(4,'four')).toMatchObject({valid:false,code:'NON_INTEGER_PREDICTION'});
  });
  it('explains undercount and overcount causes rather than returning a bare verdict',()=>{
    expect(evaluateLibertyCount(4,'2')).toMatchObject({valid:true,correct:false,message:expect.stringContaining('漏看')});
    expect(evaluateLibertyCount(4,'6')).toMatchObject({valid:true,correct:false,message:expect.stringContaining('重复')});
    expect(evaluateLibertyCount(4,'4')).toMatchObject({valid:true,correct:true});
  });
});

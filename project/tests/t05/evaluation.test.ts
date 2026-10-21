import {describe,expect,it} from 'vitest';
import {evaluateCapturePrediction} from '../../src/features/capture-lab/evaluation';
const a={row:1,col:2},b={row:2,col:1},x={row:0,col:0};
describe('T05 capture prediction evaluation',()=>{
  it('requires an explicit prediction, including explicit no-capture',()=>{expect(evaluateCapturePrediction([],{selected:[],explicitNone:false}).valid).toBe(false);expect(evaluateCapturePrediction([],{selected:[],explicitNone:true})).toMatchObject({valid:true,correct:true});});
  it('reports missing and extra coordinates as sets',()=>{expect(evaluateCapturePrediction([a,b],{selected:[a,x],explicitNone:false})).toMatchObject({valid:true,correct:false,missing:[b],extra:[x]});});
  it('accepts an exact capture set regardless of selection order',()=>{expect(evaluateCapturePrediction([a,b],{selected:[b,a],explicitNone:false}).correct).toBe(true);});
});


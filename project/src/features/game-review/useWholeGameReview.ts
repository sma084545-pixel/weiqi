import {useEffect,useMemo,useRef,useState} from 'react';
import type {StoragePort} from '../../core/persistence';
import type {ReviewRecord} from './model';
import {inspectTactics,kataGoReviewAnalyzer,samplePlan,type EngineSample,type TacticalReport,type ReviewAnalyzer} from './analysis';
import {validateAnalysisResponse} from '../katago-review/client';

export function useWholeGameReview(record:ReviewRecord,port:StoragePort,origin:string|null,enabled:boolean,provider?:ReviewAnalyzer){
  const game=record.game,key=`go-club:full-game:review:${record.id}:analysis:${record.humanColor}`;
  const analyzer=useMemo(()=>provider??(origin?kataGoReviewAnalyzer(origin):null),[origin,provider]);
  const [attempt,setAttempt]=useState(0),[report,setReport]=useState<TacticalReport|null>(null),[samples,setSamples]=useState<EngineSample[]>([]),[message,setMessage]=useState(''),[phase,setPhase]=useState<'idle'|'local'|'engine'|'done'|'error'|'cancelled'>('idle');
  const active=useRef<AbortController|null>(null),ticket=useRef(0);
  useEffect(()=>{
    if(!enabled||game.phase!=='finished')return;
    const controller=new AbortController(),n=++ticket.current;active.current=controller;
    const live=()=>!controller.signal.aborted&&n===ticket.current;
    const timer=setTimeout(async()=>{
      setPhase('local');setMessage('正在核查全盘的气、提子与连接…');
      let values:EngineSample[]=[],writeFailed=false;
      try{
        const local=await inspectTactics(game,record.humanColor,controller.signal);if(!live())return;setReport(local);
        try{const d=JSON.parse(port.getItem(key)??'null');if(d?.schemaVersion===1&&d.sourceId===record.id&&d.rulesetId==='GO-CLUB-AREA-1'&&Array.isArray(d.samples)&&d.samples.length<=4){values=d.samples.map((s:EngineSample)=>{if(!Number.isInteger(s.index)||s.index<0||s.index>game.moves.length)throw Error();const frame=s.index===game.moves.length?game:game.undoStack[s.index];return {index:s.index,result:validateAnalysisResponse(s.result,s.result.positionId,game.size,frame.toPlay)};});}}catch{values=[];}
        setSamples(values);
        const plan=samplePlan(game,local);
        if(!analyzer){setPhase('done');setMessage('基础战术复盘完成。当前未连接真实引擎；没有生成模拟分数。');return;}
        for(const index of plan){
          if(values.some(s=>s.index===index))continue;
          if(!live())return;setPhase('engine');setMessage(`正在用真实 KataGo 抽样比较关键局面（最多 ${plan.length} 个）；可随时取消。`);
          const result=await analyzer.analyze(game,index,controller.signal);if(!live())return;
          const frame=index===game.moves.length?game:game.undoStack[index];validateAnalysisResponse(result,result.positionId,game.size,frame.toPlay);
          values=[...values,{index,result}];setSamples(values);
          try{port.setItem(key,JSON.stringify({schemaVersion:1,id:`${record.id}-ANALYSIS-${record.humanColor}`,revision:1,rulesetId:'GO-CLUB-AREA-1',sourceId:record.id,samples:values}));}catch{writeFailed=true;setMessage('分析结果仍在本页，但本机保存失败；可先导出复盘报告。');}
        }
        if(live()){setPhase('done');setMessage(plan.length?`复盘完成：全盘基础战术核查 + ${values.length} 个真实 KataGo 局面样本。没有逐手扫描整盘。${writeFailed?' 本机保存未完成，请先导出复盘报告。':''}`:'本局没有可分析的棋盘落子，未请求远程搜索。');}
      }catch(e){if(live()){setPhase('error');setMessage(`${e instanceof Error?e.message:'引擎分析失败。'} 基础复盘与续下仍可使用；不会自动反复请求。`);}}
    },120);
    return()=>{clearTimeout(timer);controller.abort();if(active.current===controller)active.current=null;};
  },[game,record.id,record.humanColor,key,port,analyzer,enabled,attempt]);
  return {report,samples,message,phase,retry:()=>setAttempt(n=>n+1),cancel:()=>{ticket.current++;active.current?.abort();setPhase('cancelled');setMessage('已取消远程分析；已核查的局面保留，原棋谱未改变。');}};
}

import {spawn,type ChildProcessWithoutNullStreams} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import type {AnalysisHealth,ReviewAnalysisResponse} from '../../src/core/analysis/contract';
import {ApiError,normalizeAnalysis,type PreparedAnalysis} from './position';

type Job={id:string;prepared:PreparedAnalysis;started:number;resolve:(v:ReviewAnalysisResponse)=>void;reject:(e:unknown)=>void;timer:ReturnType<typeof setTimeout>;signal?:AbortSignal;abort:()=>void;settled:boolean;cleanup?:ReturnType<typeof setTimeout>};
export interface EngineOptions {executable:string;args:string[];version:string;model:string;maxVisits:number;maxQueue:number;timeoutMs:number;startupTimeoutMs:number;restartDelayMs?:number;cancelGraceMs?:number;log?:(event:string,data?:Record<string,unknown>)=>void;}

/** One persistent JSON analysis subprocess, one in-flight search, bounded FIFO. */
export class KataGoEngine {
  private child:ChildProcessWithoutNullStreams|null=null;
  private queue:Job[]=[];
  private active:Job|null=null;
  private status:AnalysisHealth['status']='starting';
  private created=Date.now();
  private restartTimer?:ReturnType<typeof setTimeout>;
  private startupTimer?:ReturnType<typeof setTimeout>;
  private failures=0;
  private stopping=false;
  private logs:string[]=[];
  private instance=0;
  constructor(readonly options:EngineOptions){}
  health():AnalysisHealth{return {service:'go-club-katago',status:this.status,ready:this.status==='ready',active:this.active?1:0,queued:this.queue.length,engineVersion:this.options.version,model:this.options.model,uptimeSeconds:Math.floor((Date.now()-this.created)/1000)};}
  start(){if(this.child||this.stopping)return;this.launch();}
  private log(event:string,data?:Record<string,unknown>){this.options.log?.(event,data);}
  private launch(){
    if(this.stopping)return;
    this.status=this.failures?'restarting':'starting';const instance=++this.instance;
    let child:ChildProcessWithoutNullStreams;
    try{child=spawn(this.options.executable,this.options.args,{stdio:['pipe','pipe','pipe'],env:{...process.env,OMP_NUM_THREADS:'1',OPENBLAS_NUM_THREADS:'1'}});}catch{this.failed(instance);return;}
    this.child=child;let stdout='',stderr='',versionReady=false,modelReady=false;
    const versionId=`version-${instance}`,modelId=`models-${instance}`;
    const ready=()=>{if(versionReady&&modelReady&&instance===this.instance&&!this.stopping){clearTimeout(this.startupTimer);this.status='ready';this.failures=0;this.log('engine_ready',{startupMs:Date.now()-this.created});this.pump();}};
    child.stdout.on('data',(chunk:Buffer)=>{
      if(instance!==this.instance)return;stdout+=chunk.toString('utf8');
      if(Buffer.byteLength(stdout)>2_000_000){this.failed(instance);return;}
      let end:number;while((end=stdout.indexOf('\n'))>=0){const line=stdout.slice(0,end);stdout=stdout.slice(end+1);if(!line.trim())continue;
        let raw:Record<string,unknown>;try{raw=JSON.parse(line);}catch{this.failed(instance);return;}
        if(!raw||typeof raw!=='object'){this.failed(instance);return;}
        if(raw.id===versionId){if(raw.version!==this.options.version){this.log('engine_version_mismatch');this.failed(instance);return;}versionReady=true;ready();continue;}
        if(raw.id===modelId){const models=raw.models;if(!Array.isArray(models)||models.length!==1||models[0]?.internalName!==this.options.model){this.log('engine_model_not_ready');this.failed(instance);return;}modelReady=true;ready();continue;}
        this.receive(raw);
      }
    });
    child.stderr.on('data',(chunk:Buffer)=>{
      stderr+=chunk.toString('utf8');if(stderr.length>32_000)stderr=stderr.slice(-32_000);
      let end:number;while((end=stderr.indexOf('\n'))>=0){const line=stderr.slice(0,end).slice(0,1000);stderr=stderr.slice(end+1);this.logs.push(line);if(this.logs.length>40)this.logs.shift();}
    });
    child.on('error',()=>this.failed(instance));child.on('exit',(code,signal)=>{this.log('engine_exit',{code,signal});this.failed(instance);});
    child.stdin.on('error',()=>this.failed(instance));
    this.startupTimer=setTimeout(()=>this.failed(instance),this.options.startupTimeoutMs);
    this.send({id:versionId,action:'query_version'});this.send({id:modelId,action:'query_models'});
  }
  private send(value:unknown){if(!this.child?.stdin.writable)return;this.child.stdin.write(`${JSON.stringify(value)}\n`);}
  private settle(job:Job,error?:unknown,value?:ReviewAnalysisResponse){
    if(job.settled)return;job.settled=true;clearTimeout(job.timer);job.signal?.removeEventListener('abort',job.abort);
    if(error)job.reject(error);else job.resolve(value!);
  }
  private failed(instance:number){
    if(instance!==this.instance)return;++this.instance;clearTimeout(this.startupTimer);
    const child=this.child;this.child=null;child?.kill('SIGKILL');
    if(this.active){clearTimeout(this.active.cleanup);this.settle(this.active,new ApiError('ENGINE_FAILED',503,'分析引擎重新启动中，请稍后手动重试。'));this.active=null;}
    for(const job of this.queue)this.settle(job,new ApiError('ENGINE_FAILED',503,'分析引擎重新启动中，请稍后手动重试。'));this.queue=[];
    if(this.stopping){this.status='stopping';return;}
    this.failures++;this.status='restarting';this.log('engine_restart',{attempt:this.failures});
    this.restartTimer=setTimeout(()=>this.launch(),Math.min(30_000,(this.options.restartDelayMs??1500)*2**Math.min(5,this.failures-1)));
  }
  analyze(prepared:PreparedAnalysis,signal?:AbortSignal):Promise<ReviewAnalysisResponse>{
    if(this.status!=='ready')return Promise.reject(new ApiError('NOT_READY',503,'引擎正在启动或恢复，请稍后手动重试。'));
    if(this.active&&this.queue.length>=this.options.maxQueue)return Promise.reject(new ApiError('BUSY',429,'分析服务正忙，请稍后再试。'));
    if(signal?.aborted)return Promise.reject(new ApiError('CANCELLED',499,'已取消本次分析。'));
    return new Promise((resolve,reject)=>{
      const job:Job={id:randomUUID(),prepared,started:0,resolve,reject,signal,settled:false,abort:()=>{},timer:undefined as never};
      job.abort=()=>this.cancel(job,new ApiError('CANCELLED',499,'已取消本次分析。'));
      job.timer=setTimeout(()=>this.cancel(job,new ApiError('TIMEOUT',504,'本次分析等待过久，已停止计算；可以稍后重试。')),this.options.timeoutMs);
      signal?.addEventListener('abort',job.abort,{once:true});this.queue.push(job);this.pump();
    });
  }
  private cancel(job:Job,error:ApiError){
    this.settle(job,error);
    if(this.active===job){
      // The terminate acknowledgement is NOT completion. Keep the slot until final response.
      this.send({id:`cancel-${job.id}`,action:'terminate',terminateId:job.id});
      job.cleanup=setTimeout(()=>this.failed(this.instance),this.options.cancelGraceMs??5000);
    }else this.queue=this.queue.filter(item=>item!==job);
  }
  private pump(){
    if(this.status!=='ready'||this.active||!this.queue.length)return;
    const job=this.queue.shift()!;if(job.settled){this.pump();return;}
    this.active=job;job.started=Date.now();this.send({...job.prepared.query,id:job.id});
  }
  private receive(raw:Record<string,unknown>){
    const job=this.active;if(!job||raw.id!==job.id)return;
    if(raw.warning){this.cancel(job,new ApiError('ENGINE_FAILED',502,'引擎不能按此局设置分析；原对局未改变。'));return;}
    if(raw.error){this.settle(job,new ApiError('ENGINE_FAILED',502,'引擎拒绝了此局分析；原对局未改变。'));clearTimeout(job.cleanup);this.active=null;this.pump();return;}
    if(raw.isDuringSearch!==false)return;
    clearTimeout(job.cleanup);
    if(!job.settled){try{this.settle(job,undefined,normalizeAnalysis(raw,job.prepared,job.id,Date.now()-job.started,this.options));}catch(error){this.settle(job,error);}}
    this.active=null;this.pump();
  }
  async stop(){
    this.stopping=true;this.status='stopping';clearTimeout(this.restartTimer);clearTimeout(this.startupTimer);
    if(this.active){clearTimeout(this.active.cleanup);this.settle(this.active,new ApiError('ENGINE_FAILED',503,'分析服务正在停止。'));this.active=null;}
    for(const job of this.queue)this.settle(job,new ApiError('ENGINE_FAILED',503,'分析服务正在停止。'));this.queue=[];
    const child=this.child;this.child=null;++this.instance;if(!child)return;
    await new Promise<void>(resolve=>{const timer=setTimeout(()=>{child.kill('SIGKILL');resolve();},3000);child.once('exit',()=>{clearTimeout(timer);resolve();});child.stdin.end();child.kill('SIGTERM');});
  }
}

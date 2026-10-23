import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import type {KataGoEngine} from './engine';
import {ApiError,prepareAnalysis} from './position';

export const MAX_BODY_BYTES=256_000;
export function createAnalysisServer(engine:KataGoEngine,origin:string,options:{ratePerMinute?:number;globalPerMinute?:number}={}){
  const rate=options.ratePerMinute??6,globalRate=options.globalPerMinute??18;
  const clients=new Map<string,{start:number;count:number}>();let global={start:Date.now(),count:0};
  function consume(req:IncomingMessage){
    const now=Date.now();if(now-global.start>=60_000)global={start:now,count:0};
    // Render appends its proxy information. This is best-effort IP limiting, never authentication.
    const forwarded=req.headers['x-forwarded-for'];const ip=typeof forwarded==='string'?forwarded.slice(-256).split(',').at(-1)!.trim():req.socket.remoteAddress??'unknown';
    let entry=clients.get(ip);if(!entry||now-entry.start>=60_000){entry={start:now,count:0};clients.delete(ip);clients.set(ip,entry);}
    while(clients.size>512)clients.delete(clients.keys().next().value!);
    if(entry.count>=rate||global.count>=globalRate)throw new ApiError('RATE_LIMITED',429,'请求较多，请约一分钟后再试。');
    entry.count++;global.count++;
  }
  return createServer({requestTimeout:15_000,headersTimeout:10_000,maxHeaderSize:8192},async(req,res)=>{
    req.on('error',()=>{});
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Vary','Origin');
    const send=(status:number,body:unknown)=>{if(res.destroyed||res.writableEnded)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(body));};
    try{
      const caller=req.headers.origin;
      if(caller&&caller!==origin)throw new ApiError('ORIGIN_DENIED',403,'此来源不允许调用分析接口。');
      if(caller===origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Expose-Headers','Retry-After');}
      const path=new URL(req.url??'/',`http://${req.headers.host??'localhost'}`).pathname;
      if(req.method==='OPTIONS'){
        if(path!=='/api/analyze')throw new ApiError('INVALID_REQUEST',404,'没有这个接口。');
        const method=req.headers['access-control-request-method'];const headers=req.headers['access-control-request-headers'];
        if(method!=='POST'||(headers&&String(headers).split(',').some(h=>h.trim().toLowerCase()!=='content-type')))throw new ApiError('INVALID_REQUEST',400,'不支持此预检设置。');
        res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Max-Age','600');res.writeHead(204);res.end();return;
      }
      if(req.method==='GET'&&(path==='/healthz'||path==='/readyz')){const health=engine.health();send(path==='/readyz'&&!health.ready?503:200,health);return;}
      if(req.method!=='POST'||path!=='/api/analyze')throw new ApiError('INVALID_REQUEST',404,'没有这个接口。');
      consume(req);
      if(!/^application\/json(?:;|$)/i.test(String(req.headers['content-type']??'')))throw new ApiError('INVALID_REQUEST',415,'请使用 JSON 请求。');
      const length=req.headers['content-length'];if(length&&(!/^\d+$/.test(length)||Number(length)>MAX_BODY_BYTES))throw new ApiError('BODY_TOO_LARGE',413,'棋局文件过大；当前分析仅接受 256 KB 以内的起点与着法。');
      if(!engine.health().ready)throw new ApiError('NOT_READY',503,'引擎正在启动或恢复，请稍后手动重试。');
      const controller=new AbortController();
      req.once('aborted',()=>controller.abort());res.once('close',()=>{if(!res.writableEnded)controller.abort();});
      const body=await readBody(req,MAX_BODY_BYTES,controller.signal);
      let input:unknown;try{input=JSON.parse(body);}catch{throw new ApiError('INVALID_REQUEST',400,'请求不是有效 JSON。');}
      const prepared=prepareAnalysis(input,engine.options.maxVisits);
      const result=await engine.analyze(prepared,controller.signal);send(200,result);
    }catch(error){
      const known=error instanceof ApiError?error:new ApiError('ENGINE_FAILED',500,'分析未完成，原对局未改变。');
      if(known.status===429)res.setHeader('Retry-After','60');if(known.code==='NOT_READY')res.setHeader('Retry-After','10');
      send(known.status,{error:{code:known.code,message:known.message,...(known.field?{field:known.field}:{})}});
    }
  });
}
function readBody(req:IncomingMessage,max:number,signal:AbortSignal):Promise<string>{return new Promise((resolve,reject)=>{
  let total=0;const chunks:Buffer[]=[];
  const clean=()=>{clearTimeout(timer);req.off('data',data);req.off('end',end);req.off('error',error);signal.removeEventListener('abort',aborted);};
  const fail=(reason:Error)=>{clean();req.resume();reject(reason);};
  const data=(chunk:Buffer)=>{total+=chunk.length;if(total>max){fail(new ApiError('BODY_TOO_LARGE',413,'请求体超过 256 KB。'));return;}chunks.push(chunk);};
  const end=()=>{clean();resolve(Buffer.concat(chunks).toString('utf8'));};
  const error=()=>fail(new ApiError('INVALID_REQUEST',400,'请求传输中断。'));
  const aborted=()=>fail(new ApiError('CANCELLED',499,'请求已取消。'));
  const timer=setTimeout(()=>fail(new ApiError('TIMEOUT',408,'上传棋局超时，请重试。')),10_000);
  req.on('data',data);req.once('end',end);req.once('error',error);signal.addEventListener('abort',aborted,{once:true});
});}

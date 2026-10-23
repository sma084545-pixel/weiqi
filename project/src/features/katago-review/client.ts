import type {Color,Size} from '../../core/content.generated';
import type {AnalysisErrorCode,AnalysisMove,ReviewAnalysisRequest,ReviewAnalysisResponse} from '../../core/analysis/contract';

export class AnalysisClientError extends Error {
  constructor(public readonly code:AnalysisErrorCode|'NETWORK'|'INVALID_RESPONSE',message:string){super(message);this.name='AnalysisClientError';}
}
const errorMessages:Partial<Record<AnalysisErrorCode,string>>={
  NOT_READY:'引擎仍在启动或重新加载，请稍后手动重试。',BUSY:'分析服务正在忙，请稍后重试。',RATE_LIMITED:'请求较频繁，请稍等再试。',
  TIMEOUT:'这次分析超时了。棋局仍然保留，可稍后重试。',ENGINE_FAILED:'分析引擎暂时不可用，基本对弈和复盘仍可使用。',
  RESULT_MISMATCH:'结果与当前局面不一致，已丢弃。请重新分析。',GAME_NOT_FINISHED:'本局尚未结束，结束后才能进行复盘分析。',
};
const object=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const finite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);
const count=(value:unknown):value is number=>finite(value)&&Number.isSafeInteger(value)&&value>=0;
const winrate=(value:unknown)=>finite(value)&&value>=0&&value<=1;
function isMove(value:unknown,size:Size):value is AnalysisMove {
  if(!object(value))return false;
  if(value.type==='pass')return true;
  return value.type==='place'&&object(value.at)&&count(value.at.row)&&count(value.at.col)&&value.at.row<size&&value.at.col<size;
}

/** Treat a remote response as untrusted; never render HTML or a mismatched position. */
export function validateAnalysisResponse(value:unknown,positionId:string,size:Size,toPlay:Color):ReviewAnalysisResponse {
  if(!object(value)||value.schemaVersion!==1||value.positionId!==positionId||value.perspective!=='B'||value.toPlay!==toPlay||
    typeof value.requestId!=='string'||!value.requestId||value.requestId.length>200||!winrate(value.blackWinrate)||!finite(value.blackScoreLead)||
    !count(value.visits)||!finite(value.elapsedMs)||value.elapsedMs<0||!object(value.engine)||value.engine.name!=='KataGo'||value.engine.backend!=='Eigen CPU'||
    typeof value.engine.version!=='string'||typeof value.engine.model!=='string'||!count(value.engine.maxVisits)||!Array.isArray(value.candidates)||value.candidates.length>20)
    throw new AnalysisClientError('INVALID_RESPONSE','分析结果格式不完整或与当前局面不一致，已丢弃。');
  const seen=new Set<string>();
  for(const candidate of value.candidates){
    if(!object(candidate)||!count(candidate.order)||!isMove(candidate.move,size)||!count(candidate.visits)||!winrate(candidate.blackWinrate)||
      !finite(candidate.blackScoreLead)||!Array.isArray(candidate.pv)||candidate.pv.length>256||!candidate.pv.every(move=>isMove(move,size)))
      throw new AnalysisClientError('INVALID_RESPONSE','候选变化格式异常，已丢弃。');
    const key=candidate.move.type==='pass'?'pass':`${candidate.move.at.row},${candidate.move.at.col}`;
    if(seen.has(key))throw new AnalysisClientError('INVALID_RESPONSE','分析结果包含重复候选，已丢弃。');seen.add(key);
  }
  return value as unknown as ReviewAnalysisResponse;
}

export async function requestReviewAnalysis(origin:string,request:ReviewAnalysisRequest,toPlay:Color,signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<ReviewAnalysisResponse> {
  const controller=new AbortController();
  let timedOut=false;
  const cancel=()=>controller.abort();
  signal.addEventListener('abort',cancel,{once:true});
  if(signal.aborted)controller.abort();
  const timeout=setTimeout(()=>{timedOut=true;controller.abort();},100_000);
  try{
    const response=await fetcher(`${origin}/api/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:controller.signal,credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
    const text=await response.text();
    if(text.length>1_000_000)throw new AnalysisClientError('INVALID_RESPONSE','分析响应过大，已停止读取。');
    let value:unknown;try{value=JSON.parse(text);}catch{throw new AnalysisClientError(response.ok?'INVALID_RESPONSE':'NETWORK',response.ok?'分析响应无法读取。':'服务暂时没有响应，可能正在从休眠中启动。请稍后手动重试。');}
    if(!response.ok){
      const code=object(value)&&object(value.error)&&typeof value.error.code==='string'?value.error.code as AnalysisErrorCode:'ENGINE_FAILED';
      throw new AnalysisClientError(code,errorMessages[code]??'本次分析未能完成。请检查网络后重试；棋局不会受到影响。');
    }
    if(signal.aborted)throw new DOMException('Aborted','AbortError');
    return validateAnalysisResponse(value,request.positionId,request.game.setup.size,toPlay);
  }catch(error){
    if(timedOut)throw new AnalysisClientError('TIMEOUT','等待分析超时。服务可能正在冷启动，请稍后手动重试。');
    if(signal.aborted)throw new DOMException('Aborted','AbortError');
    if(error instanceof AnalysisClientError)throw error;
    throw new AnalysisClientError('NETWORK','暂时无法连接分析服务。可稍后重试，基本对弈和复盘仍可使用。');
  }finally{clearTimeout(timeout);signal.removeEventListener('abort',cancel);}
}

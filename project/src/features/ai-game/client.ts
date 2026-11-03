import {EXTREME_MODEL,type AiMoveRequest,type AiMoveResponse} from '../../core/analysis/ai-contract';
import type {GameState} from '../../core/content.generated';
import {rulesEngine} from '../../core/rules';
import {AnalysisClientError} from '../katago-review/client';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const integer=(v:unknown)=>finite(v)&&Number.isSafeInteger(v)&&v>=0;
export function validateAiMoveResponse(value:unknown,request:AiMoveRequest,game:GameState):AiMoveResponse {
  const bad=():never=>{throw new AnalysisClientError('INVALID_RESPONSE','AI 返回的着法未通过本局校验，原棋局保持不变。');};
  if(!object(value)||value.schemaVersion!==1||value.positionId!==request.positionId||value.aiColor!==request.aiColor||value.difficulty!==request.difficulty||game.toPlay!==request.aiColor||game.phase!=='playing'||
    typeof value.requestId!=='string'||!value.requestId||value.requestId.length>200||!integer(value.visits)||!finite(value.elapsedMs)||value.elapsedMs<0||!object(value.engine)||value.engine.name!=='KataGo'||value.engine.backend!=='Eigen CPU'||typeof value.engine.version!=='string'||typeof value.engine.model!=='string'||!integer(value.engine.maxVisits)||!object(value.move))return bad();
  if(request.difficulty==='extreme'&&(value.engine.model!==EXTREME_MODEL.name||value.engine.version!==EXTREME_MODEL.engineVersion))return bad();
  const move=value.move;
  if(move.type==='place'){
    if(!object(move.at)||!integer(move.at.row)||!integer(move.at.col)||Number(move.at.row)>=game.size||Number(move.at.col)>=game.size)return bad();
    if(!rulesEngine.tryMove(game,{type:'place',color:game.toPlay,at:{row:Number(move.at.row),col:Number(move.at.col)}}).ok)return bad();
  }else if(move.type!=='pass'||!rulesEngine.applyPass(game,game.toPlay).ok)return bad();
  // No server-produced evaluations are accepted by the playing UI.
  return {schemaVersion:1,positionId:request.positionId,requestId:value.requestId,aiColor:request.aiColor,difficulty:request.difficulty,move:move as AiMoveResponse['move'],engine:value.engine as unknown as AiMoveResponse['engine'],visits:Number(value.visits),elapsedMs:value.elapsedMs};
}

const messages:Record<string,string>={
  MODEL_UNAVAILABLE:'当前服务未提供所选模型。棋局保持不变，不会自动降级为其他难度。',
  NOT_READY:'AI 服务仍在启动或恢复。棋局已保留，请稍后手动重试。',BUSY:'AI 服务正在忙。棋局保持不变，可稍后重试。',RATE_LIMITED:'当前请求较多，请约一分钟后再试。',
  TIMEOUT:'AI 本次思考超时，原棋局已保留。可以重试或暂停后导出。',ENGINE_FAILED:'AI 暂时未能落子。请重试；不会自动改用随机着法。',
  GAME_NOT_PLAYING:'本局已进入确认或结束阶段，AI 已停止落子。',NOT_AI_TURN:'轮次已改变，AI 着法没有应用。',RESULT_MISMATCH:'AI 结果已经过期，未改动棋局。',
};
export async function requestAiMove(origin:string,request:AiMoveRequest,game:GameState,signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<AiMoveResponse>{
  const controller=new AbortController();let timedOut=false;
  const cancel=()=>controller.abort();signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)controller.abort();
  const timer=setTimeout(()=>{timedOut=true;controller.abort();},100_000);
  try{
    const response=await fetcher(`${origin}/api/ai-move`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:controller.signal,credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
    if(response.status===404)throw new AnalysisClientError('ENGINE_FAILED','AI 服务正在更新，尚未提供对弈接口。可先使用双人对弈，或稍后重试。');
    const text=await response.text();if(text.length>1_000_000)throw new AnalysisClientError('INVALID_RESPONSE','AI 响应过大，已停止读取。');
    let value:unknown;try{value=JSON.parse(text);}catch{throw new AnalysisClientError('NETWORK','AI 服务暂时没有响应，可能正在从休眠中启动。请稍后手动重试。');}
    if(!response.ok){const code=object(value)&&object(value.error)&&typeof value.error.code==='string'?value.error.code:'ENGINE_FAILED';throw new AnalysisClientError(code as never,messages[code]??'AI 请求未能完成，原棋局保留。');}
    if(signal.aborted)throw new DOMException('Aborted','AbortError');
    return validateAiMoveResponse(value,request,game);
  }catch(error){
    if(timedOut)throw new AnalysisClientError('TIMEOUT',messages.TIMEOUT);
    if(signal.aborted)throw new DOMException('Aborted','AbortError');
    if(error instanceof AnalysisClientError)throw error;
    throw new AnalysisClientError('NETWORK','暂时无法连接 AI。棋局已保存在本机，可以稍后重试；新着法需要联网。');
  }finally{clearTimeout(timer);signal.removeEventListener('abort',cancel);}
}

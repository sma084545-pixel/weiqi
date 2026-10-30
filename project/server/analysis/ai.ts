import {randomInt} from 'node:crypto';
import {AI_DIFFICULTIES,isAiDifficulty,type AiMoveRequest,type AiMoveResponse} from '../../src/core/analysis/ai-contract';
import type {ReviewAnalysisResponse} from '../../src/core/analysis/contract';
import {ApiError,prepareAnalysis} from './position';

export function prepareAiMove(input:unknown,serverMaxVisits=64){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new ApiError('INVALID_REQUEST',400,'AI 请求格式不正确。');
  const d=input as Record<string,unknown>;
  if(Object.keys(d).some(k=>!['schemaVersion','positionId','game','aiColor','difficulty'].includes(k)))throw new ApiError('INVALID_REQUEST',400,'难度由服务端限定，不接受自定义引擎参数。');
  if(!isAiDifficulty(d.difficulty))throw new ApiError('INVALID_REQUEST',400,'请选择轻松、标准或挑战难度。','/difficulty');
  if(d.aiColor!=='B'&&d.aiColor!=='W')throw new ApiError('INVALID_REQUEST',400,'AI 执色不正确。','/aiColor');
  const req=d as unknown as AiMoveRequest;
  const events=req.game?.events;
  const visits=Math.max(1,Math.min(serverMaxVisits,AI_DIFFICULTIES[req.difficulty].visits));
  const prepared=prepareAnalysis({schemaVersion:req.schemaVersion,positionId:req.positionId,game:req.game,reviewIndex:Array.isArray(events)?events.length:-1},visits,'ai-move');
  if(prepared.state.toPlay!==req.aiColor)throw new ApiError('NOT_AI_TURN',409,'当前不是 AI 的轮次，原棋局保持不变。');
  return {request:req,prepared};
}

export function selectAiMove(analysis:ReviewAnalysisResponse,request:AiMoveRequest,random=()=>randomInt(1_000_000)/1_000_000):AiMoveResponse {
  if(analysis.positionId!==request.positionId||analysis.toPlay!==request.aiColor||!analysis.candidates.length)throw new ApiError('RESULT_MISMATCH',502,'AI 返回了其他局面的结果，已丢弃。');
  let chosen=analysis.candidates[0];
  if(request.difficulty==='relaxed'&&chosen.move.type!=='pass'){
    // Bounded variation among real searched candidates, not random board coordinates.
    const value=(n:number)=>request.aiColor==='B'?n:-n;
    const bestScore=value(chosen.blackScoreLead);
    const pool=analysis.candidates.filter(c=>c.move.type!=='pass'&&value(c.blackScoreLead)>=bestScore-2);
    const weights=pool.map(c=>Math.sqrt(Math.max(1,c.visits))),sum=weights.reduce((a,b)=>a+b,0);
    let at=Math.max(0,Math.min(.999999,random()))*sum;
    for(let i=0;i<pool.length;i++){at-=weights[i];if(at<=0){chosen=pool[i];break;}}
  }
  return {schemaVersion:1,positionId:request.positionId,requestId:analysis.requestId,aiColor:request.aiColor,difficulty:request.difficulty,move:chosen.move,engine:analysis.engine,visits:analysis.visits,elapsedMs:analysis.elapsedMs};
}

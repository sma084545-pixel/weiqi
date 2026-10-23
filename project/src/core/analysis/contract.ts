import type {Color,Coord,GameEvent,GameState,Position} from '../content.generated';

/** HTTP contract v1, separate from the immutable teaching content schema. */
export interface ReviewAnalysisRequest {
  schemaVersion:1;
  positionId:string;
  game:{setup:Position;komi:number;events:GameEvent[]};
  reviewIndex:number;
}
export type AnalysisMove={type:'place';at:Coord}|{type:'pass'};
export interface AnalysisCandidate {
  order:number;
  move:AnalysisMove;
  visits:number;
  blackWinrate:number;
  blackScoreLead:number;
  pv:AnalysisMove[];
}
export interface ReviewAnalysisResponse {
  schemaVersion:1;
  requestId:string;
  positionId:string;
  perspective:'B';
  toPlay:Color;
  blackWinrate:number;
  blackScoreLead:number;
  visits:number;
  elapsedMs:number;
  engine:{name:'KataGo';version:string;model:string;backend:'Eigen CPU';maxVisits:number};
  candidates:AnalysisCandidate[];
}
export type AnalysisErrorCode='INVALID_REQUEST'|'GAME_NOT_FINISHED'|'UNSUPPORTED_RULES'|'NOT_READY'|'BUSY'|'RATE_LIMITED'|'TIMEOUT'|'CANCELLED'|'ENGINE_FAILED'|'RESULT_MISMATCH'|'BODY_TOO_LARGE'|'ORIGIN_DENIED';
export interface AnalysisErrorBody {error:{code:AnalysisErrorCode;message:string;field?:string;requestId?:string};}
export interface AnalysisHealth {service:'go-club-katago';status:'starting'|'ready'|'restarting'|'failed'|'stopping';ready:boolean;active:number;queued:number;engineVersion:string;model:string;uptimeSeconds:number;engineStartupMs?:number|null;resources?:{cgroupMemoryLimitBytes:number|null;cgroupMemoryPeakBytes:number|null;cpuQuota:number|null};}

/** Send only setup and effective events, not local progress, names, feedback or snapshots. */
export function makeReviewRequest(game:GameState,reviewIndex:number,positionId:string):ReviewAnalysisRequest {
  if(game.phase!=='finished'||game.mode!=='full-game')throw Error('GAME_NOT_FINISHED');
  if(!Number.isInteger(reviewIndex)||reviewIndex<0||reviewIndex>game.moves.length)throw Error('INVALID_REVIEW_INDEX');
  return {schemaVersion:1,positionId,game:{setup:game.setup,komi:game.komi,events:game.moves},reviewIndex};
}

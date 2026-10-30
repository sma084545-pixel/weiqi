import type {Color,GameState} from '../content.generated';
import type {AnalysisMove,ReviewAnalysisRequest,ReviewAnalysisResponse} from './contract';

export const AI_DIFFICULTIES={
  relaxed:{label:'轻松',visits:8,description:'较少搜索，在引擎判断接近的合法候选中选择。'},
  standard:{label:'标准',visits:24,description:'中等搜索，采用引擎优先候选。'},
  challenge:{label:'挑战',visits:64,description:'本服务当前最高搜索预算，采用引擎优先候选。'},
} as const;
export type AiDifficulty=keyof typeof AI_DIFFICULTIES;
export const isAiDifficulty=(v:unknown):v is AiDifficulty=>typeof v==='string'&&Object.hasOwn(AI_DIFFICULTIES,v);
export interface AiMoveRequest {
  schemaVersion:1;positionId:string;game:ReviewAnalysisRequest['game'];aiColor:Color;difficulty:AiDifficulty;
}
/** During play the opponent returns only its move, never hints, PVs, scores or win rates. */
export interface AiMoveResponse {
  schemaVersion:1;positionId:string;requestId:string;aiColor:Color;difficulty:AiDifficulty;move:AnalysisMove;
  engine:ReviewAnalysisResponse['engine'];visits:number;elapsedMs:number;
}
export function makeAiMoveRequest(game:GameState,humanColor:Color,difficulty:AiDifficulty,positionId:string):AiMoveRequest {
  if(game.mode!=='full-game'||game.phase!=='playing')throw Error('GAME_NOT_PLAYING');
  if(game.toPlay===humanColor)throw Error('NOT_AI_TURN');
  if(!isAiDifficulty(difficulty))throw Error('INVALID_DIFFICULTY');
  return {schemaVersion:1,positionId,game:{setup:game.setup,komi:game.komi,events:game.moves},aiColor:game.toPlay,difficulty};
}

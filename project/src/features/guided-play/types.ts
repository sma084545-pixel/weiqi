import type {Color,Coord,GameState} from '../../core/content.generated';
import type {BoardMarker,GroupStatus} from '../../core/rules';
import type {FullGameMatch} from '../full-game/model';

export type GuidanceLevel=1|2|3;
export type LearningGoal='auto'|'liberties'|'connection'|'life'|'opening';
export type TeachingConcept='liberties'|'atari'|'capture'|'connection'|'escape'|'eyes'|'opening';
export type GuidedOpponent='local'|'katago';
export interface GuidedOptions {size:9|13;humanColor:Color;level:GuidanceLevel;goal:LearningGoal;opponent:GuidedOpponent}
export const DEFAULT_GUIDED_OPTIONS:GuidedOptions={size:9,humanColor:'B',level:2,goal:'auto',opponent:'local'};
export const LEVELS={1:{label:'全程引导',description:'危险时先问一句；落子仍由你决定。'},2:{label:'适度指导',description:'先独立思考，关键着后反馈；提示按需展开。'},3:{label:'复盘为主',description:'对局中只提醒一气危险，结束后一起回看。'}} as const;
export const GOALS={auto:'自动选择',liberties:'气与提子',connection:'连接与切断',life:'基础死活',opening:'基础布局'} as const;
export const CONCEPT_LABELS:Record<TeachingConcept,string>={liberties:'气',atari:'打吃',capture:'提子',connection:'连接',escape:'逃子',eyes:'眼与条件',opening:'角边发展'};
export const FOCUS:Record<LearningGoal,readonly TeachingConcept[]>={auto:['liberties','atari','connection'],liberties:['liberties','atari','capture'],connection:['connection','liberties','escape'],life:['liberties','eyes','escape'],opening:['opening','connection','liberties']};

export interface TeachingCandidate {at:Coord;reason:string;concept:TeachingConcept}
export interface TeachingAnalysis {
  source:'local-rules';positionKey:string;question:string;hint1:string;region:Coord[];
  candidates:TeachingCandidate[];recommended:TeachingCandidate|null;urgentGroups:GroupStatus[];
  concept:TeachingConcept;boundary:string;
}
/** Provider boundary: a future remote provider must return locally checked teaching facts. */
export interface PositionAnalyzer {
  analyzePosition(game:GameState,focus:readonly TeachingConcept[],signal:AbortSignal):Promise<TeachingAnalysis>;
}
export interface MoveObservation {
  index:number;actor:Color;kind:'good'|'consider'|'danger'|'ordinary';concept:TeachingConcept;
  title:string;text:string;question:string;points:Coord[];
  captured:number;connections:number;escapes:number;atariTargets:number;selfAtari:boolean;
}
export interface HintUse {path:string;index:number;level:1|2|3|4}
export interface GuidedSession {
  schemaVersion:1;id:string;revision:number;rulesetId:'GO-CLUB-AREA-1';kind:'GuidedPlaySession';
  options:GuidedOptions;match:FullGameMatch;hintUses:HintUse[];parentSessionId:string|null;
}
export type GuidedPhase='USER_THINKING'|'USER_REQUESTED_HINT'|'USER_MOVE_FEEDBACK'|'AI_THINKING'|'AI_MOVE_EXPLANATION'|'HISTORY'|'SCORING'|'GUIDED_PLAY_SUMMARY';
export interface GuidedSummary {
  humanMoves:number;capturingMoves:number;capturedStones:number;connections:number;escapes:number;atariMoves:number;
  selfAtariMoves:number;hintRequests:number;improvement:string;
  concepts:{concept:TeachingConcept;count:number}[];moments:MoveObservation[];
}
export interface TeachingOverlayView {markers:BoardMarker[];caption:string}

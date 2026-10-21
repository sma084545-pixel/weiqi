/** Shared API 0.7.0; serialized content remains schemaVersion 1. */
import type {Color,Coord,Size,StoneValue,Position,Move,GameState,ScoreAgreement,AreaScore,Marker} from '../content.generated';
export type BoardMatrix=readonly (readonly StoneValue[])[];
export type RuleErrorCode='NOT_YOUR_TURN'|'OUT_OF_BOUNDS'|'OCCUPIED'|'SUICIDE'|'SUPERKO'|'GAME_NOT_PLAYING'|'NOT_SCORING'|'NOTHING_TO_UNDO'|'NOTHING_TO_REDO'|'INVALID_SETUP'|'HISTORY_REQUIRED'|'IMPORT_MISMATCH'|'AGREEMENT_REQUIRED'|'INVALID_SCORING_MARKS'|'KOMI_LOCKED'|'WRONG_MODE'|'STALE_TRIAL'|'INVALID_BOARD'|'INVALID_ARGUMENT'|'EXPORT_TOO_LARGE';
export type RuleError={code:RuleErrorCode;at?:Coord;field?:string};
export type Result<T>={ok:true;value:T}|{ok:false;error:RuleError};
export type Group={color:Color;stones:Coord[]};
export type GroupStatus=Group & {liberties:Coord[];isAtari:boolean};
export type TransitionEvent={before:BoardMatrix;after:BoardMatrix;placed:Coord|null;captured:Coord[];libertiesBefore:Coord[];libertiesAfter:Coord[];groupsBefore?:GroupStatus[];groupsAfter?:GroupStatus[]};
export type Trial={nextState:GameState;event:TransitionEvent};
export type ScoreRequest={board:BoardMatrix;komi:number;agreement:ScoreAgreement;basis:'confirmed'|'teaching-assumption'|'preview';assumptions:string[];confirmation?:GameState};
export type SetupValidation={position:Position;rootLayout:string;warnings:('UNKNOWN_PAST_HISTORY')[]};
export interface RulesEngine {
  getAtariGroups(board:BoardMatrix):Result<GroupStatus[]>;
  getGroup(board:BoardMatrix,at:Coord):Result<Group|null>;
  getLiberties(board:BoardMatrix,at:Coord):Result<Coord[]>;
  tryMove(state:GameState,move:Extract<Move,{type:'place'}>):Result<Trial>;
  applyPass(state:GameState,color:Color):Result<Trial>;
  resign(state:GameState,color:Color):Result<Trial>;
  undo(state:GameState):Result<GameState>;
  redo(state:GameState):Result<GameState>;
  validateSetup(position:Position):Result<SetupValidation>;
  startGame(position:Position,options:{mode:'full-game'|'capture-first';komi:number;gameId:string}):Result<GameState>;
  resumePlay(state:GameState,requestedBy:Color):Result<GameState>;
  confirmScore(state:GameState,agreement:ScoreAgreement):Result<GameState>;
  scoreArea(request:ScoreRequest):Result<AreaScore>;
  restoreGame(serialized:unknown):Result<GameState>;
  serializeGame(state:GameState):Result<string>;
  setKomi(state:GameState,komi:number):Result<GameState>;
}
export type BoardMode='readonly'|'select'|'play'|'mark';
export type BoardDisplayMode='standard'|'projector';
export type BoardMarkerKind='ownership'|'candidate'|'liberty'|'group'|'target'|'last-move'|'sequence';
export type BoardMarker={markerId:string;kind:BoardMarkerKind;at:Coord;label?:string;number?:number;owner?:Color|'neutral'};
export type BoardProps={
  size:Size;board:BoardMatrix;label:string;
  mode?:BoardMode;disabled?:boolean;
  selected:Coord|null;onSelect:(at:Coord)=>void;onPlay?:(at:Coord)=>void;
  focusPoint?:Coord|null;onFocusChange?:(at:Coord)=>void;
  markers?:readonly BoardMarker[];unavailablePoints?:readonly Coord[];
  showCoordinates?:boolean;displayMode?:BoardDisplayMode;zoom?:number;resetViewKey?:number;
};
/** Content markers are normalized into per-point BoardMarker view models by feature controllers. */
export type FutureBoardAnnotations={markers:Marker[];lastMove:Coord|null};

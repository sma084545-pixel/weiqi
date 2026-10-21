/* Generated from schemas/content.schema.json. Run pnpm schema:types. */

export type ContentDocument =
  | Position
  | MoveDocument
  | GameState
  | MarkerDocument
  | SetupDocument
  | Lesson
  | Puzzle
  | TerminalFixture
  | Feedback
  | ContentBundle;
export type Position = {
  schemaVersion: 1;
  id: string;
  revision: number;
  rulesetId: "GO-CLUB-AREA-1";
  kind: "Position";
  size: Size;
  /**
   * @maxItems 361
   */
  stones: Stone[];
  toPlay: Color;
  historyPolicy: "fresh-setup" | "recorded";
  history: History | null;
};
export type Size = 5 | 9 | 13 | 19;
export type Color = "B" | "W";
export type Move =
  | {
      type: "place";
      color: Color;
      at: Coord;
    }
  | {
      type: "pass";
      color: Color;
    }
  | {
      type: "resign";
      color: Color;
    };
export type StoneValue = "B" | "W" | null;
/**
 * @minItems 5
 * @maxItems 19
 */
export type Board = StoneValue[][];
export type GameEvent =
  | Move
  | {
      type: "resume";
      requestedBy: Color;
    }
  | {
      type: "confirm-score";
      agreement: ScoreAgreement;
    };
export type GameResult =
  | {
      reason: "resign" | "first-capture";
      winner: Color;
    }
  | {
      reason: "two-passes";
      winner: null;
    }
  | {
      reason: "area";
      score: AreaScore;
    };
export type SetupOperation =
  | {
      type: "setup-set";
      at: Coord;
      color: Color;
    }
  | {
      type: "setup-erase";
      at: Coord;
    };
export type Answer =
  | {
      type: "point-set";
      points: Coord[];
      explanation: string;
    }
  | {
      type: "number";
      value: number;
      explanation: string;
    }
  | {
      type: "region-labels";
      labels: Ownership[];
      explanation: string;
    }
  | {
      type: "reason-choice";
      /**
       * @minItems 2
       */
      options: {
        optionId: string;
        text: string;
      }[];
      /**
       * @minItems 1
       */
      acceptedOptionIds: string[];
      explanation: string;
    }
  | {
      type: "open-text";
      /**
       * @minItems 1
       */
      criteria: string[];
      sampleConsiderations: string[];
      automaticVerdict: false;
    }
  | {
      type: "move-tree";
      rootNodeId: string;
      /**
       * @minItems 1
       */
      nodes: TreeNode[];
      uncoveredPolicy: "unknown";
      uniquenessClaim: boolean;
      uniquenessEvidence: string[];
    };
export type TerminalStatus = "verified-alive" | "verified-dead" | "unsettled" | "unknown";
export type Response =
  | {
      type: "point-set";
      points: Coord[];
    }
  | {
      type: "number";
      value: number;
    }
  | {
      type: "region-labels";
      labels: Ownership[];
    }
  | {
      type: "reason-choice";
      optionIds: string[];
    }
  | {
      type: "open-text";
      text: string;
    }
  | {
      type: "move";
      move: Move;
    };

export interface Stone {
  row: number;
  col: number;
  color: Color;
}
export interface History {
  /**
   * @minItems 1
   */
  layouts: string[];
}
export interface MoveDocument {
  schemaVersion: 1;
  id: string;
  revision: number;
  rulesetId: "GO-CLUB-AREA-1";
  kind: "Move";
  size: Size;
  move: Move;
}
export interface Coord {
  row: number;
  col: number;
}
export interface GameState {
  schemaVersion: 1;
  id: string;
  revision: number;
  rulesetId: "GO-CLUB-AREA-1";
  kind: "GameState";
  size: Size;
  board: Board;
  toPlay: Color;
  history: History;
  moves: GameEvent[];
  captures: {
    B: number;
    W: number;
  };
  consecutivePasses: number;
  phase: "playing" | "scoring" | "finished";
  komi: number;
  lastMove: Move | null;
  agreement: ScoreAgreement | null;
  result: GameResult | null;
  setup: Position;
  mode: "full-game" | "capture-first";
  undoStack: GameSnapshot[];
  redoStack: GameSnapshot[];
}
export interface ScoreAgreement {
  deadStones: Coord[];
  neutralPoints: Coord[];
  confirmedBy: Color[];
}
export interface AreaScore {
  blackStones: number;
  whiteStones: number;
  blackTerritory: Coord[];
  whiteTerritory: Coord[];
  neutralPoints: Coord[];
  komi: number;
  blackTotal: number;
  whiteTotal: number;
  difference: number;
  winner: "B" | "W" | "draw";
  basis: "confirmed" | "teaching-assumption" | "preview";
}
export interface GameSnapshot {
  size: Size;
  board: Board;
  toPlay: Color;
  history: History;
  moves: GameEvent[];
  captures: {
    B: number;
    W: number;
  };
  consecutivePasses: number;
  phase: "playing" | "scoring" | "finished";
  komi: number;
  lastMove: Move | null;
  agreement: ScoreAgreement | null;
  result: GameResult | null;
}
export interface MarkerDocument {
  schemaVersion: 1;
  id: string;
  revision: number;
  rulesetId: "GO-CLUB-AREA-1";
  kind: "Marker";
  size: Size;
  marker: Marker;
}
export interface Marker {
  markerId: string;
  type: "target" | "liberty" | "last-move" | "sequence" | "annotation" | "ownership";
  /**
   * @minItems 1
   */
  points: Coord[];
  label: string;
  owner: ("B" | "W" | "neutral") | null;
}
export interface SetupDocument {
  schemaVersion: 1;
  id: string;
  revision: number;
  rulesetId: "GO-CLUB-AREA-1";
  kind: "Setup";
  size: Size;
  operations: SetupOperation[];
}
export interface Lesson {
  schemaVersion: 1;
  id: string;
  revision: number;
  rulesetId: "GO-CLUB-AREA-1";
  kind: "Lesson";
  developmentOnly: boolean;
  stage: number;
  title: string;
  /**
   * @minItems 1
   */
  objectives: string[];
  prerequisites: string[];
  activity: string;
  readinessObservations: string[];
  beginnerRoute: string;
  experiencedRoute: string;
  contentRefs: ContentRef[];
  sources: Source[];
  validation: Validation;
}
export interface ContentRef {
  id: string;
  revision: number;
}
export interface Source {
  type: "original" | "adapted" | "reference";
  title: string;
  url: string | null;
  accessedAt: string | null;
  note: string;
}
export interface Validation {
  structure: Check | null;
  moveLegality: Check | null;
  solutionChecked: Check | null;
  externalReferenceChecked: Check | null;
  modelChecked: Check | null;
  humanReviewed: HumanReview | null;
}
export interface Check {
  status: "passed" | "failed" | "partial" | "not-applicable";
  method: string;
  checkedAt: string;
  /**
   * @minItems 1
   */
  evidence: string[];
}
export interface HumanReview {
  reviewer: string;
  reviewerRole: "human";
  checkedAt: string;
  scope: string;
  /**
   * @minItems 1
   */
  evidence: string[];
}
export interface Puzzle {
  schemaVersion: 1;
  id: string;
  revision: number;
  rulesetId: "GO-CLUB-AREA-1";
  kind: "Puzzle";
  developmentOnly: boolean;
  category: "LIB" | "CAP" | "CON" | "LIFE" | "AREA" | "DISC";
  difficulty: {
    level: "beginner" | "elementary" | "optional-challenge";
    rationale: string;
  };
  prompt: string;
  initialPosition: Position;
  targetMarkers: Marker[];
  firstPlayer: Color;
  conditions: Conditions;
  /**
   * @minItems 3
   * @maxItems 3
   */
  hints: string[];
  answer: Answer;
  coveredBranches: string[][];
  /**
   * @minItems 1
   */
  sources: Source[];
  validation: Validation;
  relatedContent: ContentRef[];
}
export interface Conditions {
  boundary: "full-board";
  external: string;
  assumptions: string[];
  viewport: Viewport | null;
}
export interface Viewport {
  rowStart: number;
  colStart: number;
  rowEnd: number;
  colEnd: number;
}
export interface Ownership {
  at: Coord;
  owner: "B" | "W" | "neutral" | "unknown";
}
export interface TreeNode {
  nodeId: string;
  move: Move | null;
  children: string[];
  outcome: "continue" | "success" | "failure" | "unknown";
  terminalStatus: TerminalStatus | null;
  evidence: string[];
  explanation: string;
}
export interface TerminalFixture {
  schemaVersion: 1;
  id: string;
  revision: number;
  rulesetId: "GO-CLUB-AREA-1";
  kind: "TerminalFixture";
  developmentOnly: boolean;
  title: string;
  position: Position;
  status: "confirmed" | "teaching-assumption" | "unsettled";
  assumptions: string[];
  agreement: ScoreAgreement;
  komi: number;
  captureCountsForComparison: {
    B: number;
    W: number;
  };
  expectedScore: AreaScore | null;
  /**
   * @minItems 1
   */
  sources: Source[];
  validation: Validation;
}
export interface Feedback {
  schemaVersion: 1;
  id: string;
  revision: number;
  rulesetId: "GO-CLUB-AREA-1";
  kind: "Feedback";
  developmentOnly: boolean;
  activityRef: ContentRef | null;
  recordedAt: string | null;
  difficulty: ("too-easy" | "comfortable" | "too-hard") | null;
  preferredActivities: string[];
  comment: string;
  consentToUse: boolean;
  evidenceType: "blank-template" | "participant-submission";
  responseContext: {
    size: Size;
    contentRef: ContentRef | null;
  } | null;
  response: Response | null;
}
export interface ContentBundle {
  schemaVersion: 1;
  id: string;
  revision: number;
  rulesetId: "GO-CLUB-AREA-1";
  kind: "ContentBundle";
  developmentOnly: boolean;
  title: string;
  /**
   * @minItems 1
   */
  items: (
    Position | MoveDocument | GameState | MarkerDocument | SetupDocument | Lesson | Puzzle | TerminalFixture | Feedback
  )[];
}

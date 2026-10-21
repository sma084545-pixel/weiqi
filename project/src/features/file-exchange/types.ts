import type {ContentDocument,GameState,Position,Size} from '../../core/content.generated';

export const DEFAULT_IMPORT_LIMITS={maxBytes:2_000_000,maxItems:100,maxDepth:32,maxSgfNodes:5_000,maxSgfGames:10} as const;
export type ImportLimits={maxBytes:number;maxItems:number;maxDepth:number;maxSgfNodes:number;maxSgfGames:number};
export type ImportIssue={code:string;path:string;message:string;blocking:boolean};
export type ConflictChoice='skip'|'replace'|'keep-copy';
export type ConflictKind='official'|'local';

export interface ImportCandidate {document:ContentDocument;path:string}
export interface ImportConflict {
  key:string;id:string;revision:number;kind:ConflictKind;
  message:string;allowed:ConflictChoice[];
}
export interface JsonImportPreview {
  ok:boolean;filename:string;byteLength:number;rootKind:string|null;
  candidates:ImportCandidate[];counts:Record<string,number>;
  conflicts:ImportConflict[];issues:ImportIssue[];warnings:string[];
}

export interface SgfProperty {id:string;values:string[]}
export interface SgfNode {
  nodeId:string;properties:SgfProperty[];children:SgfNode[];
  move:null|{type:'place'|'pass';color:'B'|'W';at?:{row:number;col:number}};
  comment:string;
}
export interface SgfGameTree {root:SgfNode;sourceIndex:number}
export interface SgfImportPreview {
  ok:boolean;filename:string;raw:string;byteLength:number;games:SgfGameTree[];
  selectedGame:number;size:Size|null;komi:number;position:Position|null;
  sourceRules:string|null;ruleDisposition:'matching'|'unknown'|'conflict';
  nodeCount:number;branchCount:number;issues:ImportIssue[];warnings:string[];
}
export interface SgfLine {lineId:string;nodeIds:string[];label:string;moveCount:number}
export interface SgfMaterialized {game:GameState;line:SgfLine;omittedBranchCount:number}

export interface StoredSgf {
  id:string;revision:number;filename:string;raw:string;size:Size;
  sourceRules:string|null;importedAt:string;selectedLineId:string;
}
export interface ExchangeLibrary {
  schemaVersion:1;id:'LOCAL-T15-EXCHANGE';revision:number;
  rulesetId:'GO-CLUB-AREA-1';kind:'ExchangeLibrary';
  documents:ContentDocument[];sgfs:StoredSgf[];
}

export type DiagramPreset='question'|'answer';
export type DiagramFormat='svg'|'png'|'pdf';
export interface CropRect {rowStart:number;colStart:number;rowEnd:number;colEnd:number}
export interface DiagramOptions {
  preset:DiagramPreset;showCoordinates:boolean;showTarget:boolean;showLastMove:boolean;
  showSequence:boolean;crop:CropRect|null;printWidthMm:number;
}
export interface DiagramSource {
  id:string;revision:number;position:Position;title:string;
  targetPoints:{row:number;col:number}[];lastMove:{row:number;col:number}|null;
  sequence:{row:number;col:number;number:number}[];
  answerPoints:{row:number;col:number;label?:string}[];answerText:string|null;
}
export interface ExportFile {filename:string;mime:string;bytes:Uint8Array}
export interface BatchManifest {
  schemaVersion:1;id:'T15-EXPORT-MANIFEST';revision:1;rulesetId:'GO-CLUB-AREA-1';
  kind:'DiagramExportManifest';preset:DiagramPreset;format:DiagramFormat;
  files:{filename:string;contentId:string;contentRevision:number;sha256?:string}[];
}

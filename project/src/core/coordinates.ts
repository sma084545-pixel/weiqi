import {COLUMNS, BOARD_SIZES} from './constants';
import type {Coord, Size, StoneValue, Position} from './content.generated';
export function assertSize(size: number): asserts size is Size {
  if (!(BOARD_SIZES as readonly number[]).includes(size)) throw new RangeError('棋盘须为 5、9、13 或 19 路');
}
export function inBounds(at: Coord, size: number): boolean {
  return Number.isInteger(at.row) && Number.isInteger(at.col) && at.row>=0 && at.col>=0 && at.row<size && at.col<size;
}
export function displayCoord(at: Coord, size: Size): string {
  if(!inBounds(at,size)) throw new RangeError('坐标超出棋盘');
  return `${COLUMNS[at.col]}${size-at.row}`;
}
export function parseCoord(label: string, size: Size): Coord | null {
  const match=/^([A-HJ-T])([1-9]|1[0-9])$/.exec(label.toUpperCase());
  if(!match) return null;
  const at={row:size-Number(match[2]),col:COLUMNS.indexOf(match[1])};
  return inBounds(at,size)?at:null;
}
export function boardFromPosition(position: Position): StoneValue[][] {
  const board: StoneValue[][] = Array.from({length:position.size},()=>Array(position.size).fill(null));
  for(const stone of position.stones) board[stone.row][stone.col]=stone.color;
  return board;
}
// Lossless encoding, deliberately excludes toPlay and counters.
export function layoutKey(board: readonly (readonly StoneValue[])[]): string {
  assertSize(board.length);
  if(board.some(row=>row.length!==board.length || row.some(v=>v!==null && v!=='B' && v!=='W'))) throw new TypeError('棋盘矩阵格式错误');
  return `${board.length}|${board.flat().map(v=>v??'.').join('')}`;
}

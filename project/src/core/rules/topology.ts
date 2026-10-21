import type {Coord} from '../content.generated';
import type {BoardMatrix} from './contract';
import {attempt,checkBoard,checkAt,groupAt,allGroups} from './internal';
export function getGroup(board:BoardMatrix,at:Coord){return attempt(()=>{checkBoard(board);checkAt(at,board.length);const g=groupAt(board,at);return g?{color:g.color,stones:g.stones}:null;});}
export function getLiberties(board:BoardMatrix,at:Coord){return attempt(()=>{checkBoard(board);checkAt(at,board.length);return groupAt(board,at)?.liberties??[];});}
export function getAtariGroups(board:BoardMatrix){return attempt(()=>{checkBoard(board);return allGroups(board).filter(g=>g.isAtari);});}

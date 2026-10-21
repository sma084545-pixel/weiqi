import type {AreaScore,Coord,ScoreAgreement} from '../content.generated';
import type {ScoreRequest} from './contract';
import {checkBoard,checkAt,fail,groupAt,neighbors,pointKey,sorted} from './internal';
export function checkedAgreement(board:ScoreRequest['board'],input:ScoreAgreement):ScoreAgreement {
 if(!input||!Array.isArray(input.deadStones)||!Array.isArray(input.neutralPoints)||!Array.isArray(input.confirmedBy))fail('INVALID_SCORING_MARKS','/agreement');
 for(const name of ['deadStones','neutralPoints'] as const){const seen=new Set<string>();for(const p of input[name]){
  try{checkAt(p,board.length);}catch{fail('INVALID_SCORING_MARKS',`/agreement/${name}`);}
  if(seen.has(pointKey(p)))fail('INVALID_SCORING_MARKS',`/agreement/${name}`);seen.add(pointKey(p));
 }}
 if(input.confirmedBy.some(c=>c!=='B'&&c!=='W')||new Set(input.confirmedBy).size!==input.confirmedBy.length)fail('INVALID_SCORING_MARKS','/agreement/confirmedBy');
 return {deadStones:sorted(input.deadStones),neutralPoints:sorted(input.neutralPoints),confirmedBy:[...input.confirmedBy].sort()};
}
/** Internal arithmetic. Finality is established by engine.scoreArea/confirmScore, never here. */
export function computeArea(request:ScoreRequest,basis:AreaScore['basis']):AreaScore {
 checkBoard(request.board);if(!Number.isFinite(request.komi))fail('INVALID_ARGUMENT','/komi');
 const agreement=checkedAgreement(request.board,request.agreement);
 const dead=new Set(agreement.deadStones.map(pointKey));
 for(const p of agreement.deadStones){const g=groupAt(request.board,p);if(!g||g.stones.some(q=>!dead.has(pointKey(q))))fail('INVALID_SCORING_MARKS','/agreement/deadStones');}
 const board=request.board.map(row=>[...row]);for(const p of agreement.deadStones)board[p.row][p.col]=null;
 let blackStones=0,whiteStones=0;const blackTerritory:Coord[]=[],whiteTerritory:Coord[]=[],neutralPoints:Coord[]=[],seen=new Set<string>();
 for(let row=0;row<board.length;row++)for(let col=0;col<board.length;col++){
  const v=board[row][col];if(v==='B'){blackStones++;continue;}if(v==='W'){whiteStones++;continue;}
  const p={row,col};if(seen.has(pointKey(p)))continue;
  const region=[p],boundary=new Set<string>();seen.add(pointKey(p));
  for(let i=0;i<region.length;i++)for(const q of neighbors(region[i],board.length)){
   const c=board[q.row][q.col];if(c!==null)boundary.add(c);else if(!seen.has(pointKey(q))){seen.add(pointKey(q));region.push(q);}
  }
  (boundary.size===1?(boundary.has('B')?blackTerritory:whiteTerritory):neutralPoints).push(...region);
 }
 const neutral=new Set(neutralPoints.map(pointKey));
 if(agreement.neutralPoints.some(p=>!neutral.has(pointKey(p))))fail('INVALID_SCORING_MARKS','/agreement/neutralPoints');
 if(basis==='confirmed'&&agreement.neutralPoints.length!==neutral.size)fail('AGREEMENT_REQUIRED','/agreement/neutralPoints');
 const blackTotal=blackStones+blackTerritory.length,whiteTotal=whiteStones+whiteTerritory.length+request.komi;
 const difference=blackTotal-whiteTotal;
 if(!Number.isFinite(whiteTotal)||!Number.isFinite(difference))fail('INVALID_ARGUMENT','/komi');
 return {blackStones,whiteStones,blackTerritory:sorted(blackTerritory),whiteTerritory:sorted(whiteTerritory),neutralPoints:sorted(neutralPoints),komi:request.komi,blackTotal,whiteTotal,difference,winner:difference>0?'B':difference<0?'W':'draw',basis};
}

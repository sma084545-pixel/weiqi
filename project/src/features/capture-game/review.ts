import type {Color,Coord,GameEvent,GameState,Size,StoneValue} from '../../core/content.generated';
import {displayCoord} from '../../core/coordinates';
import {rulesEngine,type BoardMarker,type BoardMatrix,type TransitionEvent} from '../../core/rules';

export interface ReviewFrame {id:string;title:string;explanation:string;board:BoardMatrix;markers:BoardMarker[];event:GameEvent}
const snapshotAfter=(game:GameState,index:number):readonly (readonly StoneValue[])[]=>index+1<game.undoStack.length?game.undoStack[index+1].board:game.board;

export function createMoveReview(game:GameState,limit=5):ReviewFrame[]{
  const start=Math.max(0,game.moves.length-limit);
  return game.moves.slice(start).map((event,offset)=>{
    const index=start+offset,number=index+1,board=snapshotAfter(game,index);
    if(event.type==='place')return {id:`move-${number}`,title:`第 ${number} 手 · ${event.color==='B'?'黑方':'白方'} ${displayCoord(event.at,game.size)}`,explanation:'这是规则引擎保存的该手之后盘面；回看不会修改真实对局。',board,markers:[{markerId:`review-last-${number}`,kind:'last-move',at:event.at,label:`第 ${number} 手`}],event};
    if(event.type==='pass')return {id:`move-${number}`,title:`第 ${number} 手 · ${event.color==='B'?'黑方':'白方'}停一手`,explanation:'停一手不改变棋盘，也不进入位置重复检查。',board,markers:[],event};
    return {id:`move-${number}`,title:`第 ${number} 手 · 对局操作`,explanation:'这是规则历史中的管理操作。',board,markers:[],event};
  });
}

const pointKey=(at:Coord)=>`${at.row},${at.col}`;
export function libertyMarkers(board:BoardMatrix):BoardMarker[]{
  const groups=new Set<string>(),points=new Map<string,Coord>();
  for(let row=0;row<board.length;row++)for(let col=0;col<board.length;col++)if(board[row][col]){
    const group=rulesEngine.getGroup(board,{row,col});if(!group.ok||!group.value)continue;
    const key=group.value.stones.map(pointKey).join('|');if(groups.has(key))continue;groups.add(key);
    const liberties=rulesEngine.getLiberties(board,{row,col});if(liberties.ok)for(const at of liberties.value)points.set(pointKey(at),at);
  }
  return [...points.values()].map((at,index)=>({markerId:`assist-liberty-${index}`,kind:'liberty',at,label:'辅助显示：棋块的气'}));
}

export function winningExplanation(event:TransitionEvent,winner:Color,size:Size):{text:string;markers:BoardMarker[]}{
  if(!event.placed||!event.captured.length)return {text:'本轮没有发生提子。',markers:[]};
  const capturedKeys=new Set(event.captured.map(pointKey));
  const groups=(event.groupsBefore??[]).filter(group=>group.color!==winner&&group.stones.some(at=>capturedKeys.has(pointKey(at))));
  const parts=groups.map(group=>`${group.color==='B'?'黑':'白'}棋块（${group.stones.map(at=>displayCoord(at,size)).join('、')}）在落子前只剩 ${group.liberties.length} 口气：${group.liberties.map(at=>displayCoord(at,size)).join('、')}`);
  return {text:`${parts.join('；')}。${winner==='B'?'黑方':'白方'}落在 ${displayCoord(event.placed,size)}，占住最后一口气，随后整块被移除。`,markers:[{markerId:'winning-move',kind:'last-move',at:event.placed,label:'获胜落子'},...event.captured.map((at,index)=>({markerId:`captured-${index}`,kind:'target' as const,at,label:'本手被提棋子原位置'}))]};
}

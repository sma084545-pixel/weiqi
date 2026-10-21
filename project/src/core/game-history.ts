import type {GameEvent,GameState} from './content.generated';
import {displayCoord} from './coordinates';
import type {BoardMarker,BoardMatrix} from './rules';

/** Read-only projection of the current effective path, never a reconstructed game. */
export interface GameHistoryFrame {
  index:number;
  title:string;
  description:string;
  board:BoardMatrix;
  markers:BoardMarker[];
  event:GameEvent|null;
  current:boolean;
  toPlay:GameState['toPlay'];
  phase:GameState['phase'];
  captures:Readonly<GameState['captures']>;
  consecutivePasses:number;
}

export function gameEventTitle(event:GameEvent,index:number,size:GameState['size']):string {
  const prefix=`第 ${index} 步 · `;
  if(event.type==='place')return `${prefix}${event.color==='B'?'黑方':'白方'}落子 ${displayCoord(event.at,size)}`;
  if(event.type==='pass')return `${prefix}${event.color==='B'?'黑方':'白方'}停一手`;
  if(event.type==='resign')return `${prefix}${event.color==='B'?'黑方':'白方'}认输`;
  if(event.type==='resume')return `${prefix}${event.requestedBy==='B'?'黑方':'白方'}提出争议并恢复对弈`;
  return `${prefix}双方确认最终计分`;
}

/** undoStack[k] is the exact snapshot after k accepted events. Redo is not this path. */
export function createGameHistory(game:GameState):GameHistoryFrame[] {
  return Array.from({length:game.moves.length+1},(_,index)=>{
    const snapshot=index===game.moves.length?game:game.undoStack[index];
    const event=index===0?null:game.moves[index-1];
    const title=event?gameEventTitle(event,index,game.size):'开局设置';
    const last=snapshot.lastMove;
    const stage=snapshot.phase==='playing'?`下一手：${snapshot.toPlay==='B'?'黑方':'白方'}`:snapshot.phase==='scoring'?'终局确认中':'已结束';
    return {index,title,event,current:index===game.moves.length,board:snapshot.board,
      toPlay:snapshot.toPlay,phase:snapshot.phase,captures:snapshot.captures,consecutivePasses:snapshot.consecutivePasses,
      markers:last?.type==='place'?[{markerId:`history-last-${index}`,kind:'last-move',at:last.at,label:'这一步的最后一手'}]:[],
      description:`${stage}；提子：黑 ${snapshot.captures.B} · 白 ${snapshot.captures.W}；连续停手 ${snapshot.consecutivePasses}。${index===0?'这是已验证的新起点，更早历史未知。':'这是保存的历史状态。'}`};
  });
}

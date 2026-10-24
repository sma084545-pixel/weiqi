import type {Coord,GameState,Position} from '../../core/content.generated';
import {applyPass,getAtariGroups,getLiberties,startGame,tryMove} from '../../core/rules';
import {restoreFullGame,type FullGameMatch} from '../full-game/model';
export const GUIDED_GAME_ID='LOCAL-ADVANCED-FULL-GAME-13';
export const emptyGuidedPosition=():Position=>({schemaVersion:1,id:'POS-ADVANCED-GUIDED-13',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size:13,stones:[],toPlay:'B',historyPolicy:'fresh-setup',history:null});
export function newGuidedGame(){const s=startGame(emptyGuidedPosition(),{mode:'full-game',komi:0,gameId:GUIDED_GAME_ID});if(!s.ok)return s;return restoreFullGame(s.value);}
const priorityCorners:Coord[]=[[3,3],[9,9],[3,9],[9,3],[3,6],[9,6],[6,3],[6,9],[6,6]].map(([row,col])=>({row,col}));
export function teachingBotMove(game:GameState){
 if(game.phase!=='playing'||game.toPlay!=='W')return {ok:false as const,message:'当前不该由白方教学机器人落子。'};
 if(game.consecutivePasses>0||game.moves.length>=100){const r=applyPass(game,'W');return r.ok?{ok:true as const,state:r.value.nextState,reason:game.consecutivePasses?'机器人跟随停手，请人工确认死子；这不是自动判断所有棋都活。':'本教学机器人达到100手练习预算，选择停手；你可继续下或共同确认。'}:{ok:false as const,message:'停手未能完成。'};}
 const atari=getAtariGroups(game.board),urgent=atari.ok?atari.value:[];
 const candidates=[...urgent.filter(g=>g.color==='B').flatMap(g=>g.liberties),...urgent.filter(g=>g.color==='W').flatMap(g=>g.liberties),...priorityCorners];
 const extras:Coord[]=[];for(let row=0;row<13;row++)for(let col=0;col<13;col++)if(game.board[row][col]===null)extras.push({row,col});
 // A small transparent rule partner, not a neural policy or a claimed human rank.
 const occupied=extras.length<169;
 extras.sort((a,b)=>{
  const nearest=(p:Coord)=>{let distance=20;for(let r=0;r<13;r++)for(let c=0;c<13;c++)if(game.board[r][c]==='W')distance=Math.min(distance,Math.abs(r-p.row)+Math.abs(c-p.col));return Math.abs(distance-2);};
  const cost=(p:Coord)=>Math.abs(Math.min(p.row,p.col,12-p.row,12-p.col)-3)+(occupied?nearest(p):0);
  return cost(a)-cost(b)||a.row-b.row||a.col-b.col;
 });
 const seen=new Set<string>();
 for(const at of [...candidates,...extras]){
  const key=`${at.row},${at.col}`;if(seen.has(key))continue;seen.add(key);
  const r=tryMove(game,{type:'place',color:'W',at});if(!r.ok)continue;
  const libs=getLiberties(r.value.nextState.board,at);if(!libs.ok||(!r.value.event.captured.length&&libs.value.length<2))continue;
  return {ok:true as const,state:r.value.nextState,reason:r.value.event.captured.length?'机器人先处理可提的棋。':urgent.some(g=>g.color==='W'&&g.liberties.some(p=>p.row===at.row&&p.col===at.col))?'机器人先照顾自己的一气棋。':'机器人选择角边发展或与自己的棋保持适度距离；这不是全盘最佳手证明。'};
 }
 const r=applyPass(game,'W');return r.ok?{ok:true as const,state:r.value.nextState,reason:'本地规则策略没有找到符合自身安全条件的着法，停一手；不代表任意棋块已经判活。'}:{ok:false as const,message:'机器人本手未能执行，请撤回或重试。'};
}
export interface TeachingPause {id:'opening'|'weak'|'tactic'|'direction';title:string;question:string;at:Coord|null;explanation:string}
export function teachingPause(game:GameState,seen:readonly string[]):TeachingPause|null {
 if(game.phase!=='playing'||game.toPlay!=='B')return null;
 if(game.moves.length===0&&!seen.includes('opening'))return {id:'opening',title:'开局 · 哪里值得先发展？',question:'先想一个角部落点，并用一句话说明理由。',at:{row:3,col:3},explanation:'空旷13路可先借角边发展；这不是强制落点。'};
 const atari=getAtariGroups(game.board);if(!atari.ok)return null;
 const weak=atari.value.find(g=>g.color==='B');
 if(weak&&!seen.includes('weak'))return {id:'weak',title:'出现弱棋 · 谁需要照顾？',question:'这块黑棋只剩一气。你想延长、反击，还是有理由弃子？',at:weak.stones[0],explanation:'一气是明确危险信号，仍需用合法着法核查能否救出。'};
 const tactical=atari.value.find(g=>g.color==='W'&&tryMove(game,{type:'place',color:'B',at:g.liberties[0]}).ok);
 if(tactical&&!seen.includes('tactic'))return {id:'tactic',title:'局部机会 · 找一手战术',question:'白目标只剩一气。提它是否符合你的计划？',at:tactical.stones[0],explanation:'程序只确认有合法提子机会，不把它自动称为整盘最佳手。'};
 if(game.moves.length>=12&&!atari.value.length&&!seen.includes('direction'))return {id:'direction',title:'暂时没有打吃 · 要继续局部吗？',question:'比较自己与对手的弱点，再决定继续回应还是转向开阔处。',at:null,explanation:'没有打吃不等于所有棋已活；先比较连接、眼位和逃路。'};
 return null;
}
export function botMatch(match:FullGameMatch){if(!match.game)return {ok:false as const,message:'请先开局。'};const r=teachingBotMove(match.game);if(!r.ok)return r;const restored=restoreFullGame(r.state);return restored.ok?{ok:true as const,match:restored.value,reason:r.reason}:{ok:false as const,message:'机器人结果未通过规则重放，已保留原盘面。'};}

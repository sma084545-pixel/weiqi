import type {GameEvent,GameState,GameSnapshot} from '../../src/core/content.generated';
import type {ReviewAnalysisRequest,ReviewAnalysisResponse,AnalysisMove,AnalysisCandidate} from '../../src/core/analysis/contract';
import {rulesEngine} from '../../src/core/rules';
import {evaluatePlacement} from '../../src/core/rules/placement';
import {displayCoord,parseCoord} from '../../src/core/coordinates';
import {validateContent} from '../../src/core/validation';

export class ApiError extends Error {
  constructor(public code:string,public status:number,message:string,public field?:string){super(message);}
}
function invalid(field:string,message='棋局格式不正确，请重新选择已结束的对局。'):never {throw new ApiError('INVALID_REQUEST',400,message,field);}
const object=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const keys=(value:Record<string,unknown>,allowed:string[],field:string)=>{if(Object.keys(value).some(k=>!allowed.includes(k)))invalid(field,'请求包含不支持的设置；引擎参数由服务端限定。');};
export const KATAGO_RULES=Object.freeze({ko:'POSITIONAL',scoring:'AREA',suicide:false,tax:'NONE',hasButton:false,whiteHandicapBonus:'0',friendlyPassOk:true});
export interface PreparedAnalysis {request:ReviewAnalysisRequest;state:GameState|GameSnapshot;query:Record<string,unknown>;turnNumber:number;}

export function prepareAnalysis(input:unknown,maxVisits=64):PreparedAnalysis {
  if(!object(input))invalid('/');keys(input,['schemaVersion','positionId','game','reviewIndex'],'/');
  if(input.schemaVersion!==1)invalid('/schemaVersion');
  if(typeof input.positionId!=='string'||!/^[A-Za-z0-9_.:-]{1,160}$/.test(input.positionId))invalid('/positionId');
  if(!object(input.game))invalid('/game');keys(input.game,['setup','komi','events'],'/game');
  const {setup,komi,events}=input.game;
  if(!object(setup)||setup.rulesetId!=='GO-CLUB-AREA-1')throw new ApiError('UNSUPPORTED_RULES',400,'此接口只接受本项目的统一教学规则。','/game/setup/rulesetId');
  if(typeof komi!=='number'||!Number.isFinite(komi)||Math.abs(komi)>100||!Number.isInteger(komi*2))invalid('/game/komi','当前分析支持 -100 至 100 的整数或半目贴目；不会改动原对局的贴目。');
  if(!Array.isArray(events)||events.length>1600)invalid('/game/events','当前分析最多接受 1600 项有效对局操作。');
  if(!Number.isInteger(input.reviewIndex)||Number(input.reviewIndex)<0||Number(input.reviewIndex)>events.length)invalid('/reviewIndex');
  const validated=rulesEngine.validateSetup(setup as never);if(!validated.ok)invalid(`/game/setup${validated.error.field??''}`,'起始摆子不合法，不能送入分析。');
  const start=rulesEngine.startGame(validated.value.position,{mode:'full-game',komi,gameId:'KATAGO-VERIFIED-REPLAY'});if(!start.ok)invalid('/game/setup');
  let current=start.value,selected:GameState|GameSnapshot=current;
  for(let index=0;index<events.length;index++) {
    const event=events[index];const path=`/game/events/${index}`;
    if(!object(event))invalid(path);
    let next:GameState;
    if(event.type==='place'||event.type==='pass'||event.type==='resign'){
      const shape=validateContent({schemaVersion:1,id:'API-MOVE',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Move',size:current.size,move:event});
      if(!shape.ok)invalid(`${path}${shape.issues[0].path}`);
      const move=event as unknown as Extract<GameEvent,{type:'place'|'pass'|'resign'}>;
      const result=move.type==='place'?rulesEngine.tryMove(current,move):move.type==='pass'?rulesEngine.applyPass(current,move.color):rulesEngine.resign(current,move.color);
      if(!result.ok)invalid(path,`对局重放失败（${result.error.code}），请检查这一步。`);next=result.value.nextState;
    }else if(event.type==='resume'){
      keys(event,['type','requestedBy'],path);
      const result=rulesEngine.resumePlay(current,event.requestedBy as never);if(!result.ok)invalid(path);next=result.value;
    }else if(event.type==='confirm-score'){
      keys(event,['type','agreement'],path);
      if(!object(event.agreement))invalid(`${path}/agreement`);keys(event.agreement,['deadStones','neutralPoints','confirmedBy'],`${path}/agreement`);
      const result=rulesEngine.confirmScore(current,event.agreement as never);if(!result.ok)invalid(path,'终局确认不能通过规则校验。');next=result.value;
    }else invalid(`${path}/type`);
    current=next;
    if(index+1===input.reviewIndex)selected=current;
  }
  if(current.phase!=='finished')throw new ApiError('GAME_NOT_FINISHED',409,'请先完成这一局，再在复盘中分析。');
  const req=input as unknown as ReviewAnalysisRequest;
  const moves=events.slice(0,req.reviewIndex).filter((e:GameEvent)=>e.type==='place'||e.type==='pass').map((e:GameEvent)=>[('color' in e)?e.color:'B',e.type==='place'?displayCoord(e.at,current.size):'pass']);
  const query={initialStones:validated.value.position.stones.map(s=>[s.color,displayCoord(s,current.size)]),initialPlayer:validated.value.position.toPlay,
    moves,rules:KATAGO_RULES,komi,boardXSize:current.size,boardYSize:current.size,analyzeTurns:[moves.length],maxVisits,
    overrideSettings:{maxTime:15},includeOwnership:false,includePolicy:false,analysisPVLen:12};
  return {request:req,state:selected,query,turnNumber:moves.length};
}

const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
function engineMove(value:unknown,size:GameState['size']):AnalysisMove|null {
  if(value==='pass')return {type:'pass'};
  if(typeof value!=='string')return null;const at=parseCoord(value,size);return at?{type:'place',at}:null;
}
/** Validate output and every displayed PV through the same placement kernel as the UI. */
export function normalizeAnalysis(raw:unknown,prepared:PreparedAnalysis,requestId:string,elapsedMs:number,engine:{version:string;model:string;maxVisits:number}):ReviewAnalysisResponse {
  const bad=():never=>{throw new ApiError('RESULT_MISMATCH',502,'引擎结果与复盘局面不匹配，请重试。');};
  if(!object(raw)||raw.id!==requestId||raw.turnNumber!==prepared.turnNumber||raw.isDuringSearch!==false||!object(raw.rootInfo)||!Array.isArray(raw.moveInfos))return bad();
  const root=raw.rootInfo;
  if(root.currentPlayer!==prepared.state.toPlay||!finite(root.winrate)||root.winrate<0||root.winrate>1||!finite(root.scoreLead)||!finite(root.visits)||root.visits<1)return bad();
  const candidates:AnalysisCandidate[]=[];
  for(const item of raw.moveInfos.slice(0,20)){
    if(!object(item)||!finite(item.winrate)||item.winrate<0||item.winrate>1||!finite(item.scoreLead)||!finite(item.visits)||item.visits<0)continue;
    const move=engineMove(item.move,prepared.state.size);if(!move)continue;
    if(move.type==='place'&&!evaluatePlacement(prepared.state,{...move,color:prepared.state.toPlay}).ok)continue;
    let context={board:prepared.state.board,toPlay:prepared.state.toPlay,history:prepared.state.history};
    const pv:AnalysisMove[]=[];
    if(Array.isArray(item.pv))for(const value of item.pv.slice(0,12)){
      const action=engineMove(value,prepared.state.size);if(!action)break;
      if(action.type==='place'){
        const trial=evaluatePlacement(context,{...action,color:context.toPlay});if(!trial.ok)break;
        context={board:trial.value.board,toPlay:context.toPlay==='B'?'W':'B',history:{layouts:[...context.history.layouts,trial.value.layout]}};
      }else context={...context,toPlay:context.toPlay==='B'?'W':'B'};
      pv.push(action);
    }
    if(!pv.length||JSON.stringify(pv[0])!==JSON.stringify(move))continue;
    candidates.push({order:candidates.length,move,visits:item.visits,blackWinrate:item.winrate,blackScoreLead:item.scoreLead,pv});
    if(candidates.length===5)break;
  }
  if(!candidates.length)return bad();
  return {schemaVersion:1,requestId,positionId:prepared.request.positionId,perspective:'B',toPlay:prepared.state.toPlay,blackWinrate:root.winrate,blackScoreLead:root.scoreLead,visits:root.visits,elapsedMs,
    engine:{name:'KataGo',version:engine.version,model:engine.model,backend:'Eigen CPU',maxVisits:engine.maxVisits},candidates};
}

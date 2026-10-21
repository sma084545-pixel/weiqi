import Ajv from 'ajv';
import schema from '../../schemas/content.schema.json';
import type {ContentDocument} from './content.generated';
import {boardFromPosition, layoutKey} from './coordinates';
export type ValidationIssue = {code:string;path:string;message:string};
export type ValidationResult = {ok:true;value:ContentDocument;level:'structural';needsRulesReplay:boolean}|{ok:false;issues:ValidationIssue[]};
const ajv=new Ajv({allErrors:true,strict:false});
ajv.addSchema(schema);
const kinds:Record<string,string>={Position:'Position',Move:'MoveDocument',GameState:'GameState',Marker:'MarkerDocument',Setup:'SetupDocument',Lesson:'Lesson',Puzzle:'Puzzle',TerminalFixture:'TerminalFixture',Feedback:'Feedback',ContentBundle:'ContentBundle'};
const validators=Object.fromEntries(Object.entries(kinds).map(([kind,def])=>[kind,ajv.compile({$ref:`urn:go-club:schema:content:1#/$defs/${def}`})]));
export function validateContent(input: unknown): ValidationResult {
  const issues:ValidationIssue[]=[];
  const fail=(code:string,path:string,message:string)=>issues.push({code,path:path||'/',message});
  if(!input || typeof input!=='object' || Array.isArray(input)) return {ok:false,issues:[{code:'SCHEMA_TYPE',path:'/',message:'内容必须是 JSON 对象。'}]};
  // JSON objects are traversed only after a closed schema has validated them.
  const data=input as Record<string,any>;
  if(data.schemaVersion!==1) return {ok:false,issues:[{code:'SCHEMA_VERSION',path:'/schemaVersion',message:'仅支持内容主版本 1；请保留原文件，使用对应迁移工具。'}]};
  const check=validators[data.kind];
  if(!check) return {ok:false,issues:[{code:'SCHEMA_KIND',path:'/kind',message:'未知内容类型。'}]};
  if(!check(data)) {
    for(const e of check.errors??[]) {
      const suffix=e.keyword==='required'?'/'+e.params.missingProperty:e.keyword==='additionalProperties'?'/'+e.params.additionalProperty:'';
      fail('SCHEMA_FIELD',e.instancePath+suffix,({required:'缺少必填字段。',additionalProperties:'包含当前版本未定义的字段。',enum:'请使用该字段允许的值。',const:'字段值与当前版本约定不符。',type:'字段的数据类型不正确。',minimum:'数值小于允许下限。',maximum:'数值超过允许上限。',pattern:'字段格式不符合约定。',oneOf:'动作或内容必须符合一个明确类型。'} as Record<string,string>)[e.keyword]??'字段不符合内容模型约束，请按模型说明修正。');
    }
    return {ok:false,issues};
  }
  let needsRulesReplay=false;
  function walk(x:any,path:string,size?:number):void {
    if(!x || typeof x!=='object') return;
    if(Array.isArray(x)) {x.forEach((v,i)=>walk(v,`${path}/${i}`,size));return;}
    const n=x.size??x.initialPosition?.size??x.position?.size??x.responseContext?.size??size;
    if('row' in x && 'col' in x && n && (x.row>=n||x.col>=n)) fail('COORD_BOUNDS',path+(x.row>=n?'/row':'/col'),`坐标超出 ${n}×${n} 完整棋盘。`);
    if(x.viewport && n) {const v=x.viewport;if(v.rowStart>v.rowEnd||v.colStart>v.colEnd||v.rowEnd>=n||v.colEnd>=n)fail('VIEWPORT_BOUNDS',path+'/viewport','裁切范围不在原始完整棋盘内。');}
    if(x.stones) {
      const seen=new Set<string>();
      x.stones.forEach((v:any,i:number)=>{const key=`${v.row},${v.col}`;if(n && (v.row>=n||v.col>=n))fail("COORD_BOUNDS",`${path}/stones/${i}/${v.row>=n?"row":"col"}`,"坐标超出完整棋盘。");if(seen.has(key))fail('DUPLICATE_POINT',`${path}/stones/${i}`,'同一交叉点不能重复占用。');seen.add(key);});
    }
    if(x.board && n && (x.board.length!==n||x.board.some((r:any[])=>r.length!==n)))fail('BOARD_SHAPE',path+'/board',`棋盘必须是 ${n} 行、每行 ${n} 个 B、W 或 null。`);
    if(x.history && n) {
      x.history.layouts.forEach((key:string,i:number)=>{if(!new RegExp(`^${n}\\|[.BW]{${n*n}}$`).test(key))fail('HISTORY_LAYOUT',`${path}/history/layouts/${i}`,'历史完整布局编码的尺寸或长度不符。');});
    }
    if(x.kind==='Position' && x.historyPolicy==='recorded') {
      needsRulesReplay=true;
      if(!issues.some(e=>e.path.startsWith(path+'/stones'))) {
        const current=layoutKey(boardFromPosition(x));
        if(x.history.layouts.at(-1)!==current)fail('HISTORY_CURRENT',path+'/history/layouts','记录历史最后一个布局必须等于当前盘面；完整合法性仍须规则引擎重放核查。');
      }
    }
    if(x.kind==='Feedback' && x.response && ['point-set','region-labels','move'].includes(x.response.type) && !x.responseContext)fail('RESPONSE_CONTEXT',path+'/responseContext','坐标型回答须带完整棋盘尺寸与内容引用上下文。');
    if(x.kind==='GameState') {
      needsRulesReplay=true;
      if(x.setup.size!==x.size)fail('SETUP_SIZE',path+'/setup/size','起点与对局的完整棋盘尺寸须一致。');
      if(x.setup.historyPolicy!=='fresh-setup')fail('SETUP_HISTORY',path+'/setup/historyPolicy','可重放对局从明确的 fresh-setup 起点开始。');
      if(x.phase==='finished' && !x.result)fail('PHASE_RESULT',path+'/result','已结束状态须有结果记录。');
      if(x.phase!=='finished' && x.result)fail('PHASE_RESULT',path+'/result','进行中或确认中不得携带最终结果。');
    }
    if(x.kind==='Puzzle') {
      if(x.firstPlayer!==x.initialPosition.toPlay)fail('FIRST_PLAYER',path+'/firstPlayer','先手须与初始局面的轮次一致。');
      const occupied=new Set(x.initialPosition.stones.map((s:any)=>`${s.row},${s.col}`));
      x.targetMarkers.forEach((m:any,i:number)=>m.points.forEach((p:any,j:number)=>{if(!occupied.has(`${p.row},${p.col}`))fail('TARGET_EMPTY',`${path}/targetMarkers/${i}/points/${j}`,'目标棋块标记必须指向实际棋子。');}));
      if(x.category==='DISC' && x.answer.type!=='open-text')fail('DISC_OPEN',path+'/answer/type','开放讨论不设唯一落子答案，须采用开放量规。');
      if(['point-set','region-labels'].includes(x.answer.type)) {
        const points=x.answer.points??x.answer.labels.map((v:any)=>v.at);
        points.forEach((p:any,i:number)=>{if(occupied.has(`${p.row},${p.col}`))fail('ANSWER_NOT_EMPTY',`${path}/answer/${x.answer.type==='point-set'?'points':'labels'}/${i}`,'空点集合或归属答案不能选已占用点。');});
      }
      if(x.answer.type==='reason-choice')for(const id of x.answer.acceptedOptionIds)if(!x.answer.options.some((o:any)=>o.optionId===id))fail('OPTION_REFERENCE',path+'/answer/acceptedOptionIds','答案引用了不存在的理由选项。');
      if(x.answer.type==='move-tree')checkTree(x,path);
      else if(x.coveredBranches.length)fail('COVERAGE_TYPE',path+'/coveredBranches','非着法树题使用评分规则；分支覆盖数组须为空。');
    }
    if(x.kind==='TerminalFixture') {
      if(x.status==='unsettled' && x.expectedScore!==null)fail('UNSETTLED_SCORE',path+'/expectedScore','未结束或争议示例不能携带最终预期分数。');
      if(x.status!=='unsettled' && !x.expectedScore)fail('MISSING_SCORE',path+'/expectedScore','明确终局或教学假设算例须给预期明细。');
      if(x.status==='teaching-assumption' && !x.assumptions.length)fail('ASSUMPTION_REQUIRED',path+'/assumptions','教学计算须明示假设。');
      if(x.status==='confirmed' && x.agreement.confirmedBy.length!==2)fail('AGREEMENT_REQUIRED',path+'/agreement/confirmedBy','确认终局须双方确认。');
      if(x.expectedScore && x.expectedScore.basis!==x.status)fail('SCORE_BASIS',path+'/expectedScore/basis','计分依据须与示例状态一致。');
    }
    if(x.type==='region-labels') {const points=new Set();x.labels.forEach((v:any,i:number)=>{const k=`${v.at.row},${v.at.col}`;if(points.has(k))fail('DUPLICATE_POINT',`${path}/labels/${i}`,'一个点不能重复指定归属。');points.add(k);});}
    if('blackTotal' in x && 'blackStones' in x) {
      if(x.blackTotal!==x.blackStones+x.blackTerritory.length||x.whiteTotal!==x.whiteStones+x.whiteTerritory.length+x.komi||x.difference!==x.blackTotal-x.whiteTotal)fail('SCORE_ARITHMETIC',path,'面积明细、贴目与合计不一致；提子不额外加分。');
      const expected=x.difference>0?'B':x.difference<0?'W':'draw';
      if(x.winner!==expected)fail('SCORE_WINNER',path+'/winner','胜负须与黑减白的差值一致。');
      const pts=[...x.blackTerritory,...x.whiteTerritory,...x.neutralPoints].map((p:any)=>`${p.row},${p.col}`);
      if(new Set(pts).size!==pts.length)fail('SCORE_OVERLAP',path,'各方空点与中立点不得重叠。');
      if(n && x.blackStones+x.whiteStones+pts.length!==n*n)fail('SCORE_PARTITION',path,'活子与全部空点须覆盖完整盘面。');
    }
    for(const [k,v] of Object.entries(x))walk(v,`${path}/${k}`,n);
  }
  function checkTree(p:any,path:string) {
    const a=p.answer,nodes=new Map<string,any>();
    a.nodes.forEach((node:any,i:number)=>{if(nodes.has(node.nodeId))fail('TREE_ID',`${path}/answer/nodes/${i}/nodeId`,'变化节点 ID 重复。');nodes.set(node.nodeId,node);if(['verified-alive','verified-dead'].includes(node.terminalStatus)&&!node.evidence.length)fail('TERMINAL_EVIDENCE',`${path}/answer/nodes/${i}/evidence`,'已核查死活状态必须附具体证据。');});
    const root=nodes.get(a.rootNodeId);
    if(!root||root.move!==null)fail('TREE_ROOT',path+'/answer/rootNodeId','根节点必须存在，且 move 为 null。');
    const visited=new Set(),active=new Set();
    function visit(id:string){if(active.has(id)){fail('TREE_CYCLE',path+'/answer/nodes','变化树不得循环引用。');return;}if(visited.has(id))return;const node=nodes.get(id);if(!node){fail('TREE_REFERENCE',path+'/answer/nodes','子节点引用不存在。');return;}visited.add(id);active.add(id);if(id!==a.rootNodeId&&!node.move)fail('TREE_MOVE',path+'/answer/nodes','非根节点须有动作。');for(const c of node.children)visit(c);active.delete(id);}
    visit(a.rootNodeId);
    if(visited.size!==nodes.size)fail('TREE_ORPHAN',path+'/answer/nodes','变化树含不可从根到达的节点。');
    p.coveredBranches.forEach((branch:string[],i:number)=>{if(branch[0]!==a.rootNodeId||branch.some((id,j)=>!nodes.has(id)||(j>0&&!nodes.get(branch[j-1])?.children.includes(id))))fail('COVERAGE_REFERENCE',`${path}/coveredBranches/${i}`,'覆盖记录须为从根开始的真实节点路径。');});
    if(a.uniquenessClaim&&!a.uniquenessEvidence.length)fail('UNIQUENESS_EVIDENCE',path+'/answer/uniquenessEvidence','唯一解声明必须有证据。');
  }
  walk(data,'');
  if(data.kind==='ContentBundle') {
    const ids=new Map<string,any>();
    data.items.forEach((item:any,i:number)=>{if(ids.has(item.id))fail('DUPLICATE_ID',`/items/${i}/id`,'内容包内独立内容 ID 重复。');ids.set(item.id,item);});
    data.items.forEach((item:any,i:number)=>{for(const r of item.contentRefs??item.relatedContent??[])if(!ids.has(r.id)||ids.get(r.id).revision!==r.revision)fail('CONTENT_REFERENCE',`/items/${i}`,'引用须在内容包内存在且 revision 精确匹配。');});
  }
  return issues.length?{ok:false,issues:issues.filter((e,i)=>issues.findIndex(v=>v.code===e.code&&v.path===e.path)===i)}:{ok:true,value:input as ContentDocument,level:'structural',needsRulesReplay};
}
export function parseContent(text:string,options:{maxBytes?:number}={}): ValidationResult {
  const maxBytes=options.maxBytes??2_000_000;
  if(new TextEncoder().encode(text).length>maxBytes)return {ok:false,issues:[{code:'IMPORT_SIZE',path:'/',message:`内容超过 ${maxBytes} 字节读取上限，请保留原文件。`}]};
  try{return validateContent(JSON.parse(text));}catch{return {ok:false,issues:[{code:'JSON_PARSE',path:'/',message:'无法读取 JSON，请修正格式后重试；原内容未改动。'}]};}
}

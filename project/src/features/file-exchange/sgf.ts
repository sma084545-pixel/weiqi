import type {Color,Coord,GameEvent,GameState,Position,Size} from '../../core/content.generated';
import {rulesEngine} from '../../core/rules';
import {safeFilename} from './json';
import {DEFAULT_IMPORT_LIMITS,type ImportIssue,type ImportLimits,type SgfGameTree,type SgfImportPreview,type SgfLine,type SgfMaterialized,type SgfNode,type SgfProperty} from './types';

const encoder=new TextEncoder();
const allowedSizes=new Set([5,9,13,19]);
const knownProperties=new Set(['GM','FF','CA','AP','SZ','RU','KM','AB','AW','AE','PL','B','W','C']);

class Parser{
  index=0;nodeIndex=0;issues:ImportIssue[]=[];
  constructor(readonly text:string,readonly limits:ImportLimits){}
  skip(){while(/\s/.test(this.text[this.index]??''))this.index++;}
  error(code:string,message:string){this.issues.push({code,path:`/char/${this.index}`,message,blocking:true});}
  collection():SgfGameTree[]{
    const games:SgfGameTree[]=[];this.skip();
    while(this.index<this.text.length&&games.length<this.limits.maxSgfGames){const root=this.tree(1);if(!root)break;games.push({root,sourceIndex:games.length});this.skip();}
    if(this.index<this.text.length&&!this.issues.length)this.error('SGF_GAMES_LIMIT',`SGF 对局数超过 ${this.limits.maxSgfGames} 个上限。`);
    if(!games.length&&!this.issues.length)this.error('SGF_EMPTY','没有找到 SGF 游戏树。');
    return games;
  }
  tree(depth:number):SgfNode|null{
    if(depth>this.limits.maxDepth){this.error('SGF_DEPTH',`变化嵌套超过 ${this.limits.maxDepth} 层上限。`);return null;}
    this.skip();if(this.text[this.index]!=='('){this.error('SGF_EXPECT_TREE','需要以 ( 开始游戏树。');return null;}this.index++;this.skip();
    let first:SgfNode|null=null,last:SgfNode|null=null;
    while(this.text[this.index]===';'){
      const node=this.node();if(!node)return null;if(!first)first=node;if(last)last.children.push(node);last=node;this.skip();
    }
    if(!first){this.error('SGF_EXPECT_NODE','游戏树至少需要一个以 ; 开始的节点。');return null;}
    while(this.text[this.index]==='('){const child=this.tree(depth+1);if(!child)return null;last!.children.push(child);this.skip();}
    if(this.text[this.index]!==')'){this.error('SGF_EXPECT_CLOSE','游戏树缺少结束括号 )。');return null;}this.index++;return first;
  }
  node():SgfNode|null{
    this.index++;const properties:SgfProperty[]=[];this.skip();
    while(/[A-Z]/.test(this.text[this.index]??'')){
      let id='';while(/[A-Z]/.test(this.text[this.index]??''))id+=this.text[this.index++];this.skip();const values:string[]=[];
      while(this.text[this.index]==='['){const value=this.value();if(value===null)return null;values.push(value);this.skip();}
      if(!values.length){this.error('SGF_PROPERTY_VALUE',`${id} 属性缺少方括号值。`);return null;}
      if(properties.some(property=>property.id===id)){this.error('SGF_DUPLICATE_PROPERTY',`同一节点不能重复出现 ${id} 属性。`);return null;}
      properties.push({id,values});
    }
    if(++this.nodeIndex>this.limits.maxSgfNodes){this.error('SGF_NODE_LIMIT',`节点数超过 ${this.limits.maxSgfNodes} 个上限。`);return null;}
    const moveProperty=properties.find(property=>property.id==='B'||property.id==='W');
    const comment=properties.find(property=>property.id==='C')?.values[0]??'';
    return {nodeId:`n${this.nodeIndex-1}`,properties,children:[],move:moveProperty?{type:moveProperty.values[0]===''?'pass':'place',color:moveProperty.id as Color}:null,comment};
  }
  value():string|null{
    this.index++;let value='';
    while(this.index<this.text.length){const char=this.text[this.index++];if(char===']')return value;if(char==='\\'){
      if(this.index>=this.text.length){value+='\\';continue;}
      const next=this.text[this.index++];if(next==='\r'){if(this.text[this.index]==='\n')this.index++;continue;}if(next==='\n')continue;value+=next;continue;
    }value+=char==='\r'?'\n':char;}
    this.error('SGF_UNCLOSED_VALUE','属性值缺少结束方括号 ]。');return null;
  }
}

const property=(node:SgfNode,id:string)=>node.properties.find(item=>item.id===id);
const coordChar=(char:string)=>char>='a'&&char<='z'?char.charCodeAt(0)-97:-1;
function parsePoint(value:string,size:Size,path:string,issues:ImportIssue[],allowPass=false):Coord|null{
  if(allowPass&&(value===''||(value==='tt'&&size<=19)))return null;
  if(!/^[a-z]{2}$/.test(value)){issues.push({code:'SGF_POINT',path,message:'坐标必须是两个小写字母；停手使用空值。',blocking:true});return null;}
  const at={col:coordChar(value[0]),row:coordChar(value[1])};if(at.row>=size||at.col>=size){issues.push({code:'SGF_POINT_BOUNDS',path,message:`坐标 ${value} 超出 ${size}×${size} 棋盘。`,blocking:true});return null;}return at;
}
function expandPoint(value:string,size:Size,path:string,issues:ImportIssue[]):Coord[]{
  const parts=value.split(':');if(parts.length===1){const point=parsePoint(value,size,path,issues);return point?[point]:[];}
  if(parts.length!==2){issues.push({code:'SGF_POINT_LIST',path,message:'压缩点列表格式不正确。',blocking:true});return [];}
  const a=parsePoint(parts[0],size,path,issues),b=parsePoint(parts[1],size,path,issues);if(!a||!b||a.row>b.row||a.col>b.col){issues.push({code:'SGF_POINT_RANGE',path,message:'压缩点范围须从左上到右下。',blocking:true});return [];}
  const result:Coord[]=[];for(let row=a.row;row<=b.row;row++)for(let col=a.col;col<=b.col;col++)result.push({row,col});return result;
}
function allNodes(root:SgfNode){const result:SgfNode[]=[];const visit=(node:SgfNode)=>{result.push(node);node.children.forEach(visit);};visit(root);return result;}
function escapeValue(value:string){return value.replace(/\\/g,'\\\\').replace(/]/g,'\\]');}
function pointToSgf(at:Coord){return String.fromCharCode(97+at.col)+String.fromCharCode(97+at.row);}
function setupFor(root:SgfNode,size:Size,filename:string,issues:ImportIssue[],warnings:string[]):Position|null{
  const points=new Map<string,Color>();
  for(const id of ['AB','AW'] as const){const item=property(root,id);for(const [index,value] of (item?.values??[]).entries())for(const at of expandPoint(value,size,`/root/${id}/${index}`,issues)){const key=`${at.row},${at.col}`;if(points.has(key))issues.push({code:'SGF_SETUP_OVERLAP',path:`/root/${id}/${index}`,message:'AB、AW、AE 不能在同一点重叠。',blocking:true});else points.set(key,id==='AB'?'B':'W');}}
  const erased=new Set<string>();for(const [index,value] of (property(root,'AE')?.values??[]).entries())for(const at of expandPoint(value,size,`/root/AE/${index}`,issues)){const key=`${at.row},${at.col}`;if(points.has(key)||erased.has(key))issues.push({code:'SGF_SETUP_OVERLAP',path:`/root/AE/${index}`,message:'AB、AW、AE 不能在同一点重叠。',blocking:true});erased.add(key);}
  const pl=property(root,'PL')?.values[0];if(pl!==undefined&&pl!=='B'&&pl!=='W')issues.push({code:'SGF_PL',path:'/root/PL',message:'PL 只能是 B 或 W。',blocking:true});if(pl===undefined)warnings.push('根节点没有 PL；本次明确以黑方先手建立 fresh-setup，不推测原对局轮次。');
  if(issues.some(item=>item.blocking))return null;
  const id=safeFilename(filename.replace(/\.sgf$/i,''),undefined).replace(/[^A-Za-z0-9_.-]/g,'-').toUpperCase();
  return {schemaVersion:1,id:`POS-SGF-${id}`,revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size,stones:[...points.entries()].map(([key,color])=>{const [row,col]=key.split(',').map(Number);return {row,col,color};}),toPlay:(pl??'B') as Color,historyPolicy:'fresh-setup',history:null};
}
function validateNodes(root:SgfNode,size:Size,issues:ImportIssue[],warnings:string[]){
  const nodes=allNodes(root);for(const [index,node] of nodes.entries()){
    const moves=node.properties.filter(item=>item.id==='B'||item.id==='W');if(moves.length>1)issues.push({code:'SGF_MOVE_CONFLICT',path:`/nodes/${index}`,message:'一个节点不能同时包含 B 与 W。',blocking:true});
    if(index===0&&moves.length)issues.push({code:'SGF_ROOT_MOVE',path:'/root',message:'首版要求根节点只描述 setup；请把首手放到下一节点。',blocking:true});
    if(index>0&&node.properties.some(item=>['AB','AW','AE','PL'].includes(item.id)))issues.push({code:'SGF_NON_ROOT_SETUP',path:`/nodes/${index}`,message:'首版不解释非根节点摆子或轮次编辑；已保留原 SGF，未导入。',blocking:true});
    for(const item of node.properties)if(!knownProperties.has(item.id))warnings.push(`节点 ${index} 的 ${item.id} 属性不在首版解释范围；原 SGF 文本仍保留。`);
    if(node.move?.type==='place'){const item=moves[0],value=item.values[0];if(value===''||(value==='tt'&&size<=19))node.move={type:'pass',color:node.move.color};else{const at=parsePoint(value,size,`/nodes/${index}/${item.id}`,issues,true);if(at)node.move={...node.move,at};}}
  }
}
function replayTree(root:SgfNode,position:Position,issues:ImportIssue[]){
  const started=rulesEngine.startGame(position,{mode:'full-game',komi:0,gameId:`SGF-CHECK-${position.id}`});if(!started.ok){issues.push({code:started.error.code,path:'/root',message:'根节点 setup 不能作为规则起点。',blocking:true});return;}
  const visit=(node:SgfNode,state:GameState)=>{let current=state;if(node!==root&&node.move){const result=node.move.type==='pass'?rulesEngine.applyPass(state,node.move.color):rulesEngine.tryMove(state,{type:'place',color:node.move.color,at:node.move.at!});if(!result.ok){issues.push({code:result.error.code,path:`/nodes/${node.nodeId}`,message:'该节点未通过 GO-CLUB-AREA-1 逐手重放。',blocking:true});return;}current=result.value.nextState;}for(const child of node.children)visit(child,current);};visit(root,started.value);
}

export function previewSgf(text:string,filename:string,options:{limits?:Partial<ImportLimits>;selectedGame?:number}={}):SgfImportPreview{
  const limits={...DEFAULT_IMPORT_LIMITS,...options.limits},issues:ImportIssue[]=[],warnings:string[]=[],byteLength=encoder.encode(text).length,cleanName=safeFilename(filename||'import.sgf','sgf');
  if(byteLength>limits.maxBytes)issues.push({code:'IMPORT_SIZE',path:'/',message:`文件超过 ${limits.maxBytes} 字节上限。`,blocking:true});
  const parser=new Parser(text,limits),games=issues.length?[]:parser.collection();issues.push(...parser.issues);const selectedGame=Math.min(Math.max(options.selectedGame??0,0),Math.max(0,games.length-1));const root=games[selectedGame]?.root;
  let size:Size|null=null,komi=0,position:Position|null=null,sourceRules:string|null=null,ruleDisposition:SgfImportPreview['ruleDisposition']='unknown';
  if(root){const gm=property(root,'GM')?.values[0],ff=property(root,'FF')?.values[0],ca=property(root,'CA')?.values[0];if(gm!=='1')issues.push({code:'SGF_GM',path:'/root/GM',message:'首版只支持围棋 GM[1]。',blocking:true});if(ff!=='4')issues.push({code:'SGF_FF',path:'/root/FF',message:'首版只支持 FF[4]。',blocking:true});if(ca&&ca.toUpperCase()!=='UTF-8')issues.push({code:'SGF_CHARSET',path:'/root/CA',message:'首版只支持 UTF-8；原文件已保留。',blocking:true});if(!ca)warnings.push('根节点没有 CA；页面按 UTF-8 试读。');
    const rawSize=Number(property(root,'SZ')?.values[0]??19);if(!allowedSizes.has(rawSize))issues.push({code:'SGF_SIZE',path:'/root/SZ',message:'项目只支持完整 5、9、13、19 路棋盘。',blocking:true});else size=rawSize as Size;
    const rawKomi=property(root,'KM')?.values[0];if(rawKomi!==undefined){komi=Number(rawKomi);if(!Number.isFinite(komi))issues.push({code:'SGF_KM',path:'/root/KM',message:'KM 必须是有限数值。',blocking:true});}
    sourceRules=property(root,'RU')?.values[0]??null;ruleDisposition=sourceRules===null?'unknown':sourceRules==='GO-CLUB-AREA-1'?'matching':'conflict';if(sourceRules===null)warnings.push('RU 缺失：源规则未知；只能在 GO-CLUB-AREA-1 下试导入。');else if(ruleDisposition==='conflict')warnings.push(`RU[${sourceRules}] 与 GO-CLUB-AREA-1 不同；不会静默切换规则。`);
    if(size){validateNodes(root,size,issues,warnings);position=setupFor(root,size,cleanName,issues,warnings);if(position&&!issues.some(item=>item.blocking)){const setup=rulesEngine.validateSetup(position);if(!setup.ok)issues.push({code:setup.error.code,path:'/root',message:'根节点 setup 含无气棋块，不能进入规则模式。',blocking:true});else replayTree(root,position,issues);}}
  }
  if(games.length>1)warnings.push(`文件含 ${games.length} 棵游戏树；预览当前选择第 ${selectedGame+1} 棵，其余仍保留在原文本中。`);
  const nodes=root?allNodes(root):[];const branchCount=nodes.reduce((sum,node)=>sum+Math.max(0,node.children.length-1),0);
  return {ok:issues.length===0,filename:cleanName,raw:text,byteLength,games,selectedGame,size,komi,position,sourceRules,ruleDisposition,nodeCount:nodes.length,branchCount,issues,warnings:[...new Set(warnings)]};
}

export function listSgfLines(preview:SgfImportPreview):SgfLine[]{
  const root=preview.games[preview.selectedGame]?.root;if(!root)return [];
  const lines:SgfLine[]=[];const visit=(node:SgfNode,path:SgfNode[],moves:number)=>{const next=[...path,node],count=moves+(node.move?1:0);if(!node.children.length){const index=lines.length+1;lines.push({lineId:`line-${index}`,nodeIds:next.map(item=>item.nodeId),label:`路线 ${index} · ${count} 手`,moveCount:count});}else node.children.forEach(child=>visit(child,next,count));};visit(root,[],0);return lines;
}
export function materializeSgfLine(preview:SgfImportPreview,line:SgfLine):{ok:true;value:SgfMaterialized}|{ok:false;issue:ImportIssue}{
  const root=preview.games[preview.selectedGame]?.root,position=preview.position;if(!preview.ok||!root||!position)return {ok:false,issue:{code:'SGF_PREVIEW',path:'/',message:'SGF 预览未通过，不能建立主线。',blocking:true}};
  const map=new Map(allNodes(root).map(node=>[node.nodeId,node])),started=rulesEngine.startGame(position,{mode:'full-game',komi:preview.komi,gameId:`SGF-${safeFilename(preview.filename).replace(/\W/g,'-')}`});if(!started.ok)return {ok:false,issue:{code:started.error.code,path:'/root',message:'无法建立对局起点。',blocking:true}};let game=started.value;
  for(const id of line.nodeIds.slice(1)){const move=map.get(id)?.move;if(!move)continue;const result=move.type==='pass'?rulesEngine.applyPass(game,move.color):rulesEngine.tryMove(game,{type:'place',color:move.color,at:move.at!});if(!result.ok)return {ok:false,issue:{code:result.error.code,path:`/nodes/${id}`,message:'所选路线重放失败。',blocking:true}};game=result.value.nextState;}
  return {ok:true,value:{game,line,omittedBranchCount:Math.max(0,listSgfLines(preview).length-1)}};
}

export function serializeSgfTree(tree:SgfGameTree){
  const node=(value:SgfNode)=>`;${value.properties.map(item=>`${item.id}${item.values.map(v=>`[${escapeValue(v)}]`).join('')}`).join('')}`;
  const branch=(root:SgfNode):string=>{let out='(',current=root;while(true){out+=node(current);if(current.children.length===1){current=current.children[0];continue;}for(const child of current.children)out+=branch(child);return out+')';}};return branch(tree.root)+'\n';
}
export function serializeGameToSgf(game:GameState):{text:string;warnings:string[]}{
  const warnings:string[]=[],root=[`GM[1]`,`FF[4]`,`CA[UTF-8]`,`AP[GoClub:0.15.0]`,`SZ[${game.size}]`,`RU[GO-CLUB-AREA-1]`,`KM[${game.komi}]`,`PL[${game.setup.toPlay}]`];
  const black=game.setup.stones.filter(stone=>stone.color==='B').map(stone=>`[${pointToSgf(stone)}]`).join(''),white=game.setup.stones.filter(stone=>stone.color==='W').map(stone=>`[${pointToSgf(stone)}]`).join('');if(black)root.push(`AB${black}`);if(white)root.push(`AW${white}`);root.push(`C[${escapeValue('由围棋社工具按 GO-CLUB-AREA-1 导出；JSON 才是完整状态的权威格式。')}]`);
  let body=`(;${root.join('')}`;for(const event of game.moves){if(event.type==='place')body+=`;${event.color}[${pointToSgf(event.at)}]`;else if(event.type==='pass')body+=`;${event.color}[]`;else if(event.type==='resign')warnings.push('认输没有写成 B/W 着法；请使用 JSON 保留最终结果。');else warnings.push(`${event.type} 是项目终局流程，SGF 首版不无损表达；JSON 中仍保留。`);}return {text:body+')\n',warnings:[...new Set(warnings)]};
}

export function sgfPropertySummary(node:SgfNode){return node.properties.map(item=>`${item.id}[${item.values.join('][')}]`).join(' ');}

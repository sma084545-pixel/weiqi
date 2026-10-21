import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=process.env.RUNTIME_NODE_MODULES??'/Users/maxiao/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const skill=process.env.PRESENTATION_SKILL_DIR??'/Users/maxiao/.codex/plugins/cache/openai-primary-runtime/presentations/26.905.11957/skills/presentations';
const py=process.env.RUNTIME_PYTHON??'/Users/maxiao/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';
const {Presentation,PresentationFile}=await import(pathToFileURL(path.join(runtime,'@oai/artifact-tool/dist/artifact_tool.mjs')).href);
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
const bundle=JSON.parse(await fs.readFile(path.join(root,'t09/bundle.json'),'utf8'));
const meta=JSON.parse(await fs.readFile(path.join(root,'t09/pedagogy.json'),'utf8')).items;
const staging=path.join(root,'validation/ppt-build');await fs.mkdir(staging,{recursive:true});
try{await fs.symlink(runtime,path.join(staging,'node_modules'));}catch(e){if(e.code!=='EEXIST')throw e;}
const pres=Presentation.create({slideSize:{width:1280,height:720}});
const font='Arial Unicode MS';const cols='ABCDEFGHJKLMNOPQRST';
const cp=d=>d.initialPosition??d.position;
const coord=(p,n)=>cols[p.col]+(n-p.row);
function shape(s,geo,name,x,y,w,h,fill,linefill='none',lineWidth=0){return s.shapes.add({geometry:geo,name,position:{left:x,top:y,width:w,height:h},fill,line:{fill:linefill,width:lineWidth}});}
function text(s,t,x,y,w,h,size=30,color='#253B45',bold=false,name='text'){
 const q=shape(s,'textbox',name,x,y,w,h,'none');q.text=t;q.text.style={typeface:font,fontSize:size,color,bold,autoFit:'none',insets:{top:0,right:0,bottom:0,left:0},alignment:/^(row-|column-|target-)/.test(name)?'center':'left',verticalAlignment:/^(row-|column-|target-)/.test(name)?'middle':'top'};return q;
}
function wrapQuestion(input){
 const lines=[];let line='',width=0;
 for(const token of input.match(/（[^）]*）|[A-Za-z0-9.]+|./gu)??[]){
  const units=[...token].reduce((n,c)=>n+(c.charCodeAt(0)<128?.58:1),0);
  if(width+units>19&&line&&!/^[，。？！、；：）》]$/.test(token)){lines.push(line.trim());line='';width=0;}
  line+=token;width+=units;
 }if(line)lines.push(line.trim());if(lines.length>4)throw Error('Question needs shorter layout');return lines.join('\n');
}
function board(s,d){
 const p=cp(d),n=p.size,ox=91,oy=210,span=390,step=span/(n-1),rad=Math.min(20,step*.42);
 // Required evidence diagram: every stone and axis is editable and generated from the same coordinates as its SVG.
 for(let i=0;i<n;i++){
  shape(s,'line',`grid-v-${i}`,ox+i*step,oy,.02,span,'none','#8C887D',1.2);
  shape(s,'line',`grid-h-${i}`,ox,oy+i*step,span,.02,'none','#8C887D',1.2);
  text(s,cols[i],ox+i*step-15,oy+span+18,30,25,20,'#253B45',false,`column-${i}`);
  text(s,String(n-i),ox-66,oy+i*step-14,50,30,20,'#253B45',false,`row-${i}`);
 }
 const targets=new Map(d.targetMarkers?.flatMap((m,i)=>m.points.map(p=>[`${p.row},${p.col}`,String(i+1)]))??[]);
 for(const stone of p.stones){const x=ox+stone.col*step,y=oy+stone.row*step;
  shape(s,'ellipse',`stone-${stone.color}-${stone.row}-${stone.col}`,x-rad,y-rad,rad*2,rad*2,stone.color==='B'?'#20272A':'#FFFFFF','#20272A',1.5);
  const mark=targets.get(`${stone.row},${stone.col}`);if(mark)text(s,mark,x-12,y-12,24,24,18,stone.color==='B'?'#FFFFFF':'#20272A',false,`target-${stone.row}-${stone.col}`);
 }
}
for(let i=0;i<bundle.items.length;i++){
 const d=bundle.items[i],m=meta[d.id],p=cp(d);const s=pres.slides.add();s.background.fill='#FFFFFF';
 text(s,d.id+'  '+m.title,54,39,1170,78,43,'#172D37',true,'slide-title');
 const status=`完整 ${p.size}×${p.size}`+(p.size===5?' 小棋盘练习':' 棋盘')+'　'+(p.toPlay==='B'?'黑方':'白方')+'轮次';
 text(s,status,55,126,650,38,24,'#52696F',false,'board-status');board(s,d);
 let prompt=d.prompt??(d.status==='unsettled'?'本例可以给出最终得分吗？说明下一步怎样处理。':'根据给定教学假设，逐项核对双方活子、围空、中立点与贴目。');
 text(s,wrapQuestion(prompt),569,191,651,166,31,'#172D37',false,'question').text.wrap='none';
 let detail='';
 if(d.category==='DISC')detail='说明你的目标与一个对方回应，再听听同伴的理由。\n没有唯一最佳手。';
 else if(d.answer?.type==='reason-choice')detail=d.answer.options.map(o=>o.optionId+'：'+o.text).join('\n');
 else if(d.category==='AREA'||d.kind==='TerminalFixture'){
  if((d.status==='unsettled')||d.id==='END-006')detail='没有两次停手与死子共识。\n目标仍有气，先实际演示。';
  else{const e=d.kind==='TerminalFixture'?d:bundle.items.find(x=>x.id===d.relatedContent[0].id);detail='教学假设：'+(e.agreement.deadStones.length?'双方同意 '+e.agreement.deadStones.map(a=>coord(a,p.size)).join('、')+' 为死子，移除后计分。':'盘上棋子均按活子计算。')+'\n'+(e.agreement.neutralPoints.length?'第 3 行按约定保留为中立区。\n':'')+'开局贴目 '+e.komi+'。';}
 }else detail='可先自己想一想，再与同伴摆出变化。\n需要帮助时，可请带领者给下一层提示。';
 text(s,detail,569,389,651,190,26,'#3B565F',false,'discussion-or-conditions');
 text(s,'数字 = 目标标记　行号自下向上　r'+d.revision,55,666,900,29,18,'#52696F',false,'coordinate-footer');
 text(s,String(i+1)+' / 36',1124,666,110,29,18,'#52696F',false,'page-number');
 const notes=[`${d.id} revision=${d.revision}; schemaVersion=1; rulesetId=GO-CLUB-AREA-1; contentVersion=0.2.0-t09.1`,status,'问题：'+prompt,'成功标准：'+m.success,'答案与解释：'+m.explanation,
 ...(m.lines??[]).map(l=>'变化：'+l.moves.join(' → ')+'。'+l.proof),...(m.candidates??[]).map(c=>'候选：'+c.consideration),
 '三层提示：',...(d.hints??m.hints??[]).map((h,j)=>(j+1)+'. '+h),'常见错误：'+m.commonErrors,'同伴讨论：'+m.peerDiscussion,
 ...(d.answer?.criteria??[]).map(c=>'开放量规：'+c),
 ...(d.conditions?.assumptions.slice(4)??d.assumptions??[]),
 ...(m.supplementalLines??[]).map(l=>'补充变化：'+l.moves.map(a=>(a.color==='B'?'黑':'白')+(a.type==='pass'?'停手':coord(a.at,p.size))).join(' → ')+'。'+l.claim),
 ...(m.komiScenarios??[]).map(k=>`另开情境：贴目 ${k.komi}；黑 ${k.blackTotal}，白 ${k.whiteTotal}。`),
 ...(d.expectedScore?['逐点明细：'+JSON.stringify(d.expectedScore)]:[]),
 '完整坐标：'+p.stones.map(a=>a.color+' '+coord(a,p.size)).join('；'),
 '来源：本次依据 GO-CLUB-AREA-1 原创。一般概念参考 British Go Association, How to Play, https://www.britgo.org/intro/intro2.html （2026-09-07 读取）；不采用其不同计分、停手和重复规则。',
 '教师使用边界：开放题不判唯一最佳手。未收录合法着为 unknown。两眼证明的前提是己方不主动破坏眼形。具体教学假设不可冒充真实学生对局或实施成效。'];
 s.speakerNotes.textFrame.setText(notes.join('\n\n'));
}
const candidate=path.join(staging,'candidate.pptx');await(await PresentationFile.exportPptx(pres)).save(candidate);
const finalPath=path.join(root,'print/T09_教学演示_r1.pptx');
await finalizePresentation({workspaceDir:root,candidatePath:candidate,finalPath,pythonExecutable:py,integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],explicitTotalSlideCount:36,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'design',families:[font]},verifyArtifactToolImport:true,receiptPath:path.join(staging,'final-validation-delivery.json')});
console.log(finalPath);

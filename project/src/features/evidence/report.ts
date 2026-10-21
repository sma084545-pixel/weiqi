import {ACTIVITIES,DIFFICULTIES,ISSUES,identity,summarize,type EvidenceWorkspace} from './model';

export function reviewedReport(w:EvidenceWorkspace,includeTests=false):EvidenceWorkspace{
  const activities=w.activities.filter(a=>includeTests||!a.developmentOnly),ids=new Set(activities.map(a=>a.id));
  const eligible=w.feedback.filter(f=>ids.has(f.activityId));
  return {...structuredClone(w),...identity(`EXPORT-T17-${Date.now()}`),kind:'T17EvidenceReport',activities,feedback:eligible.filter(f=>f.feedback.consentToUse).map(f=>structuredClone(f)),improvements:w.improvements.filter(i=>ids.has(i.activityId)).map(i=>({...structuredClone(i),revisionLink:i.revisionLink?{...structuredClone(i.revisionLink),before:null,after:null}:null})),processes:w.processes.filter(p=>ids.has(p.activityId)).map(p=>structuredClone(p)),exportPolicy:{includeTests,excludedWithoutConsent:eligible.filter(f=>!f.feedback.consentToUse).length,reviewedFreeText:true}};
}
// Escape imported free text as Markdown text, rather than links, HTML or headings.
const text=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/[\\`*_{}\[\]()#+.!|~-]/g,'\\$&').replace(/\n/g,'  \n');
export function reportMarkdown(w:EvidenceWorkspace){
  let md=`---\nschemaVersion: 1\nid: ${w.id}\nrevision: ${w.revision}\nrulesetId: GO-CLUB-AREA-1\n---\n\n# 围棋社反馈与迭代记录\n\n${w.exportPolicy?.includeTests?'含开发测试记录，不能作为真实成员意见或实施证据。':'真实记录范围：默认排除开发测试。'}\n\n此报告来自本机记录，不证明合作质量、学习效果或学校 CAS 认可。分享前请检查自由文本；未同意用于汇总导出的反馈不包含在此报告中。\n\n`;
  if(!w.activities.length)md+='当前没有活动记录，没有可报告的成员评价。\n\n';
  for(const activity of w.activities){const rows=w.feedback.filter(f=>f.activityId===activity.id),sum=summarize(rows);md+=`## ${text(activity.title)}\n\n活动编号：${activity.id} · 日期：${activity.date}${activity.developmentOnly?' · 开发测试':''}\n\n实际导出答复数：${sum.total}。各选项分母均为这 ${sum.total} 条导出答复；不是参与人数。\n\n`;
    for(const [key,label] of Object.entries(DIFFICULTIES))md+=`- 难度 ${label}：${sum.difficulty[key]}/${sum.total}\n`;
    md+=`- 难度缺失：${sum.difficulty.missing}/${sum.total}\n`;
    for(const [key,label] of Object.entries(ACTIVITIES))md+=`- 喜欢 ${label}：${sum.preferred[key]}/${sum.total}\n`;
    md+=`- 喜欢活动缺失：${sum.preferred.missing}/${sum.total}\n- 改变建议缺失：${sum.missingComment}/${sum.total}\n\n`;
    for(const f of rows)md+=`### 答复 ${f.id}${f.feedback.developmentOnly?'（测试）':''}\n\n希望改变：${text(f.feedback.comment)||'未填写'}\n\n问题类型：${f.issue?ISSUES[f.issue]:'未指定'}；资源：${f.resourceRef?`${text(f.resourceRef.id)}@${f.resourceRef.revision}`:'未指定'}\n\n`;
  }
  md+='## 资源改进\n\n';if(!w.improvements.length)md+='没有改进记录。\n\n';
  for(const i of w.improvements)md+=`### ${text(i.problem)}${i.developmentOnly?'（测试）':''}\n\n编号：${i.id}；活动：${i.activityId}；状态：${i.state==='planned'?'计划':i.state==='revised'?'已建修改草稿，未实施':'使用者自报已实施'}\n\n证据引用：${i.evidenceIds.map(text).join(', ')||'无'}；证据说明：${text(i.evidenceNote)||'未填写'}\n\n拟改资源：${i.resourceRef?`${text(i.resourceRef.id)}@${i.resourceRef.revision}`:'未指定'}\n\n修改内容：${text(i.change)||'未填写'}\n\n修改日期：${i.changeDate??'未修改'}；验证方法：${text(i.validationMethod)||'未填写'}\n\n前后版本：${i.revisionLink?`${text(i.revisionLink.beforeRef.id)}@${i.revisionLink.beforeRef.revision} → ${text(i.revisionLink.afterRef.id)}@${i.revisionLink.afterRef.revision}`:'未建立'}\n\n实施日期：${i.implementationDate??'未实施'}；实施后观察：${text(i.afterObservation??'未观察')}\n\n下一步：${text(i.nextStep)||'未填写'}\n\n`;
  md+='## CAS 过程记录（使用者自报）\n\n';if(!w.processes.length)md+='没有过程记录。\n\n';
  for(const p of w.processes)md+=`### ${p.date} · ${p.id}${p.developmentOnly?'（测试）':''}\n\n活动：${p.activityId}\n\n本人设计/修改：${text(p.design)||'未填写'}\n\n同伴贡献：${text(p.peerContribution)||'未填写'}\n\nAI 协助：${text(p.aiAssistance)||'未填写'}\n\n参考资料：${text(p.references)||'未填写'}\n\n真实实施：${text(p.implementation)||'未填写，不能认定已实施'}\n\n实际投入：${p.actualMinutes===null?'未记录':`${p.actualMinutes} 分钟（自报，未认定为 CAS 工时）`}\n\n自行填写的反思：${text(p.reflection)||'未填写；程序未生成个人经历'}\n\n`;
  md+='## 空白反思提问（模板，不是已发生经历）\n\n- 我具体设计或修改了什么？有什么可检查的版本证据？\n- 同伴和 AI 分别贡献了什么？我亲自核查了哪些部分？\n- 实施时实际观察到了什么？哪些判断还没有证据？\n- 下一次准备改变什么，怎样验证？\n';return md;
}
export function downloadReport(body:string,name:string,mime:string){const url=URL.createObjectURL(new Blob([body],{type:mime})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function printReport(markdown:string){
  const win=window.open('','_blank');if(!win)return false;const doc=win.document;doc.title='围棋社反馈与迭代记录';
  const style=doc.createElement('style');style.textContent='@page{size:A4;margin:18mm}body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;color:#152a21;font-size:10.5pt;line-height:1.6}article{overflow-wrap:anywhere}p{margin:5px 0;white-space:pre-wrap}h1{font-size:23pt}h2{font-size:16pt;border-bottom:1px solid #90aa99;padding-top:10px}h3{font-size:12pt}h1,h2,h3{break-after:avoid}button{padding:12px;font-size:16px}@media print{button{display:none}}';doc.head.append(style);
  const button=doc.createElement('button');button.textContent='打印 / 另存为 PDF';button.onclick=()=>win.print();const article=doc.createElement('article');
  const lines=markdown.replace(/^---\n[\s\S]*?\n---\n/,'').split('\n');
  for(const line of lines){if(!line.trim())continue;const heading=line.match(/^(#{1,3}) /),el=doc.createElement(heading?`h${heading[1].length}`:'p');el.textContent=(heading?line.slice(heading[0].length):line).replace(/\\([\\`*_{}\[\]()#+.!|~-])/g,'$1').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');article.append(el);}
  doc.body.append(button,article);return true;
}

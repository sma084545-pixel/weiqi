async page=>{
 const browser=page.context().browser(),c=await browser.newContext({viewport:{width:360,height:900},hasTouch:true}),p=await c.newPage(),requests=[];p.on('request',r=>{if(r.url().includes('/api/ai-move'))requests.push(r.url());});
 try{
  await p.goto('http://127.0.0.1:4213/#/play/ai');await p.getByLabel('难度').selectOption('extreme');await p.getByText('极致服务尚未启用；可先使用其他三档。',{exact:false}).waitFor();
  if(!await p.getByRole('button',{name:'验证设置并开始 AI 对局',exact:true}).isDisabled())throw Error('Unconfigured extreme must not start');
  for(const d of ['relaxed','standard','challenge']){await p.getByLabel('难度').selectOption(d);if(!await p.getByRole('button',{name:'验证设置并开始 AI 对局',exact:true}).isEnabled())throw Error('Old three levels blocked');}
  if(requests.length)throw Error('Unconfigured model must not call base service');await p.getByLabel('难度').selectOption('extreme');await p.screenshot({path:'output/playwright/extreme-unconfigured-360.png',fullPage:true});
  return {schemaVersion:1,id:'EXTREME-UNCONFIGURED-UI',revision:1,rulesetId:'GO-CLUB-AREA-1',status:'passed',at:new Date().toISOString(),mode:'actual-browser-production-build-no-strong-service-address',browser:browser.version(),checks:['honest-not-enabled-message','cannot-start-unconfigured-model','old-three-selectable','zero-fallback-requests'],requests,humanReviewed:null};
 }finally{await c.close();}
}

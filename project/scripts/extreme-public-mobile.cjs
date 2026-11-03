async page=>{
 const browser=page.context().browser(),base=page.url().split('#')[0].replace(/\/$/,''),model='kata1-tf2-b10c384-s2941M-d5872M',checks=[],errors=[];
 const c=await browser.newContext({viewport:{width:360,height:900},hasTouch:true,reducedMotion:'reduce'}),p=await c.newPage();p.setDefaultTimeout(100_000);p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});const replies=[];
 p.on('response',async r=>{if(r.request().method()==='POST'&&r.url().endsWith('/api/ai-move'))replies.push({status:r.status(),body:await r.json().catch(()=>null)});});
 const assert=(v,s)=>{if(!v)throw Error(s);},attr=(key,value)=>p.waitForFunction(([k,v])=>document.querySelector('[data-testid="ai-game"]')?.getAttribute(k)===v,[key,String(value)],{timeout:100_000});
 try{
  await p.goto(base+'/#/play/ai');await p.getByLabel('难度').selectOption('extreme');await p.getByLabel('棋盘尺寸').selectOption('5');await p.getByRole('radio',{name:'白方（AI 先行）'}).check();await p.getByRole('button',{name:'验证设置并开始 AI 对局',exact:true}).click();await attr('data-move-count',1);await attr('data-turn','W');assert(replies[0]?.status===200&&replies[0].body.engine.model===model,'real extreme black move');
  const sent=p.waitForRequest(r=>r.method()==='POST'&&r.url().endsWith('/api/ai-move'));
  await p.locator('.full-board-panel>.shared-board [data-stone=empty][aria-disabled=false]').first().focus();await p.keyboard.press('Enter');await attr('data-move-count',2);await sent;await p.getByRole('button',{name:'暂停 AI 思考',exact:true}).click();await attr('data-paused','true');
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile overflow');assert(await p.locator('.full-board-panel>.shared-board [role=gridcell]').count()===25,'full real 5 board');await p.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});await p.screenshot({path:'output/playwright/public-extreme-360-keyboard.png',fullPage:true});checks.push({name:'mobile-real-black-first-keyboard-white-cancel-inflight',status:'passed',responses:replies});
 }finally{await c.close();}
 for(const [width,size] of [[768,13],[1280,19]]){
  const ctx=await browser.newContext({viewport:{width,height:950},hasTouch:true,reducedMotion:'reduce'}),t=await ctx.newPage();t.on('pageerror',e=>errors.push(e.message));
  try{await t.goto(base+'/#/play/ai');await t.getByLabel('难度').selectOption('extreme');await t.getByLabel('棋盘尺寸').selectOption(String(size));assert(await t.locator('.full-board-panel>.shared-board [role=gridcell]').count()===size*size,'full setup geometry');assert(await t.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'setup overflow');await t.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});await t.screenshot({path:`output/playwright/public-extreme-${width}-${size}-setup.png`,fullPage:true});checks.push({name:`${width}px-${size}-board-extreme-setup`,status:'passed'});}finally{await ctx.close();}
 }
 assert(errors.length===0,errors.join(';'));return {schemaVersion:1,id:'EXTREME-PUBLIC-MOBILE',revision:1,rulesetId:'GO-CLUB-AREA-1',status:'passed',mode:'actual-GitHub-Pages-touch-keyboard-simulation-and-Render-Free-model',at:new Date().toISOString(),browser:browser.version(),checks,errors,humanReviewed:null};
}

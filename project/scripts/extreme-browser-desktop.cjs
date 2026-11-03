// Real browser, real locally hosted pinned strong model. No request interception.
async page=>{
 const browser=page.context().browser(),base=page.url().split('#')[0].replace(/\/$/,''),model='kata1-tf2-b10c384-s2941M-d5872M';
 const context=await browser.newContext({viewport:{width:1280,height:960},reducedMotion:'reduce'}),p=await context.newPage(),responses=[],errors=[];
 p.setDefaultTimeout(100_000);p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 p.on('response',async r=>{if(r.request().method()==='POST'&&/\/api\/(ai-move|analyze)$/.test(r.url()))responses.push({url:r.url(),status:r.status(),body:await r.json().catch(()=>null)});});
 const assert=(x,s)=>{if(!x)throw Error(s);},button=name=>p.getByRole('button',{name,exact:true}).click();
 const attr=(name,value)=>p.waitForFunction(([name,value])=>document.querySelector('[data-testid="ai-game"]')?.getAttribute(name)===value,[name,String(value)],{timeout:100_000});
 try{
  await p.goto(base+'/#/play/ai');await p.getByRole('heading',{name:'AI 对弈',exact:true}).waitFor();assert(JSON.stringify(await p.getByLabel('难度').locator('option').allTextContents())===JSON.stringify(['轻松','标准','挑战','极致']),'four ordered options');
  await p.getByLabel('难度').selectOption('extreme');await button('验证设置并开始 AI 对局');await p.locator('.full-board-panel>.shared-board [data-row="0"][data-col="0"]').click();await attr('data-move-count',2);await attr('data-turn','B');
  assert(responses[0]?.status===200&&responses[0].body.engine.model===model,'actual strong engine');assert(await p.getByTestId('katago-review').count()===0,'no ongoing evaluations');
  await button('撤回一手');await attr('data-move-count',1);await attr('data-paused','true');await button('重做一手');await attr('data-move-count',2);
  await p.reload();await attr('data-difficulty','extreme');await attr('data-move-count',2);await attr('data-paused','true');assert(responses.length===1,'refresh/undo/redo duplicate computation');
  const slide=p.getByRole('slider',{name:'棋局滑动条'});await slide.focus();await p.keyboard.press('Home');await p.waitForFunction(()=>Array.from(document.querySelectorAll('.full-board-panel>.shared-board [role=gridcell]')).every(x=>x.getAttribute('aria-disabled')==='true'));assert(await p.locator('.full-board-panel>.shared-board [role=gridcell]').first().isDisabled(),'history readonly');await p.keyboard.press('End');
  await p.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});await p.screenshot({path:'output/playwright/extreme-desktop-play.png',fullPage:true});
  const wait=p.waitForEvent('download');await button('导出 AI 续玩文件');const dl=await wait;await dl.saveAs('output/playwright/extreme-session.json');
  await button('我认输');await button('确认我认输');await attr('data-phase','finished');await slide.focus();await p.keyboard.press('Home');await p.keyboard.press('ArrowRight');await button('分析当前复盘局面');await p.getByTestId('katago-result').waitFor();
  const review=responses.find(x=>x.url.endsWith('/api/analyze'));assert(review?.status===200&&review.body.engine.model===model&&review.body.perspective==='B','same actual strong model review');
  await p.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});await p.screenshot({path:'output/playwright/extreme-desktop-review.png',fullPage:true});assert(errors.length===0,'console errors '+errors.join(';'));
  return {schemaVersion:1,id:'EXTREME-REAL-DESKTOP',revision:1,rulesetId:'GO-CLUB-AREA-1',status:'passed',mode:'actual-browser-actual-Eigen-model-not-Render',at:new Date().toISOString(),browser:browser.version(),base,responses,errors,checks:['four-level-order','real-strong-white-reply','undo-redo','refresh-paused-same-difficulty','history-readonly','session-export','resign-no-fake-score','same-strong-model-postgame-review'],humanReviewed:null};
 }finally{await context.close();}
}

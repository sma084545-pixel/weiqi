// Run with playwright-cli -s=weiqi-ai run-code --filename scripts/ai-browser-journey.cjs
// Explicit transport doubles exercise cancellation/error boundaries. Genuine engine tests are separate.
async page => {
  const base=page.url().split('#')[0].replace(/\/$/,''),browser=page.context().browser(),report=[];
  for(const c of browser.contexts())if(c!==page.context())await c.close();
  const assert=(v,message)=>{if(!v)throw Error(message);};
  const fresh=async(width=1280,touch=false)=>{
    const c=await browser.newContext({viewport:{width,height:950},hasTouch:touch,reducedMotion:'reduce'}),p=await c.newPage(),plans=[],requests=[],errors=[];
    p.on('pageerror',e=>errors.push(e.message));
    await p.route('**/api/ai-move',async route=>{
      const req=route.request().postDataJSON(),plan=plans.shift()??{move:{type:'pass'}};requests.push(req);
      if(plan.delay)await new Promise(r=>setTimeout(r,plan.delay));
      const body=plan.error?{error:{code:plan.error,message:'Explicit developer transport fixture'}}:{schemaVersion:1,requestId:'dev-'+requests.length,positionId:plan.stale?'old-position':req.positionId,aiColor:req.aiColor,difficulty:req.difficulty,move:plan.move??{type:'pass'},engine:{name:'KataGo',version:'1.18.1',backend:'Eigen CPU',model:'DEV-TEST-DOUBLE-NOT-REAL-INFERENCE',maxVisits:({relaxed:8,standard:24,challenge:64})[req.difficulty]},visits:8,elapsedMs:100};
      try{await route.fulfill({status:plan.error?(plan.error==='BUSY'?503:502):200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':new URL(base).origin},body:JSON.stringify(body)});}catch{/* Canceled requests intentionally discard the fixture reply. */}
    });
    await p.goto(base+'/#/play/ai');await p.getByRole('heading',{name:'AI 对弈',exact:true}).waitFor();
    const app=p.getByTestId('ai-game'),cell=(r,c)=>p.locator('.full-board-panel>figure [data-row="'+r+'"][data-col="'+c+'"]');
    const attr=async(name,value)=>{await p.waitForFunction(([name,value])=>document.querySelector('[data-testid="ai-game"]')?.getAttribute(name)===value,[name,String(value)]);};
    const click=name=>p.getByRole('button',{name,exact:true}).click();
    const start=()=>click('验证设置并开始 AI 对局');
    const close=async()=>{assert(errors.length===0,'runtime error '+errors.join(';'));await c.close();};
    return {c,p,plans,requests,app,cell,attr,click,start,close};
  };
  {
    const t=await fresh(),{p,plans,cell,attr,click,app}=t;
    await t.start();assert(await p.getByTestId('katago-review').count()===0,'ongoing game must hide evaluations');
    plans.push({move:{type:'place',at:{row:8,col:8}}});await cell(0,0).click();await attr('data-move-count',2);await attr('data-turn','B');
    assert(await cell(8,8).getAttribute('data-stone')==='W','AI white move correctly positioned');
    await p.getByRole('slider',{name:'棋局滑动条'}).focus();await p.keyboard.press('Home');
    assert(await app.getAttribute('data-move-count')==='2','history is read-only');assert(await cell(0,0).getAttribute('data-stone')==='empty','initial history board');
    await p.keyboard.press('End');await click('撤回一手');await attr('data-move-count',1);await attr('data-paused','true');
    assert(await cell(8,8).getAttribute('data-stone')==='empty','single undo removes AI move');
    await click('重做一手');await attr('data-move-count',2);await click('撤回最近回合');await attr('data-move-count',0);
    await click('重做最近回合');await attr('data-move-count',2);await click('撤回最近回合');await attr('data-move-count',0);
    plans.push({move:{type:'pass'}});await cell(2,2).click();await attr('data-move-count',2);
    assert(await p.getByRole('button',{name:'重做一手',exact:true}).isDisabled(),'new branch truncates old redo');assert(await cell(0,0).getAttribute('data-stone')==='empty','old branch absent');
    const saved=p.waitForEvent('download');await click('导出 AI 续玩文件');const download=await saved;await download.saveAs('output/playwright/ai-session-roundtrip.json');
    const sgf=p.waitForEvent('download');await click('导出 SGF 主线');await (await sgf).saveAs('output/playwright/ai-game-export.sgf');
    await p.reload();await attr('data-move-count',2);await attr('data-paused','true');assert(await cell(2,2).getAttribute('data-stone')==='B','refresh restores saved game');
    await p.getByLabel('选择 AI 续玩 JSON').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{')});
    await p.getByText(/未通过版本、设置或规则重放校验/).waitFor();await attr('data-move-count',2);
    await p.getByLabel('选择 AI 续玩 JSON').setInputFiles('output/playwright/ai-session-roundtrip.json');await p.getByRole('dialog',{name:'导入 AI 续玩文件'}).waitFor();await click('确认替换当前棋局');await attr('data-move-count',2);
    await click('我认输');await click('确认我认输');await attr('data-phase','finished');await p.getByText(/本局以认输结束，不编造面积分/).waitFor();await p.getByTestId('katago-review').waitFor();
    await click('撤回最近回合');await attr('data-phase','playing');await attr('data-move-count',2);
    await p.screenshot({path:'output/playwright/ai-desktop-controls.png',fullPage:true});
    report.push({name:'turns-undo-redo-slider-branch-refresh-import-export-resign-review-gate',status:'passed',requests:t.requests.length});await t.close();
  }
  {
    const t=await fresh(),{p,plans,cell,attr,click,requests}=t;await t.start();
    plans.push({delay:1200,move:{type:'place',at:{row:8,col:8}}});
    await cell(0,0).evaluate(el=>{el.click();el.click();});await attr('data-move-count',1);await p.getByTestId('ai-status').waitFor();
    await p.waitForFunction(()=>document.querySelector('[data-testid="ai-status"]')?.getAttribute('data-state')==='loading');
    assert(await p.getByRole('button',{name:'停一手',exact:true}).isDisabled(),'human cannot move twice');await click('撤回一手');await attr('data-move-count',0);await p.waitForTimeout(1400);await attr('data-move-count',0);assert(requests.length===1,'one gesture schedules only one request');
    plans.push({error:'BUSY'});await cell(1,1).click();await p.getByText('AI 服务正在忙。棋局保持不变，可稍后重试。').waitFor();await attr('data-turn','W');await attr('data-move-count',1);
    const n=requests.length;await p.waitForTimeout(500);assert(requests.length===n,'no automatic retry storm');
    plans.push({stale:true,move:{type:'pass'}});await click('继续 / 重试 AI 落子');await p.getByText(/AI 返回的着法未通过本局校验/).waitFor();await attr('data-move-count',1);
    plans.push({delay:1000,move:{type:'pass'}});await click('继续 / 重试 AI 落子');await p.waitForTimeout(250);await p.getByRole('link',{name:'学习路线',exact:true}).click();await p.waitForTimeout(1200);await p.getByRole('link',{name:'AI 对弈',exact:true}).click();await attr('data-move-count',1);await attr('data-paused','true');
    plans.push({move:{type:'pass'}});await click('继续 / 重试 AI 落子');await attr('data-move-count',2);await attr('data-turn','B');
    report.push({name:'rapid-double-click-cancel-undo-busy-stale-route-return-explicit-retry',status:'passed',requests:requests.length});await t.close();
  }
  {
    const t=await fresh(),{p,plans,attr,click,cell}=t;
    await p.getByLabel('选择 AI 续玩 JSON').setInputFiles('tests/ai-game/fixtures/forced-pass.json');await click('确认替换当前棋局');
    plans.push({move:{type:'pass'}});await click('继续 / 重试 AI 落子');await attr('data-move-count',1);await click('停一手');await attr('data-phase','scoring');
    await click('已核对黑方清单');await cell(0,0).click();assert(await p.getByRole('button',{name:'已核对黑方清单',exact:true}).count()===1,'mark edit clears prior confirmation');
    await cell(0,0).click();await click('已核对黑方清单');await p.reload();await attr('data-phase','scoring');await p.getByRole('button',{name:'已核对白方同一清单并计分',exact:true}).waitFor();
    await click('有争议，恢复原盘面');await attr('data-phase','playing');assert(await p.locator('.full-board-panel>figure [data-stone=B]').count()===23,'dispute must preserve original stones');
    plans.push({move:{type:'pass'}});await click('继续 / 重试 AI 落子');await attr('data-turn','B');await click('停一手');await attr('data-phase','scoring');
    await click('已核对黑方清单');await click('已核对白方同一清单并计分');await attr('data-phase','finished');
    await p.getByRole('heading',{name:'你获得本局胜利'}).waitFor();await p.getByRole('region',{name:'最终面积计分',exact:true}).waitFor();
    const totals=await p.locator('.score-grid>div').allTextContents();assert(totals.includes('黑活子23')&&totals.includes('黑方围空2')&&totals.includes('黑方总分25')&&totals.includes('白方总分0'),'hand-computed area components');
    await p.screenshot({path:'output/playwright/ai-confirmed-result.png',fullPage:true});
    report.push({name:'two-pass-dead-group-confirm-reset-refresh-dispute-original-board-manual-score',status:'passed',fixedExpected:'23 black stones + 2 black empty points = 25, white 0, komi 0'});await t.close();
  }
  for(const [width,size,level,human] of [[360,5,'relaxed','B'],[768,13,'standard','W'],[1280,19,'challenge','B']]){
    const t=await fresh(width,true),{p,plans,cell,attr,click}=t;
    await p.getByLabel('棋盘尺寸').selectOption(String(size));await p.getByLabel('难度').selectOption(level);
    if(human==='W'){await p.getByRole('radio',{name:'白方（AI 先行）'}).check();plans.push({move:{type:'place',at:{row:0,col:0}}});}
    await t.start();if(human==='W'){await attr('data-move-count',1);await attr('data-turn','W');}else await attr('data-move-count',0);
    if(size===5)assert(await p.locator('.full-board-panel>.shared-board .board-grid').evaluate(el=>el.getBoundingClientRect().right<=el.closest('.board-viewport').getBoundingClientRect().right),'small full board fits without clipping corner');
    await click('悬浮小棋盘');const mini=p.getByRole('complementary',{name:'悬浮小棋盘'});await mini.waitFor();
    const geometry=await mini.locator('.board-grid').evaluate((el,size)=>{const rect=el.getBoundingClientRect(),panel=el.closest('.floating-board').getBoundingClientRect();return {count:el.querySelectorAll('[data-row][data-col]').length,visible:rect.left>=0&&rect.top>=0&&rect.right<=innerWidth+.5&&rect.bottom<=innerHeight+.5&&rect.bottom<=panel.bottom};},size);
    assert(geometry.count===size*size&&geometry.visible,'entire floating '+size+' board must fit at '+width);
    plans.push({move:{type:'pass'}});const target=mini.locator('[data-row="'+(size-1)+'"][data-col="'+(size-1)+'"]');await target.tap();await attr('data-move-count',human==='W'?3:2);
    await mini.getByRole('button',{name:'关闭悬浮小棋盘'}).click();await click('最大化棋盘');const modal=p.getByRole('dialog',{name:'放大棋盘'});await modal.waitFor();await p.keyboard.press('Escape');assert(await modal.count()===0,'Escape closes max view');
    await p.getByRole('slider',{name:'棋局滑动条'}).focus();await p.keyboard.press('Home');await p.keyboard.press('End');
    assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal page overflow at '+width);
    await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:'output/playwright/ai-'+width+'-'+size+'-touch.png',fullPage:true});
    report.push({name:'responsive-touch-keyboard-reduced-motion-floating-max-'+width,status:'passed',size,difficulty:level,human,geometry});await t.close();
  }
  {
    const t=await fresh(),{p,cell,click,attr}=t;await p.getByRole('radio',{name:'本社团自由放置让子'}).check();await cell(2,2).click();
    await p.getByLabel('棋盘尺寸').selectOption('5');await p.getByRole('dialog',{name:'清除起始黑子后更改设置？'}).waitFor();await click('取消');
    assert(await p.getByLabel('棋盘尺寸').inputValue()==='9','cancel resize preserves board');
    await t.start();await attr('data-move-count',1);await attr('data-turn','B');assert(t.requests[0].game.setup.toPlay==='W','free handicap White first');
    report.push({name:'handicap-validate-size-loss-confirmation-white-first',status:'passed'});await t.close();
  }
  return {schemaVersion:1,id:'AI-PLAY-CLI-JOURNEY',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'DeveloperValidationReport',at:new Date().toISOString(),browser:browser.version(),mode:'actual-browser-explicit-transport-test-doubles',checks:report,humanReviewed:null};
}

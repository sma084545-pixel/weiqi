async (page) => {
 const base='https://sma084545-pixel.github.io/weiqi/',api='https://weiqi-katago.onrender.com';
 const errors=[],network=[],checks=[],consoleErrors=[];
 const assert=(value,message)=>{if(!value)throw Error(message);};
 const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});p.on('response',r=>{if(r.url().startsWith(api))network.push({url:r.url(),status:r.status(),method:r.request().method()});});};
 watch(page);
 await page.goto(base+'#/home');
 if((await page.locator('.app-version').innerText())!=='版本 0.22.0'){
   await page.goto(base+'#/teacher/offline-data');await page.getByRole('button',{name:'检查应用更新',exact:true}).click();
   const apply=page.getByRole('button',{name:'保存已提交内容并应用',exact:true});
   await apply.waitFor({timeout:60000});await apply.click();
 }
 await page.getByText('版本 0.22.0',{exact:true}).waitFor({timeout:60000});checks.push('original GitHub Pages shows0.22.0; existing cache applied without clearing data');
 await page.goto(base+'#/route/STAGE-05');assert(await page.getByRole('button',{name:'还想练习',exact:true}).getAttribute('aria-pressed')==='true','synthetic progress lost during upgrade');checks.push('self-marked development progress survives old0.21.3 to0.22.0 cache upgrade');
 await page.getByRole('navigation',{name:'主要导航'}).getByRole('link',{name:'双人对弈',exact:true}).click();
 await page.getByLabel('棋盘尺寸').selectOption('9');await page.getByLabel('白方贴目').fill('6.5');await page.getByRole('button',{name:'验证设置并开始对局'}).click();
 assert(await page.getByTestId('katago-review').count()===0,'analysis exposed during game');
 for(const [row,col] of [[6,2],[2,6],[6,6],[2,2]])await page.locator(`[data-row="${row}"][data-col="${col}"]`).click();
 await page.getByRole('button',{name:'停一手',exact:true}).click();await page.getByRole('button',{name:'停一手',exact:true}).click();
 assert(await page.getByTestId('katago-review').count()===0,'analysis exposed during scoring confirmation');
 await page.getByRole('button',{name:'黑方确认当前死子与中立点'}).click();await page.getByRole('button',{name:'白方确认同一份清单'}).click();
 await page.getByRole('slider',{name:'棋局滑动条'}).fill('3');
 const analyze=async p=>{
   const begin=Date.now();const reply=p.waitForResponse(r=>r.url()===api+'/api/analyze'&&r.request().method()==='POST',{timeout:110000});
   await p.getByRole('button',{name:'分析当前复盘局面',exact:true}).click();const response=await reply;const json=await response.json();
   assert(response.status()===200,JSON.stringify(json));assert(json.engine.name==='KataGo'&&json.engine.version==='1.18.1','wrong engine');
   assert(json.positionId&&json.perspective==='B'&&json.visits>0,'incomplete real analysis');
   await p.getByTestId('katago-result').waitFor();
   const candidate=json.candidates.find(c=>c.move.type==='place');
   if(candidate){const {row,col}=candidate.move.at;assert(await p.locator(`[data-row="${row}"][data-col="${col}"] [data-marker-kind="sequence"]`).count()>0,'candidate marker at wrong point');}
   await p.getByRole('list',{name:'KataGo 候选变化'}).locator('summary').first().click();
   return {httpStatus:response.status(),httpMs:Date.now()-begin,request:response.request().postDataJSON(),result:json};
 };
 const desktop=await analyze(page);assert(desktop.result.toPlay==='W','historical white turn lost');assert(desktop.request.game.komi===6.5&&desktop.request.reviewIndex===3,'komi/history mismatched');
 checks.push('real GitHubOrigin→Render POST200;9x9 komi6.5; completed-game historical white turn; black perspective; candidate marker/PV');
 await page.evaluate(()=>{scrollTo(0,0);if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});await page.screenshot({path:'docs/katago/checks/public-desktop-real.png',fullPage:true});
 await page.getByRole('slider',{name:'棋局滑动条'}).fill('2');assert(await page.getByTestId('katago-result').count()===0,'stale result retained');
 await page.reload();await page.getByTestId('katago-review').waitFor();checks.push('switching review clears result; refresh restores completed game');
 // Separate context only contains identified development play; no real member records.
 const context=await page.context().browser().newContext({viewport:{width:360,height:900},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 const mobile=await context.newPage();watch(mobile);await mobile.goto(base+'#/play/free');await mobile.getByText('版本 0.22.0',{exact:true}).waitFor({timeout:60000});
 await mobile.getByLabel('棋盘尺寸').selectOption('5');await mobile.getByRole('button',{name:'验证设置并开始对局'}).tap();
 await mobile.locator('[data-row="0"][data-col="0"]').tap();await mobile.getByRole('button',{name:'认输',exact:true}).tap();await mobile.getByRole('button',{name:'确认认输',exact:true}).tap();
 await mobile.getByRole('slider',{name:'棋局滑动条'}).fill('1');const touch=await analyze(mobile);
 assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile page overflows');
 await mobile.evaluate(()=>{scrollTo(0,0);if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});await mobile.screenshot({path:'docs/katago/checks/public-mobile-real.png',fullPage:true});
 checks.push('360px touch/reduced-motion;5x5 finished by resignation; actual Render analysis; no page overflow');
 await mobile.goto(base+'#/teacher/offline-data');await mobile.getByRole('heading',{name:'已可离线',exact:true}).waitFor({timeout:30000});await mobile.goto(base+'#/play/free');
 await context.setOffline(true);await mobile.reload();await mobile.getByRole('heading',{name:'自由双人对弈',exact:true}).waitFor();await mobile.getByTestId('katago-review').waitFor();
 checks.push('network disabled: completed game and review restore; online analysis is optional');await context.setOffline(false);await context.close();
 assert(errors.length===0,JSON.stringify(errors));
 return {schemaVersion:1,id:'KATAGO-PUBLIC-JOURNEY',revision:1,rulesetId:'GO-CLUB-AREA-1',resultVersion:'0.22.0-pages.1',status:'passed',actualPublicUrl:base,actualServiceUrl:api,browser:page.context().browser().version(),checkedAt:new Date().toISOString(),realEngine:true,mockResponses:false,physicalDevices:false,humanReviewed:null,checks,desktop,touch,network,pageErrors:errors,consoleErrors};
}

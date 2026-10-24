async (page) => {
 const data=__ADVANCED_TEST_DATA__,base=data.base;
 const browser=page.context().browser(),context=await browser.newContext({viewport:{width:1280,height:900}}),p=await context.newPage();
 const errors=[],consoleErrors=[],checks=[],sceneRuns=[],network=[];
 const assert=(v,m)=>{if(!v)throw Error(m);};
 const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});p.on('request',r=>{if(r.url().includes('/api/analyze'))network.push(r.url());});};
 watch(p);
 await p.addInitScript(({legacyGame})=>{
  localStorage.setItem('go-club:learning-progress:v1',JSON.stringify({schemaVersion:1,id:'LOCAL-LEARNING-PROGRESS',revision:2,rulesetId:'GO-CLUB-AREA-1',visitedModuleIds:['stage-05-guide'],stageMarks:{'STAGE-05':'practice'},recentModuleId:'stage-05-guide'}));
  localStorage.setItem('go-club:v1:LOCAL-T08-FULL-GAME',JSON.stringify(legacyGame));
 },{legacyGame:data.legacyGame});
 const nav=()=>p.getByRole('navigation',{name:'本课环节'});
 const goto=async n=>{await p.goto(base+'#/route/STAGE-'+String(n).padStart(2,'0'));await p.locator(`[data-lesson-number="${n}"]`).waitFor();};
 const practice=async n=>{await goto(n);await nav().getByRole('button',{name:/Try It Yourself/}).click();};
 const chooseScene=async id=>{const s=data.scenes.find(s=>s.id===id);await p.locator(`[data-scene-nav="${id}"]`).click();await p.locator(`[data-scene-id="${id}"]`).waitFor();return s;};
 const cell=(row,col)=>p.locator(`.adv-exercise .board-grid [data-row="${row}"][data-col="${col}"]`).first();
 const read=async key=>p.evaluate(async key=>{
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('go-club-local');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const row=await new Promise((resolve,reject)=>{const r=db.transaction('records','readonly').objectStore('records').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});db.close();return row?JSON.parse(row.value):null;
 },key);
 const shot=async(name,q=p)=>{await q.evaluate(()=>{scrollTo(0,0);if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});await q.screenshot({path:'output/playwright/'+name,fullPage:true});};
 try{
  await p.goto(base+'#/route');await p.getByRole('heading',{name:'十二课学习路线',exact:true}).waitFor();
  assert(await p.locator('[data-stage-id]').count()===12,'not 12 stages');
  const order=await p.locator('[data-stage-id]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-stage-id')));assert(order.join(',')===Array.from({length:12},(_,i)=>'STAGE-'+String(i+1).padStart(2,'0')).join(','),'stage order');
  await p.getByRole('heading',{name:'进阶篇 · 从“会下”到“会判断”',exact:true}).waitFor();
  checks.push('twelve consecutive stages, actual divider, no unlock gate');
  await shot('advanced-route-1280.png');
  for(const lesson of data.lessons){
   await goto(lesson.number);assert(await p.locator('h1').innerText()===lesson.title,'lesson title');
   for(const concept of lesson.concepts){await nav().getByRole('button').filter({hasText:concept.title}).click();await p.getByRole('heading',{level:2,name:concept.title,exact:true}).waitFor();assert(await p.locator('.adv-concept [data-board-size]').count()===1,'concept board missing');}
   for(let i=0;i<lesson.guidedSceneIds.length;i++){
    await nav().getByRole('button').filter({hasText:'Guided Example '+(i+1)}).click();
    const guide=p.locator('.adv-guided');await guide.getByRole('button',{name:'下一步',exact:true}).click();await guide.getByRole('button',{name:'直接完成',exact:true}).click();
    await guide.locator('.adv-line-outcome').waitFor();
   }
   await nav().getByRole('button',{name:/Try It Yourself/}).click();
   for(const id of lesson.sceneIds){
    const s=await chooseScene(id);const exercise=p.locator(`[data-scene-id="${id}"]`);
    assert(await exercise.locator('.adv-feedback').count()===0,'answer carried to new scene '+id);
    assert(!/humanReviewed|schemaVersion|handCalculation/.test(await exercise.innerText()),'internal validation leaked');
    if(['choice','compare'].includes(s.interaction))await exercise.locator('.adv-options label').filter({hasText:s.positive.label}).click();
    if(['point','group'].includes(s.interaction))await cell(s.positive.at.row,s.positive.at.col).click();
    if(s.interaction==='points')for(const at of s.points)await cell(at.row,at.col).click();
    if(s.interaction==='sequence')for(const m of s.line.moves)await cell(m.at.row,m.at.col).click();
    await exercise.getByRole('button',{name:'验证本题',exact:true}).click();await exercise.locator('[data-verdict="success"]').waitFor();
    sceneRuns.push({id,interaction:s.interaction,passed:true});
   }
   await nav().getByRole('button',{name:/Lesson Summary/}).click();await p.getByRole('button',{name:'我会了',exact:true}).click();
   assert(await p.getByRole('button',{name:'我会了',exact:true}).getAttribute('aria-pressed')==='true','self mark failed');
  }
  checks.push('all 37 exercises across six lessons completed through actual UI; concept and guided boards available; marks are self chosen');
  await practice(7);await chooseScene('ADV-07-03');await cell(2,2).click();await p.getByRole('button',{name:'验证本题',exact:true}).click();await p.locator('[data-verdict="suboptimal"]').waitFor();assert((await p.locator('.adv-feedback').innerText()).includes('7气'),'suboptimal reason missing');
  await cell(4,4).click();await p.getByRole('button',{name:'验证本题',exact:true}).click();await p.locator('[data-verdict="unknown"]').waitFor();
  await cell(1,1).click();const stones=await p.locator('.adv-exercise .stone').count();await p.getByRole('button',{name:'验证本题',exact:true}).click();await p.locator('[data-verdict="illegal"]').waitFor();assert(await p.locator('.adv-exercise .stone').count()===stones,'illegal altered board');
  await p.getByRole('button',{name:'隐藏答案并重试',exact:true}).click();assert(await p.locator('.adv-feedback').count()===0,'retry leaked feedback');
  await p.getByRole('button',{name:'提示 1：观察什么',exact:true}).click();await p.getByRole('button',{name:'提示 2：考虑关系',exact:true}).click();await p.getByRole('button',{name:'提示 3：关键步骤',exact:true}).click();assert(await p.locator('.adv-hints li').count()===3,'hint count');
  await p.getByRole('button',{name:'隐藏答案并重试',exact:true}).click();assert(await p.locator('.adv-hints li').count()===0,'retry leaked hint');
  checks.push('suboptimal explanation, uncovered legal unknown, occupied illegal unchanged, three hints and fresh retry');
  await practice(9);await chooseScene('ADV-09-04');await p.getByRole('button',{name:'隐藏答案并重试',exact:true}).click();await cell(1,1).click();await p.getByRole('button',{name:'验证本题',exact:true}).click();await p.locator('[data-verdict="failure"]').waitFor();assert((await p.locator('.adv-feedback').innerText()).includes('漏选 1 点，误选 1 点'),'point-set differences incorrect');
  await p.getByRole('button',{name:'隐藏答案并重试',exact:true}).click();assert(await p.locator('.adv-exercise .marker-group').count()===0,'point-set retry kept points');
  checks.push('point set missing/extra explained and reset');
  await practice(8);await chooseScene('ADV-08-04');await p.getByRole('button',{name:'隐藏答案并重试',exact:true}).click();
  for(const at of [[0,1],[1,1],[0,1]])await cell(...at).click();
  assert(await p.locator('.adv-exercise [data-stone="W"]').count()===1,'snapback final white count');
  await p.getByRole('button',{name:'撤回这一手',exact:true}).click();assert(await p.locator('.adv-exercise [data-stone="W"]').count()===4,'sequence undo');
  await p.getByRole('button',{name:'验证本题',exact:true}).click();await p.locator('[data-verdict="incomplete"]').waitFor();
  await cell(0,1).click();await p.getByRole('button',{name:'验证本题',exact:true}).click();await p.getByRole('button',{name:'查看已核查变化与反驳',exact:true}).click();
  await p.locator('.adv-guided').getByRole('button',{name:'播放演示',exact:true}).click();await p.evaluate(()=>location.hash='#/route/STAGE-09');await p.locator('[data-lesson-number="9"]').waitFor();await p.waitForTimeout(1200);assert(await p.locator('.adv-guided').count()===0,'old playback leaked');
  checks.push('three-ply snapback, undo, verified branches and route-change playback cancellation');
  await goto(12);await nav().getByRole('button',{name:/13路综合实战/}).click();await p.getByRole('button',{name:'开始13路引导实战',exact:true}).click();await p.getByRole('button',{name:'根据观察，继续对弈',exact:true}).click();
  const game=p.getByTestId('guided-13-game');const gc=(r,c)=>game.locator(`.board-grid [data-row="${r}"][data-col="${c}"]`);
  const intersectionStyle=await gc(0,0).evaluate(el=>({background:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderWidth,padding:getComputedStyle(el).padding}));assert(intersectionStyle.background==='rgba(0, 0, 0, 0)'&&intersectionStyle.border==='0px'&&intersectionStyle.padding==='0px','control button styles leaked into board intersections');
  await gc(3,3).click();await game.locator('[data-row="9"][data-col="3"]').click({force:true});
  await game.locator('.adv-turn').filter({hasText:'轮到你'}).waitFor();assert(await game.getByRole('slider',{name:'棋局滑动条'}).getAttribute('max')==='2','double click/white turn created extra move');
  await gc(9,3).click();await nav().getByRole('button',{name:/Try It Yourself/}).click();await p.waitForTimeout(800);
  let saved=await read('go-club:full-game:guided13:v1');assert(saved.game.moves.length===3,'bot ran after lesson pane unmount');
  await nav().getByRole('button',{name:/13路综合实战/}).click();await game.locator('.adv-turn').filter({hasText:'轮到你'}).waitFor();assert(await game.getByRole('slider',{name:'棋局滑动条'}).getAttribute('max')==='4','bot resume duplicated move');
  await game.getByRole('button',{name:'撤回最近回合',exact:true}).click();assert(await game.getByRole('slider',{name:'棋局滑动条'}).getAttribute('max')==='2','round undo incorrect');
  await game.getByRole('slider',{name:'棋局滑动条'}).fill('0');assert(await gc(0,0).getAttribute('aria-disabled')==='true','history editable');await game.getByRole('button',{name:'返回当前局面继续',exact:true}).click();
  await shot('advanced-guided13-1280.png');
  await game.getByRole('button',{name:'停一手，邀请共同收尾',exact:true}).click();await game.locator('[data-phase="scoring"]').count();await p.waitForFunction(()=>document.querySelector('[data-testid="guided-13-game"]')?.getAttribute('data-phase')==='scoring');
  await gc(3,3).click();await game.getByRole('button',{name:'已核对黑方清单',exact:true}).click();await p.reload();await p.getByTestId('guided-13-game').waitFor();await p.getByRole('button',{name:'已核对白方同一清单并计分',exact:true}).waitFor();assert(await p.getByTestId('guided-13-game').locator('[data-row="3"][data-col="3"] .marker-target').count()===1,'pending dead mark lost on refresh');
  await gc(3,3).click();await game.getByRole('button',{name:'已核对黑方清单',exact:true}).waitFor();await game.getByRole('button',{name:'有争议，恢复原盘面对弈',exact:true}).click();
  saved=await read('go-club:full-game:guided13:v1');assert(saved.game.board[3][3]==='B'&&saved.game.consecutivePasses===0&&saved.game.history.layouts.length===3,'dispute lost board/history');
  await game.getByRole('button',{name:'停一手，邀请共同收尾',exact:true}).click();await p.waitForFunction(()=>document.querySelector('[data-testid="guided-13-game"]')?.getAttribute('data-phase')==='scoring');
  await game.getByRole('button',{name:'已核对黑方清单',exact:true}).click();await game.getByRole('button',{name:'已核对白方同一清单并计分',exact:true}).click();await p.getByText('已完成一盘13路练习',{exact:true}).waitFor();assert((await game.locator('.score-details').innerText()).includes('和棋'),'two-stone hand score should be draw');
  await nav().getByRole('button',{name:/Lesson Summary/}).click();await p.getByText('本设备已完成过一盘13路引导实战，可回看或再来一盘。',{exact:true}).waitFor();
  checks.push('real complete 13-road rule bot: turn locks, cancellation, undo, slider read-only, scoring-draft refresh, disagreement history, confirmed draw');
  await p.goto(base+'#/play/free');await p.getByRole('heading',{name:'自由双人对弈',exact:true}).waitFor();assert(await p.locator('.full-game-page').getAttribute('data-move-count')==='2','legacy saved game was overwritten');assert(await p.locator('[data-row="2"][data-col="2"]').getAttribute('data-stone')==='B','legacy stone changed');assert(await p.getByTestId('katago-review').count()===0,'KataGo exposed during play');
  const progress=await read('go-club:learning-progress:v1');assert(progress.stageMarks['STAGE-05']==='practice','legacy course mark lost');assert(progress.advancedLessons['STAGE-12@1'].guidedGameFinished===true,'guided completion not saved');
  checks.push('old course5 progress and independent T08 game preserved; KataGo remains postgame-only');
  if(data.withOffline){
   await p.goto(base+'#/teacher/offline-data');await p.getByRole('heading',{name:'已可离线',exact:true}).waitFor({timeout:30000});
   await p.goto(base+'#/route/STAGE-09');await p.locator('[data-lesson-number="9"]').waitFor();await nav().getByRole('button',{name:/Try It Yourself/}).click();await chooseScene('ADV-09-04');await p.getByRole('button',{name:'隐藏答案并重试',exact:true}).click();
   await context.setOffline(true);await p.reload();await p.locator('[data-scene-id="ADV-09-04"]').waitFor();await cell(2,2).click();await p.getByRole('button',{name:'验证本题',exact:true}).click();await p.locator('[data-verdict="success"]').waitFor();
   await p.evaluate(()=>location.hash='#/route/STAGE-12');await p.locator('[data-lesson-number="12"]').waitFor();await nav().getByRole('button',{name:/13路综合实战/}).click();await p.getByRole('button',{name:'另开一局',exact:true}).click();await p.getByRole('button',{name:'确认重开',exact:true}).click();await p.getByRole('button',{name:'这次先继续下棋',exact:true}).click();await p.getByTestId('guided-13-game').locator('[data-row="3"][data-col="3"]').click();await p.getByTestId('guided-13-game').locator('.adv-turn').filter({hasText:'轮到你'}).waitFor();
   assert(await p.getByTestId('guided-13-game').getByRole('slider',{name:'棋局滑动条'}).getAttribute('max')==='2','offline bot failed');
   await shot('advanced-offline-game.png');await context.setOffline(false);checks.push('actual browser network disabled: refresh restores answer screen, grading/save and 13-road bot continue without any cloud request');
  }
  const mobileContext=await browser.newContext({viewport:{width:360,height:900},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),m=await mobileContext.newPage();watch(m);
  await m.goto(base+'#/route/STAGE-09');await m.locator('[data-lesson-number="9"]').waitFor();await m.getByRole('navigation',{name:'本课环节'}).getByRole('button',{name:/Try It Yourself/}).tap();await m.locator('.adv-practice-picker button').filter({hasText:'寻找公气'}).tap();await m.locator('.adv-exercise [data-row="2"][data-col="2"]').tap();await m.getByRole('button',{name:'验证本题',exact:true}).tap();await m.locator('[data-verdict="success"]').waitFor();
  await m.getByRole('button',{name:'核对气：黑独有／白独有／公气',exact:true}).tap();assert(await m.locator('[data-marker-text="公"]').count()===1,'shared liberty ring not distinguished');assert(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overflow');await shot('advanced-shared-360.png',m);
  await m.goto(base+'#/route/STAGE-10');await m.locator('[data-lesson-number="10"]').waitFor();await m.getByRole('navigation',{name:'本课环节'}).getByRole('button',{name:/Try It Yourself/}).tap();await m.locator('.adv-exercise [data-row="6"][data-col="6"]').tap();await m.getByRole('button',{name:'验证本题',exact:true}).tap();await m.locator('[data-verdict="success"]').waitFor();await m.getByRole('button',{name:'放大棋盘',exact:true}).tap();await m.getByRole('button',{name:'复位视图',exact:true}).tap();assert(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'13 road mobile overflow');await shot('advanced-groups-360.png',m);
  await m.goto(base+'#/route/STAGE-08');await m.locator('[data-lesson-number="8"]').waitFor();await m.getByRole('navigation',{name:'本课环节'}).getByRole('button').filter({hasText:'Guided Example 1'}).tap();assert(await m.getByLabel('减少动画（播放时直接到终点）').isChecked(),'reduced motion not honoured');await m.locator('.adv-guided').getByRole('button',{name:'播放演示',exact:true}).tap();await m.locator('.adv-line-outcome').waitFor();await shot('advanced-ladder-reduced-360.png',m);
  const tabletContext=await browser.newContext({viewport:{width:768,height:1024}}),t=await tabletContext.newPage();watch(t);await t.goto(base+'#/route/STAGE-09');await t.locator('[data-lesson-number="9"]').waitFor();await t.getByRole('navigation',{name:'本课环节'}).getByRole('button',{name:/Try It Yourself/}).click();await t.locator('.adv-practice-picker button').filter({hasText:'寻找公气'}).click();const first=t.locator('.adv-exercise .board-grid [tabindex="0"]');await first.focus();await t.keyboard.press('ArrowDown');await t.keyboard.press('ArrowDown');await t.keyboard.press('ArrowRight');await t.keyboard.press('ArrowRight');await t.keyboard.press('Space');
  let submitted=false;for(let i=0;i<15;i++){await t.keyboard.press('Tab');if(await t.evaluate(()=>document.activeElement?.textContent==='验证本题')){await t.keyboard.press('Enter');submitted=true;break;}}
  assert(submitted,'keyboard cannot reach submit');await t.locator('[data-verdict="success"]').waitFor();assert(await t.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'tablet overflow');await shot('advanced-keyboard-768.png',t);
  checks.push('360 touch: point set, whole group, 13-road local scrolling/zoom reset, reduced-motion ladder;768 keyboard arrows/Space/Tab/Enter');
  await mobileContext.close();await tabletContext.close();assert(errors.length===0,JSON.stringify(errors));assert(consoleErrors.length===0,JSON.stringify(consoleErrors));assert(network.length===0,'active-play analysis was called');
  return {schemaVersion:1,id:'ADVANCED-REAL-BROWSER-JOURNEY',revision:1,rulesetId:'GO-CLUB-AREA-1',resultVersion:'0.23.0-pages.1',status:'passed',actualUrl:base,browser:browser.version(),mockResponses:false,physicalDevices:false,humanReviewed:null,testData:'explicit isolated synthetic input; not member feedback or real classroom evidence',checks,sceneRuns,pageErrors:errors,consoleErrors,analysisRequests:network.length};
 }catch(error){await p.screenshot({path:'output/playwright/advanced-journey-failure.png',fullPage:true});throw error;}finally{await context.close();}
}

// Playwright CLI browser journey against the configured REAL service; no route mocks.
async page => {
  const browser=page.context().browser(),base=page.url().split('#')[0].replace(/\/$/,''),checks=[];
  const assert=(v,m)=>{if(!v)throw Error(m);};
  const fresh=async(width=1280,touch=false)=>{
    const c=await browser.newContext({viewport:{width,height:950},hasTouch:touch,reducedMotion:'reduce'}),p=await c.newPage(),responses=[],errors=[],requestTimes=new Map();
    p.setDefaultTimeout(100_000);p.on('pageerror',e=>errors.push(e.message));
    p.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
    p.on('request',r=>{if(/\/api\/(ai-move|analyze)$/.test(r.url())&&r.method()==='POST')requestTimes.set(r,Date.now());});
    p.on('response',async r=>{if(/\/api\/(ai-move|analyze)$/.test(r.url())&&r.request().method()==='POST'){const result=await r.json().catch(()=>null);responses.push({url:r.url(),status:r.status(),httpMs:Date.now()-(requestTimes.get(r.request())??Date.now()),result});}});
    await p.goto(base+'/#/play/ai');await p.getByRole('heading',{name:'AI 对弈',exact:true}).waitFor();
    const attr=async(name,value)=>p.waitForFunction(([name,value])=>document.querySelector('[data-testid="ai-game"]')?.getAttribute(name)===value,[name,String(value)],{timeout:100_000});
    const click=name=>p.getByRole('button',{name,exact:true}).click();
    const close=async()=>{assert(errors.length===0,'page error: '+errors.join(';'));await c.close();};
    return {p,c,responses,attr,click,close};
  };
  {
    const t=await fresh(),{p,attr,click,responses}=t;await click('验证设置并开始 AI 对局');
    await p.locator('.full-board-panel>.shared-board [data-row="0"][data-col="0"]').click();await attr('data-move-count',2);await attr('data-turn','B');
    assert(responses[0]?.status===200&&responses[0].result.engine.model==='g170-b6c96-s175395328-d26788732','must use real pinned KataGo model');assert(await p.locator('.full-board-panel>.shared-board [data-stone=W]').count()===1,'real AI placed one white stone');
    assert(await p.getByTestId('katago-review').count()===0,'no ongoing-game evaluation');
    await click('撤回一手');await attr('data-move-count',1);await attr('data-paused','true');await click('重做一手');await attr('data-move-count',2);
    await p.reload();await attr('data-move-count',2);await attr('data-paused','true');assert(responses.length===1,'refresh/undo/redo must not duplicate inference');
    await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:'output/playwright/ai-real-9-full.png',fullPage:true});
    await click('我认输');await click('确认我认输');await attr('data-phase','finished');await p.getByText(/本局以认输结束，不编造面积分/).waitFor();
    await p.getByRole('slider',{name:'棋局滑动条'}).focus();await p.keyboard.press('Home');await p.keyboard.press('ArrowRight');await click('分析当前复盘局面');await p.getByTestId('katago-result').waitFor();
    assert(responses.some(r=>r.url.endsWith('/api/analyze')&&r.status===200),'real completed nine-board review');
    checks.push({name:'real-nine-human-black-ai-white-undo-redo-refresh-resign-postgame-review',status:'passed',responses});await t.close();
  }
  {
    const t=await fresh(360,true),{p,attr,click,responses}=t;await p.getByLabel('棋盘尺寸').selectOption('5');await p.getByLabel('难度').selectOption('relaxed');await p.getByRole('radio',{name:'白方（AI 先行）'}).check();await click('验证设置并开始 AI 对局');await attr('data-move-count',1);await attr('data-turn','W');
    const point=p.locator('.full-board-panel>.shared-board [data-stone=empty]:not([disabled])').first();await point.focus();await p.keyboard.press('Enter');await attr('data-move-count',3);await attr('data-turn','W');
    assert(responses.length===2&&responses.every(r=>r.status===200&&r.result.aiColor==='B'&&r.result.engine.maxVisits===8),'real low budget black opponent');
    assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile overflow');
    await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:'output/playwright/ai-real-360-keyboard.png',fullPage:true});
    checks.push({name:'real-five-white-human-ai-black-keyboard-mobile',status:'passed',responses});await t.close();
  }
  {
    const t=await fresh(),{p,attr,click,responses}=t;await p.getByLabel('选择 AI 续玩 JSON').setInputFiles('tests/ai-game/fixtures/forced-pass.json');await click('确认替换当前棋局');await click('继续 / 重试 AI 落子');await attr('data-move-count',1);assert(responses[0]?.result.move.type==='pass','real forced-pass position');
    await click('停一手');await attr('data-phase','scoring');await click('已核对黑方清单');await click('已核对白方同一清单并计分');await attr('data-phase','finished');
    await p.getByRole('heading',{name:'你获得本局胜利'}).waitFor();assert((await p.locator('.score-grid>div').allTextContents()).includes('黑方总分25'),'independent 25-0 expected area');
    await p.getByRole('slider',{name:'棋局滑动条'}).focus();await p.keyboard.press('Home');await click('分析当前复盘局面');await p.getByTestId('katago-result').waitFor();
    const review=responses.find(r=>r.url.endsWith('/api/analyze'));assert(review?.status===200&&review.result.perspective==='B'&&Number.isFinite(review.result.blackScoreLead),'real postgame review contract');
    await p.screenshot({path:'output/playwright/ai-real-pass-finish-review.png',fullPage:true});
    checks.push({name:'real-forced-pass-manual-confirmation-25-0-postgame-review',status:'passed',responses});await t.close();
  }
  return {schemaVersion:1,id:'AI-PLAY-REAL-BROWSER',revision:2,rulesetId:'GO-CLUB-AREA-1',kind:'DeveloperValidationReport',at:new Date().toISOString(),browser:browser.version(),mode:'real-browser-real-KataGo-no-mocks',base,checks,pageErrors:[],consoleErrors:[],humanReviewed:null};
}

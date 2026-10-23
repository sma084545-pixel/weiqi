import {expect,test,type Page} from '@playwright/test';
import type {ReviewAnalysisRequest,ReviewAnalysisResponse} from '../../src/core/analysis/contract';

// These deterministic network fixtures check UI behavior only. Real KataGo/API evidence is recorded separately.
const cell=(page:Page,row:number,col:number)=>page.locator(`[data-row="${row}"][data-col="${col}"]`);
const ready=async(page:Page)=>{await page.goto('/#/play/free');await page.getByLabel('棋盘尺寸').selectOption('5');await page.getByRole('button',{name:'验证设置并开始对局'}).click();await cell(page,2,2).click();};
const finish=async(page:Page)=>{await page.getByRole('button',{name:'认输',exact:true}).click();await page.getByRole('button',{name:'确认认输'}).click();};
function fixture(request:ReviewAnalysisRequest):ReviewAnalysisResponse{
  let toPlay=request.game.setup.toPlay;for(const event of request.game.events.slice(0,request.reviewIndex))if(event.type==='place'||event.type==='pass')toPlay=toPlay==='B'?'W':'B';
  return {schemaVersion:1,requestId:'TEST-UI-NOT-REAL-ENGINE',positionId:request.positionId,perspective:'B',toPlay,
    blackWinrate:.62,blackScoreLead:-1.5,visits:8,elapsedMs:1250,engine:{name:'KataGo',version:'TEST-UI',model:'TEST-ONLY',backend:'Eigen CPU',maxVisits:8},
    candidates:[{order:0,move:{type:'place',at:{row:0,col:0}},visits:7,blackWinrate:.62,blackScoreLead:-1.5,pv:[{type:'place',at:{row:0,col:0}},{type:'place',at:{row:0,col:1}}]},
      {order:1,move:{type:'pass'},visits:1,blackWinrate:.60,blackScoreLead:-2,pv:[{type:'pass'}]}]};
}
const fulfill=(route:Parameters<Parameters<Page['route']>[1]>[0],body:unknown,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(body)});

test('analysis is available only after ending, is manual, shows black perspective and marks exact points',async({page})=>{
  let calls=0;
  await page.route('**/api/analyze',async route=>{calls++;await fulfill(route,fixture(route.request().postDataJSON()));});
  await ready(page);await expect(page.getByTestId('katago-review')).toHaveCount(0);expect(calls).toBe(0);
  await finish(page);await expect(page.getByTestId('katago-review')).toBeVisible();expect(calls).toBe(0);
  await page.getByRole('button',{name:'分析当前复盘局面'}).click();await expect(page.getByTestId('katago-result')).toContainText('62.0%');
  await expect(page.getByTestId('katago-result')).toContainText('预计白方领先 1.5 目');await expect(cell(page,0,0)).toHaveAttribute('aria-label',/KataGo 候选 1/);
  await page.getByText('查看候选变化',{exact:true}).first().click();await expect(page.locator('.katago-pv').first()).toContainText('1. 白 A5 → 2. 黑 B5');
  await expect(page.locator('.katago-candidates')).toContainText('候选 2 · 停一手');expect(calls).toBe(1);
  await page.getByRole('slider',{name:'棋局滑动条'}).focus();await page.keyboard.press('Home');await expect(page.getByTestId('katago-result')).toHaveCount(0);await expect(cell(page,0,0)).not.toHaveAttribute('aria-label',/KataGo/);
  await page.getByRole('button',{name:'分析当前复盘局面'}).click();await expect(page.getByTestId('katago-result')).toBeVisible();await page.getByText('查看候选变化',{exact:true}).first().click();await expect(page.locator('.katago-pv').first()).toContainText('1. 黑 A5 → 2. 白 B5');
  await page.getByRole('button',{name:'返回当前局面继续'}).click();await page.getByRole('button',{name:'申请悔棋'}).click();await page.getByRole('button',{name:'黑方确认悔棋'}).click();await page.getByRole('button',{name:'白方确认悔棋'}).click();await expect(page.getByTestId('katago-review')).toHaveCount(0);
});

test('double click, jumping and cancelled late result cannot overwrite a new review position',async({page})=>{
  let calls=0,release:(()=>void)|undefined;
  await page.route('**/api/analyze',async route=>{
    calls++;const request=route.request().postDataJSON();
    if(calls===1)await new Promise<void>(resolve=>{release=resolve;});
    try{await fulfill(route,fixture(request));}catch{/* The abandoned fetch can already be closed. */}
  });
  await ready(page);await finish(page);
  await page.getByRole('button',{name:'分析当前复盘局面'}).evaluate((element:HTMLElement)=>{element.click();element.click();});
  await expect.poll(()=>calls).toBe(1);await expect(page.getByRole('button',{name:'分析中…'})).toBeDisabled();
  await page.getByRole('button',{name:'回到开局'}).click();await expect(page.getByTestId('katago-review')).toHaveAttribute('data-state','idle');
  await page.getByRole('button',{name:'分析当前复盘局面'}).click();await expect(page.getByTestId('katago-result')).toBeVisible();
  release?.();await expect(page.getByTestId('katago-review')).toContainText('第 0 步局面');expect(calls).toBe(2);
});

test('starting and busy remain recoverable with a user-triggered retry and navigation works',async({page})=>{
  let calls=0;
  await page.route('**/api/analyze',async route=>{calls++;await fulfill(route,calls<3?{error:{code:calls===1?'NOT_READY':'BUSY',message:'untrusted server message'}}:fixture(route.request().postDataJSON()),calls<3?503:200);});
  await ready(page);await finish(page);await page.getByRole('button',{name:'分析当前复盘局面'}).click();await expect(page.getByTestId('katago-review')).toContainText('引擎仍在启动');
  expect(calls).toBe(1);await page.getByRole('button',{name:'分析当前复盘局面'}).click();await expect(page.getByTestId('katago-review')).toContainText('分析服务正在忙');
  await page.getByRole('button',{name:'分析当前复盘局面'}).click();await expect(page.getByTestId('katago-result')).toBeVisible();
  await page.getByRole('link',{name:'← 返回学习入口'}).click();await expect(page.getByRole('heading',{name:'一起落子，慢慢思考'})).toBeVisible();
});

test('two passes require both confirmations before any analysis can be requested',async({page})=>{
  let calls=0;await page.route('**/api/analyze',async route=>{calls++;await fulfill(route,fixture(route.request().postDataJSON()));});
  await ready(page);await page.getByRole('button',{name:'停一手',exact:true}).click();await page.getByRole('button',{name:'停一手',exact:true}).click();
  await expect(page.getByTestId('katago-review')).toHaveCount(0);await page.getByRole('button',{name:'黑方确认当前死子与中立点'}).click();await expect(page.getByTestId('katago-review')).toHaveCount(0);
  await page.getByRole('button',{name:'白方确认同一份清单'}).click();await expect(page.getByRole('button',{name:'分析当前复盘局面'})).toBeVisible();expect(calls).toBe(0);
});

test('touch can finish and request a review without hover or duplicate submission',async({browser})=>{
  const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:360,height:900}}),page=await context.newPage();
  let calls=0;await page.route('**/api/analyze',async route=>{calls++;await fulfill(route,fixture(route.request().postDataJSON()));});
  await page.goto('/#/play/free');await page.getByLabel('棋盘尺寸').selectOption('5');await page.getByRole('button',{name:'验证设置并开始对局'}).tap();await cell(page,2,2).tap();
  await page.getByRole('button',{name:'认输',exact:true}).tap();await page.getByRole('button',{name:'确认认输'}).tap();await page.getByRole('button',{name:'分析当前复盘局面'}).tap();await expect(page.getByTestId('katago-result')).toBeVisible();expect(calls).toBe(1);await context.close();
});

for(const width of [360,768,1280])test(`${width}px keyboard/manual review remains within viewport with reduced motion`,async({page})=>{
  await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('**/api/analyze',async route=>fulfill(route,fixture(route.request().postDataJSON())));
  await ready(page);await finish(page);const button=page.getByRole('button',{name:'分析当前复盘局面'});await button.focus();await page.keyboard.press('Enter');await expect(page.getByTestId('katago-result')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(()=>{scrollTo(0,0);if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});await page.screenshot({path:`docs/katago/checks/frontend-review-${width}.png`,fullPage:true});
});

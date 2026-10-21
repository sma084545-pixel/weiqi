import {mkdir,readFile} from 'node:fs/promises';
import {expect,test,type Page} from '@playwright/test';

const evidence='output/playwright/t13';
test.beforeAll(async()=>{await mkdir(evidence,{recursive:true});});

async function openFixture(page:Page,id:string){
  await page.getByRole('button',{name:new RegExp('^'+id)}).click();
}
async function acceptTeachingFixture(page:Page){
  await page.getByLabel('可按给定假设试算').check();
  await page.getByRole('button',{name:'提交终局判断'}).click();
  await expect(page.getByText(/可以按本例明确写出的教学假设/)).toBeVisible();
}
async function submitEmptyPrediction(page:Page,id:string){
  await openFixture(page,id);await acceptTeachingFixture(page);
  await page.getByRole('button',{name:'提交区域答案'}).click();
}

test('stage 3 and teacher view expose the installed T13 route',async({page})=>{
  await page.goto('/#/route/STAGE-03');
  await expect(page.getByText(/围地数子练习（T13）已安装/)).toBeVisible();
  await page.getByRole('link',{name:'进入围地与面积数子'}).click();
  await expect(page).toHaveURL(/#\/learn\/territory$/);
  await expect(page.getByRole('heading',{name:'先确认，再逐区数面积'})).toBeVisible();
  await page.goto('/#/teacher');
  await expect(page.getByRole('link',{name:'打开围地与面积数子'})).toHaveAttribute('href','#/learn/territory');
});

test('all six END fixtures are selectable and the unsettled counterexample stays scoreless',async({page})=>{
  await page.goto('/#/learn/territory');
  for(const id of ['END-001','END-002','END-003','END-004','END-005']){
    await openFixture(page,id);await acceptTeachingFixture(page);
    await expect(page.getByRole('heading',{name:'给所有空点标归属'})).toBeVisible();
  }
  await openFixture(page,'END-006');
  await page.getByLabel('可按给定假设试算').check();await page.getByRole('button',{name:'提交终局判断'}).click();
  await expect(page.getByText(/不能生成最终胜负/)).toBeVisible();
  await page.getByLabel('继续对弈').check();await page.getByRole('button',{name:'提交终局判断'}).click();
  await expect(page.getByRole('heading',{name:'本例停止在争议处理'})).toBeVisible();
  await expect(page.getByText('面积计分明细')).toHaveCount(0);
  await expect(page.getByText(/黑 \d+，白 \d+/)).toHaveCount(0);
  await expect(page.getByRole('link',{name:'打开完整小棋盘对弈'})).toHaveAttribute('href','#/play/full-game');
});

test('answers stay hidden until submission and connected regions can be labeled and undone',async({page})=>{
  await page.goto('/#/learn/territory');await openFixture(page,'END-002');await acceptTeachingFixture(page);
  await expect(page.getByText('面积计分明细')).toHaveCount(0);
  await expect(page.locator('[data-marker-kind="ownership"]')).toHaveCount(0);
  await page.getByLabel('中立点',{exact:true}).check();
  await page.locator('[data-row="2"][data-col="0"]').click();
  await expect(page.locator('[data-marker-kind="ownership"]')).toHaveCount(5);
  await page.getByRole('button',{name:'撤回标记'}).click();
  await expect(page.locator('[data-marker-kind="ownership"]')).toHaveCount(0);
  await page.locator('[data-row="2"][data-col="0"]').click();
  await page.getByRole('button',{name:'提交区域答案'}).click();
  await expect(page.getByRole('heading',{name:'查看边界后再试'})).toBeVisible();
  await expect(page.getByText(/边界同时接触黑棋和白棋/).first()).toBeVisible();
  await expect(page.locator('[data-marker-kind="ownership"]')).toHaveCount(9);
  await page.getByRole('button',{name:'隐藏答案后重试'}).click();
  await expect(page.getByText('面积计分明细')).toHaveCount(0);
});

test('a complete END-001 answer reveals dead stones through totals in order',async({page})=>{
  await page.goto('/#/learn/territory');await acceptTeachingFixture(page);
  for(const selector of ['[data-row="0"][data-col="1"]','[data-row="0"][data-col="3"]'])await page.locator(selector).click();
  await page.getByLabel('白方空点').check();
  for(const selector of ['[data-row="4"][data-col="1"]','[data-row="4"][data-col="3"]'])await page.locator(selector).click();
  await page.getByRole('button',{name:'提交区域答案'}).click();
  await expect(page.getByRole('heading',{name:'区域归属一致'})).toBeVisible();
  await page.getByRole('button',{name:'按顺序查看面积构成'}).click();
  await expect(page.getByText('1. 确认死子')).toBeVisible();
  await expect(page.getByText('2. 剩余活子')).toHaveCount(0);
  for(let i=0;i<5;i++)await page.getByRole('button',{name:'下一步'}).click();
  await expect(page.getByText('6. 总分')).toBeVisible();
  await expect(page.getByRole('table',{name:'面积计分明细'})).toBeVisible();
  await expect(page.getByText(/提子记录：黑 0、白 0/)).toBeVisible();
});

test('dead-stone removal and komi trial never mutate the authored fixture',async({page})=>{
  await page.goto('/#/learn/territory');await openFixture(page,'END-003');
  await expect(page.locator('[data-row="0"][data-col="2"]')).toHaveAttribute('data-stone','W');
  await acceptTeachingFixture(page);
  await expect(page.locator('[data-row="0"][data-col="2"]')).toHaveAttribute('data-stone','empty');
  await page.getByRole('button',{name:'提交区域答案'}).click();await page.getByRole('button',{name:'按顺序查看面积构成'}).click();
  for(let i=0;i<5;i++)await page.getByRole('button',{name:'下一步'}).click();
  await expect(page.getByText(/C5。.*这是题面给定的教学假设/)).toBeVisible();
  const input=page.getByLabel('试算贴目');await input.fill('2.5');
  await expect(page.getByText(/教学试算：黑 15，白 12.5/)).toBeVisible();
  await page.getByRole('button',{name:'恢复原示例'}).click();await expect(input).toHaveValue('0');
  await openFixture(page,'END-003');await acceptTeachingFixture(page);await page.getByRole('button',{name:'提交区域答案'}).click();await page.getByRole('button',{name:'按顺序查看面积构成'}).click();
  for(let i=0;i<5;i++)await page.getByRole('button',{name:'下一步'}).click();
  await expect(page.getByLabel('试算贴目')).toHaveValue('0');
});

test('capture comparison unlocks only after both predictions and explains area semantics',async({page})=>{
  await page.goto('/#/learn/territory');await expect(page.getByText('尚未完成这两个示例。你可以从上方题号自由切换；这不是通关门槛。')).toBeVisible();
  await submitEmptyPrediction(page,'END-001');await submitEmptyPrediction(page,'END-005');
  await expect(page.getByText('黑提 0，白提 0')).toBeVisible();
  await expect(page.getByText('黑提 12，白提 1')).toBeVisible();
  await expect(page.getByText('面积：黑 10 · 白 15')).toHaveCount(2);
  await expect(page.getByText(/提子在对局中会改变盘面/)).toBeVisible();
});

test('downloaded physical-board card uses the same rules and END ids',async({page})=>{
  await page.goto('/#/learn/territory');
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'下载实体棋盘操作卡'}).click();
  const download=await downloadPromise;expect(download.suggestedFilename()).toBe('T13-实体棋盘围地操作卡.md');
  const body=await readFile((await download.path())!,'utf8');
  expect(body).toContain('GO-CLUB-AREA-1');expect(body).toContain('END-xxx');expect(body).toContain('提子记录只作信息，不再加分');
});

test('360px touch and keyboard label a board-edge region without page overflow',async({browser})=>{
  const context=await browser.newContext({viewport:{width:360,height:800},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const page=await context.newPage();await page.goto('/#/learn/territory');await openFixture(page,'END-002');await acceptTeachingFixture(page);
  await page.getByLabel('中立点',{exact:true}).tap();
  const edge=page.locator('[data-row="2"][data-col="0"]');await edge.focus();await edge.press('Enter');
  await expect(page.locator('[data-marker-kind="ownership"]')).toHaveCount(5);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:evidence+'/360-territory.png',fullPage:true});await context.close();
});

for(const width of [768,1280])test(width+'px territory page is readable',async({page})=>{
  await page.setViewportSize({width,height:900});await page.goto('/#/learn/territory');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.getByRole('heading',{name:'先确认，再逐区数面积'})).toBeVisible();
  await page.screenshot({path:evidence+'/'+width+'-territory.png',fullPage:true});
});

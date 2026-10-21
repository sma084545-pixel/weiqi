import {mkdir,readFile} from 'node:fs/promises';
import {test,expect} from '@playwright/test';
const evidence='output/playwright/t06';
test.beforeAll(async()=>{await mkdir(evidence,{recursive:true});});
const cell=(page:any,row:number,col:number)=>page.locator(`[data-row="${row}"][data-col="${col}"]`);
async function makeInvalid(page:any){await page.getByRole('button',{name:/^放黑/}).click();await cell(page,4,4).click();await page.getByRole('button',{name:/^放白/}).click();for(const [row,col] of [[3,4],[4,3],[4,5],[5,4]])await cell(page,row,col).click();}

test('setup keeps an illegal no-liberty group and blocks rules until repaired',async({page})=>{
  await page.goto('/#/board/experiment');await makeInvalid(page);await expect(cell(page,4,4)).toHaveAttribute('data-stone','B');await expect(page.getByText(/标出的棋块没有气/)).toBeVisible();await expect(page.getByRole('button',{name:'从当前局面开始按规则试下'})).toBeDisabled();
  await page.getByRole('button',{name:/^擦除/}).click();await cell(page,3,4).click();await expect(page.getByText('当前摆棋局面可作为新的规则起点。')).toBeVisible();
});

test('fresh rules history alternates players, passes, undoes/redoes, and returns as one edit',async({page})=>{
  await page.goto('/#/board/experiment');await page.getByRole('button',{name:/^放黑/}).click();await cell(page,4,4).click();await page.getByText(/确认把当前盘面作为新起点/).click();await page.getByRole('button',{name:'从当前局面开始按规则试下'}).click();
  await expect(page.locator('[data-work-mode="rules"]')).toBeVisible();const historyRow=page.locator('.rule-summary dl>div').filter({hasText:'历史布局'});await expect(historyRow.locator('dd')).toHaveText('1');await cell(page,0,0).click();await expect(page.getByText('白方',{exact:true})).toBeVisible();await page.getByRole('button',{name:'停一手'}).click();await page.getByRole('button',{name:'停一手'}).click();await expect(page.getByText('终局确认',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'撤回对局'}).click();await page.getByRole('button',{name:'重做对局'}).click();await page.getByRole('button',{name:'把当前盘面带回摆棋示意'}).click();await expect(page.locator('[data-work-mode="setup"]')).toBeVisible();await expect(cell(page,0,0)).toHaveAttribute('data-stone','B');await page.getByRole('button',{name:'撤回编辑'}).click();await expect(cell(page,0,0)).toHaveAttribute('data-stone','empty');
});

test('setup and game undo remain separate and a new setup branch clears redo',async({page})=>{
  await page.goto('/#/board/experiment');await page.getByRole('button',{name:/^放黑/}).click();await cell(page,0,0).click();await cell(page,0,1).click();await page.getByRole('button',{name:'撤回编辑'}).click();await expect(page.getByRole('button',{name:'重做编辑'})).toBeEnabled();await cell(page,1,0).click();await expect(page.getByRole('button',{name:'重做编辑'})).toBeDisabled();
});

test('size change announces exact crop and remains undoable',async({page})=>{
  await page.goto('/#/board/experiment');await page.getByRole('button',{name:/^放白/}).click();await cell(page,8,8).click();await page.getByLabel('完整棋盘尺寸').selectOption('5');await expect(page.getByText(/将裁切 1 颗棋和 0 个标记/)).toBeVisible();await page.getByRole('button',{name:'取消'}).last().click();await expect(cell(page,8,8)).toHaveAttribute('data-stone','W');await page.getByLabel('完整棋盘尺寸').selectOption('5');await page.getByRole('button',{name:'确认切换'}).click();await expect(page.getByRole('gridcell')).toHaveCount(25);await page.getByRole('button',{name:'撤回编辑'}).click();await expect(page.getByRole('gridcell')).toHaveCount(81);await expect(cell(page,8,8)).toHaveAttribute('data-stone','W');
});

test('local save/load and both schema exports preserve the defined scope',async({page})=>{
  await page.goto('/#/board/experiment');await page.getByRole('button',{name:/^放白/}).click();await cell(page,3,3).click();await page.getByRole('button',{name:/^目标标记/}).click();await cell(page,3,3).click();await page.getByRole('button',{name:/^数字标记/}).click();await page.getByLabel('当前数字').fill('7');await cell(page,4,4).click();await page.getByRole('button',{name:'保存当前设备'}).click();await page.getByRole('button',{name:'清空'}).click();await page.getByRole('button',{name:'确认清空'}).click();await page.getByRole('button',{name:'读取本机临时局面'}).click();await expect(cell(page,3,3)).toHaveAttribute('data-stone','W');await expect(page.locator('[data-marker-kind="target"]')).toHaveCount(1);await expect(page.locator('[data-marker-kind="sequence"]')).toContainText('7');
  const p=page.waitForEvent('download');await page.getByRole('button',{name:'导出 Position JSON'}).click();const position=await p;const path=await position.path();expect(path).not.toBeNull();const doc=JSON.parse(await readFile(path!,'utf8'));expect(doc).toMatchObject({schemaVersion:1,kind:'Position',size:9,toPlay:'B',historyPolicy:'fresh-setup',history:null});
  const b=page.waitForEvent('download');await page.getByRole('button',{name:'导出 Position 与标记'}).click();const bundle=await b;const bundlePath=await bundle.path();const content=JSON.parse(await readFile(bundlePath!,'utf8'));expect(content.kind).toBe('ContentBundle');expect(content.items.filter((item:any)=>item.kind==='Marker')).toHaveLength(2);
});

test('keyboard and touch use the visible tool without duplicate activation',async({browser})=>{
  const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:360,height:900}});const page=await context.newPage();await page.goto('/#/board/experiment');const point=cell(page,2,2);await point.focus();await page.keyboard.press('Enter');await expect(point).toHaveAttribute('data-stone','B');await page.getByRole('button',{name:/^放白/}).tap();await cell(page,2,3).tap();await expect(cell(page,2,3)).toHaveAttribute('data-stone','W');await context.close();
});

for(const width of [360,768,1280])test(`${width}px experiment board is readable and contained`,async({page})=>{
  await page.setViewportSize({width,height:1050});await page.goto('/#/board/experiment');await expect(page.getByRole('heading',{level:1,name:'自由实验棋盘'})).toBeVisible();await expect(page.getByRole('gridcell')).toHaveCount(81);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${evidence}/${width}-setup.png`,fullPage:true});
});

test('projector, grayscale and reduced motion keep modes and markers readable',async({page})=>{
  await page.setViewportSize({width:1280,height:1000});await page.goto('/#/board/experiment');await page.getByText('投影模式',{exact:true}).locator('..').getByRole('checkbox').check();await page.emulateMedia({reducedMotion:'reduce'});await page.addStyleTag({content:'html{filter:grayscale(1)}'});await page.getByRole('button',{name:/^目标标记/}).click();await cell(page,4,4).click();await expect(page.locator('[data-marker-kind="target"]')).toHaveCount(1);await expect(page.getByRole('button',{name:/^目标标记/})).toHaveAttribute('aria-pressed','true');await page.screenshot({path:`${evidence}/1280-projector-grayscale.png`,fullPage:true});
});

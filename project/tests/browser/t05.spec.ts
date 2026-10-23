import {mkdir} from 'node:fs/promises';
import {test,expect} from '@playwright/test';
const evidence='output/playwright/t05';
test.beforeAll(async()=>{await mkdir(evidence,{recursive:true});});

test('prediction stays sealed, playback locks the board, and direct finish commits once',async({page})=>{
  await page.setViewportSize({width:1280,height:1000});await page.goto('/#/learn/captures');
  await expect(page.getByRole('heading',{level:1,name:'提子实验室'})).toBeVisible();
  const sealed=await page.locator('main').innerText();expect(sealed).not.toContain('实际被提');expect(sealed).not.toContain('漏选');expect(sealed).not.toContain('误选');
  await page.getByRole('button',{name:/使用建议点 D3/}).click();await expect(page.getByText(/D3 合法/)).toBeVisible();
  await page.locator('.prediction-targets input').check();await page.getByRole('button',{name:'验证我的预测并播放'}).click();
  await expect(page.getByText(/第 [12] \/ 4 步/)).toBeVisible();await expect(page.getByRole('gridcell').first()).toHaveAttribute('aria-disabled','true');
  const pause=page.getByRole('button',{name:'暂停播放'});if(await pause.isVisible())await pause.click();
  await page.getByRole('button',{name:'直接完成'}).click();await expect(page.getByText('预测一致。')).toBeVisible();await expect(page.getByText(/实际被提（1 颗）/)).toBeVisible();await expect(page.getByText('C3',{exact:true})).toBeVisible();
  await expect(page.locator('.capture-lab-page')).toHaveAttribute('data-committed','true');
  await page.getByRole('button',{name:'撤回到动画前并重试'}).click();await expect(page.locator('.capture-player')).toHaveCount(0);await expect(page.locator('[data-row="2"][data-col="3"]')).toHaveAttribute('data-stone','empty');
});

test('step controls pause, go backward and forward without accepting a second move',async({page})=>{
  await page.goto('/#/learn/captures');await page.getByRole('button',{name:/使用建议点 D3/}).click();await page.locator('.prediction-targets input').check();await page.getByRole('button',{name:'验证我的预测并播放'}).click();
  const pause=page.getByRole('button',{name:'暂停播放'});if(await pause.isVisible())await pause.click();
  await page.getByRole('button',{name:'下一步'}).click();await expect(page.locator('.capture-board-note')).toContainText(/检查对方气|移除被提棋/);
  await page.getByRole('button',{name:'上一步'}).click();await expect(page.getByRole('gridcell').first()).toHaveAttribute('aria-disabled','true');
});

test('true suicide is rejected unchanged while capture-first is accepted',async({page})=>{
  await page.goto('/#/learn/captures');await page.getByRole('button',{name:/^06/}).click();
  const before=await page.locator('[data-stone]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-stone')).join(''));
  await page.getByRole('button',{name:/先试自杀点 E1/}).click();await expect(page.getByText(/提子处理后己方棋块仍无气/)).toBeVisible();
  expect(await page.locator('[data-stone]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-stone')).join(''))).toBe(before);
  await page.getByRole('button',{name:/使用建议点 A5/}).click();await expect(page.getByText(/A5 合法/)).toBeVisible();
});

test('explicit no-capture and reduced motion reach the verified final state',async({page})=>{
  await page.goto('/#/learn/captures');await page.getByRole('button',{name:/^04/}).click();await page.getByRole('button',{name:/使用建议点 C2/}).click();
  await page.getByLabel('不会提子').check();await page.getByLabel(/减少动画/).check();await page.getByRole('button',{name:'验证我的预测并播放'}).click();
  await expect(page.getByText('预测一致。')).toBeVisible();await expect(page.locator('.capture-board-note')).toContainText('共有 3 口气');await expect(page.locator('.capture-followup')).toContainText('两项活动当前都可直接打开');
});

test('switching demo and leaving the route cancel pending playback',async({page})=>{
  await page.goto('/#/learn/captures');await page.getByRole('button',{name:/使用建议点 D3/}).click();await page.locator('.prediction-targets input').check();await page.getByRole('button',{name:'验证我的预测并播放'}).click();
  await page.getByRole('button',{name:/^02/}).click();await expect(page.locator('.capture-player')).toHaveCount(0);await page.getByRole('link',{name:'返回学习路线'}).click();await page.waitForTimeout(1100);await page.goto('/#/learn/captures');await expect(page.locator('.capture-player')).toHaveCount(0);await expect(page.locator('.capture-lab-page')).not.toHaveAttribute('data-committed','true');
});

test('keyboard and touch each choose one candidate without duplicate callbacks',async({browser})=>{
  const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:360,height:900}});const page=await context.newPage();await page.goto('/#/learn/captures');
  await expect(page.locator('#main')).toBeFocused();const d3=page.locator('[data-row="2"][data-col="3"]');await d3.focus();await page.keyboard.press('Enter');await expect(page.getByText(/D3 合法/)).toBeVisible();
  await page.getByRole('button',{name:'重置当前演示'}).tap();await d3.tap();await expect(page.locator('[data-marker-kind="candidate"]')).toHaveCount(1);await context.close();
});

for(const width of [360,768,1280])test(`${width}px capture lab is readable and contained`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.setViewportSize({width,height:1050});await page.goto('/#/learn/captures');
  await expect(page.getByRole('heading',{level:1,name:'提子实验室'})).toBeVisible();await expect(page.getByRole('gridcell')).toHaveCount(25);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const controls=await page.locator('.capture-demo-picker button,.recommended-row button,.capture-primary,.capture-reset').evaluateAll(items=>items.filter(item=>{const box=item.getBoundingClientRect();return box.width>0&&box.height>0;}).map(item=>item.getBoundingClientRect().height));expect(Math.min(...controls)).toBeGreaterThanOrEqual(43.5);expect(errors).toEqual([]);
  await page.evaluate(()=>{scrollTo(0,0);if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});await page.screenshot({path:`${evidence}/${width}-initial.png`,fullPage:true});
});

test('projector, grayscale and reduced-motion content remain distinguishable',async({page})=>{
  await page.setViewportSize({width:1280,height:1000});await page.goto('/#/learn/captures');await page.getByRole('button',{name:/^03/}).click();await page.getByText('投影模式',{exact:true}).locator('..').getByRole('checkbox').check();await page.addStyleTag({content:'html{filter:grayscale(1)}'});await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:/使用建议点 C3/}).click();for(const input of await page.locator('.prediction-targets input').all())await input.check();await page.getByRole('button',{name:'验证我的预测并播放'}).click();await page.getByRole('button',{name:'直接完成'}).click();
  await expect(page.locator('[data-marker-kind="liberty"]')).toHaveCount(4);await expect(page.getByText(/实际被提（4 颗）/)).toBeVisible();await page.screenshot({path:`${evidence}/1280-final-projector-grayscale.png`,fullPage:true});
});

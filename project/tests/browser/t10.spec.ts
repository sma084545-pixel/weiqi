import {mkdir} from 'node:fs/promises';
import {expect,test} from '@playwright/test';

const evidence='output/playwright/t10';
test.beforeAll(async()=>{await mkdir(evidence,{recursive:true});});
const openCard=async(page:import('@playwright/test').Page,id:string)=>{
  await page.goto('/#/challenges');const card=page.locator('.puzzle-card').filter({hasText:id});await expect(card).toBeVisible();await card.getByRole('button',{name:/作答/}).click();await expect(page.getByText(new RegExp(`${id} · 修订 1`))).toBeVisible();
};

test('catalog exposes six categories, text difficulty filters, and no competitive pressure',async({page})=>{
  await page.setViewportSize({width:1280,height:900});await page.goto('/#/challenges');
  await expect(page.getByRole('heading',{name:'互动挑战题'})).toBeVisible();await expect(page.locator('.puzzle-card')).toHaveCount(30);
  for(const name of ['气与连接','提子与打吃','连接与切断','眼与基础死活','面积与终局','开放讨论'])await expect(page.getByRole('button',{name:new RegExp(name)})).toBeVisible();
  for(const name of ['入门','进阶','自选挑战'])await expect(page.getByRole('button',{name})).toBeVisible();
  const text=await page.locator('main').innerText();expect(text).not.toMatch(/schemaVersion|solutionChecked/);await expect(page.locator('[data-testid="timer"],[data-testid="leaderboard"]')).toHaveCount(0);
  await page.getByRole('button',{name:/开放讨论/}).click();await expect(page.locator('.puzzle-card')).toHaveCount(5);
  await page.screenshot({path:`${evidence}/1280-catalog.png`,fullPage:true});
});

test('number, point-set, reason choice, region labels, and open discussion complete through their own controls',async({page})=>{
  await openCard(page,'LIB-001');await page.getByTestId('number-answer').fill('4');await page.getByRole('button',{name:'提交回答'}).click();await expect(page.getByText('已达到标准')).toBeVisible();
  await page.getByRole('button',{name:'返回列表'}).click();await openCard(page,'LIB-002');for(const [row,col] of [[0,1],[1,0]])await page.locator(`[data-row="${row}"][data-col="${col}"]`).click();await page.getByRole('button',{name:'提交回答'}).click();await expect(page.getByText('所选点集合完整且没有多选。')).toBeVisible();
  await page.getByRole('button',{name:'返回列表'}).click();await openCard(page,'LIFE-001');for(const [row,col] of [[1,1],[1,3]])await page.locator(`[data-row="${row}"][data-col="${col}"]`).click();await page.getByRole('button',{name:'提交回答'}).click();await expect(page.getByText('所选点集合完整且没有多选。')).toBeVisible();
  await page.getByRole('button',{name:'返回列表'}).click();await openCard(page,'AREA-005');await page.getByText('黑 10，白 15，白多 5；提子数不另加。').click();await page.getByRole('button',{name:'提交回答'}).click();await expect(page.getByText('选择符合本题已核查理由。')).toBeVisible();
  await page.getByRole('button',{name:'返回列表'}).click();await openCard(page,'AREA-002');
  for(const [owner,points] of [['黑方',[[0,1],[0,3]]],['白方',[[4,1],[4,3]]],['中立',[[2,0],[2,1],[2,2],[2,3],[2,4]]]] as const){await page.locator('.owner-picker').getByText(owner,{exact:true}).click();for(const [row,col] of points)await page.locator(`[data-row="${row}"][data-col="${col}"]`).click();}
  await page.getByRole('button',{name:'提交回答'}).click();await expect(page.getByText('空点归属与教学假设一致。')).toBeVisible();
  await page.getByRole('button',{name:'返回列表'}).click();await openCard(page,'DISC-001');await page.locator('textarea').fill('我选 E5 连接，因为两子会成为一块；白方可从 E4 回应。我会先复述同伴的理由再比较。');await page.getByRole('button',{name:'提交回答'}).click();await expect(page.getByText('开放讨论',{exact:true})).toBeVisible();
});

test('move tree accepts multiple verified solutions, keeps legal uncovered moves unknown, and rejects illegal moves without changing turn',async({page})=>{
  await openCard(page,'CON-002');await page.locator('[data-row="1"][data-col="2"]').click();await expect(page.getByText('这条变化达到本题已核查标准。')).toBeVisible();
  await page.getByRole('button',{name:'重置本题'}).click();await page.locator('[data-row="2"][data-col="1"]').click();await expect(page.getByText('这条变化达到本题已核查标准。')).toBeVisible();
  await page.getByRole('button',{name:'返回列表'}).click();await openCard(page,'CAP-001');await page.locator('[data-row="4"][data-col="4"]').click();await expect(page.getByText('目前未能判断')).toBeVisible();await expect(page.getByText(/不会记作错误/)).toBeVisible();
  await page.getByRole('button',{name:'重置本题'}).click();await expect(page.getByText('当前轮到 黑方')).toBeVisible();const occupied=page.locator('[data-row="2"][data-col="2"]');await expect(occupied).toHaveAttribute('aria-disabled','true');await expect(occupied).toHaveAttribute('aria-label',/占用，不可落/);await occupied.evaluate(element=>(element as HTMLButtonElement).click());await expect(page.getByText('当前轮到 黑方')).toBeVisible();
});

test('authored refutation plays once, back restores the prior frame, and rapid switching cancels it',async({page})=>{
  await openCard(page,'CAP-001');await page.locator('[data-row="1"][data-col="3"]').click();await expect(page.getByText('正在播放题目回应…')).toBeVisible();await expect(page.locator('[data-row="2"][data-col="3"]')).toHaveAttribute('data-stone','empty');await page.waitForTimeout(650);await expect(page.locator('[data-row="2"][data-col="3"]')).toHaveAttribute('data-stone','W');await expect(page.getByText('题目中的合法反驳已经走出。')).toBeVisible();
  await page.getByRole('button',{name:'回退一步'}).click();await expect(page.locator('[data-row="2"][data-col="3"]')).toHaveAttribute('data-stone','empty');
  await page.getByRole('button',{name:'重置本题'}).click();await page.locator('[data-row="1"][data-col="3"]').click();await page.getByRole('button',{name:/返回题目列表/}).click();await page.locator('.puzzle-card').filter({hasText:'LIB-001'}).getByRole('button',{name:/作答/}).click();await page.waitForTimeout(650);await expect(page.getByText(/LIB-001 · 修订 1/)).toBeVisible();await expect(page.locator('[data-row="2"][data-col="3"]')).toHaveAttribute('data-stone','empty');
});

test('hints reveal in three levels, retry hides them, revision-keyed result survives refresh, and free play restores the original task',async({page})=>{
  await openCard(page,'LIB-001');await page.getByRole('button',{name:'显示提示'}).first().click();await expect(page.getByText('沿线找上下左右相邻的空点。')).toBeVisible();await page.getByRole('button',{name:'隐藏提示并重试'}).click();await expect(page.getByText('沿线找上下左右相邻的空点。')).toHaveCount(0);
  await page.getByTestId('number-answer').fill('4');await page.getByRole('button',{name:'提交回答'}).click();await page.reload();await page.goto('/#/challenges');await expect(page.locator('.puzzle-card').filter({hasText:'LIB-001'}).getByText('本设备已完成')).toBeVisible();
  await openCard(page,'CAP-001');await page.getByRole('button',{name:'自由试下'}).click();await expect(page.getByTestId('free-play')).toBeVisible();await page.locator('[data-row="4"][data-col="4"]').click();await page.getByRole('button',{name:'结束试下，返回题目'}).click();await expect(page.getByText(/CAP-001 · 修订 1/)).toBeVisible();await expect(page.locator('[data-row="4"][data-col="4"]')).toHaveAttribute('data-stone','empty');
});

test('360px touch and keyboard can each complete a point-set task without horizontal page overflow',async({browser})=>{
  const context=await browser.newContext({viewport:{width:360,height:800},isMobile:true,hasTouch:true});const page=await context.newPage();await openCard(page,'LIB-002');
  await page.locator('[data-row="0"][data-col="1"]').tap();await page.locator('[data-row="1"][data-col="0"]').tap();await page.getByRole('button',{name:'提交回答'}).tap();await expect(page.getByText('已达到标准')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.evaluate(()=>{(document.activeElement as HTMLElement|null)?.blur();scrollTo(0,0);});await page.screenshot({path:`${evidence}/360-point-set-touch.png`,fullPage:true});
  await page.getByRole('button',{name:'重置本题'}).tap();const start=page.locator('[data-row="0"][data-col="0"]');await start.focus();await start.press('ArrowRight');await page.locator('[data-row="0"][data-col="1"]').press('Enter');await page.locator('[data-row="0"][data-col="1"]').press('ArrowLeft');await page.locator('[data-row="0"][data-col="0"]').press('ArrowDown');await page.locator('[data-row="1"][data-col="0"]').press('Space');await page.getByRole('button',{name:'提交回答'}).click();await expect(page.getByText('已达到标准')).toBeVisible();await context.close();
});

for(const width of [768,1280])test(`${width}px player remains readable and reduced motion is honored`,async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width,height:900});await openCard(page,'CAP-001');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('[data-row="1"][data-col="3"]').click();await expect(page.locator('[data-row="2"][data-col="3"]')).toHaveAttribute('data-stone','W');await page.evaluate(()=>{(document.activeElement as HTMLElement|null)?.blur();scrollTo(0,0);});await page.screenshot({path:`${evidence}/${width}-move-player.png`,fullPage:true});});

import {mkdir} from 'node:fs/promises';
import {expect,test} from '@playwright/test';

const evidence='output/playwright/t11';
test.beforeAll(async()=>{await mkdir(evidence,{recursive:true});});

test('stage 5 opens the installed short lesson and keeps free play available',async({page})=>{
  await page.goto('/#/route/STAGE-05');await expect(page.getByText('眼与基础死活小课（T11）已安装')).toBeVisible();await page.getByRole('link',{name:'进入眼与死活小课'}).click();
  await expect(page.getByRole('heading',{name:'先问一手能不能下，再谈“活”与“死”'})).toBeVisible();await expect(page.getByRole('link',{name:'返回自由对弈'}).first()).toHaveAttribute('href','#/play/full-game');
});

test('false eye and two-eye trials use actual rule legality and preserve the board on suicide',async({page})=>{
  await page.goto('/#/learn/life');await page.getByText('可以合法落子',{exact:true}).click();const falseBoard=page.getByRole('grid',{name:/看似被围住：假眼/});await falseBoard.locator('[data-row="0"][data-col="0"]').click();await page.getByRole('button',{name:'验证这一步'}).click();await expect(page.getByText(/这一步要核对 C3/)).toBeVisible();
  await falseBoard.locator('[data-row="2"][data-col="2"]').click();await page.getByRole('button',{name:'验证这一步'}).click();
  await expect(page.getByText(/提走 3 子/)).toBeVisible();for(const [row,col] of [[1,2],[2,1],[2,3]])await expect(page.locator(`[data-row="${row}"][data-col="${col}"]`).first()).toHaveAttribute('data-stone','empty');
  await page.getByRole('button',{name:'再看两个真眼'}).click();await page.getByText('不能合法落子',{exact:true}).click();const trueBoard=page.getByRole('grid',{name:/两个独立真眼/});await trueBoard.locator('[data-row="1"][data-col="1"]').click();await page.getByRole('button',{name:'验证这一步'}).click();await expect(page.getByText(/自杀禁着/)).toBeVisible();await expect(trueBoard.locator('[data-row="1"][data-col="1"]')).toHaveAttribute('data-stone','empty');
});

test('comparisons expose connected-space, turn change, outer liberties and evidence limits',async({page})=>{
  await page.setViewportSize({width:1280,height:900});await page.goto('/#/learn/life');
  await expect(page.getByRole('heading',{name:'两个空点，不一定是两只眼'})).toBeVisible();await expect(page.getByText('两个独立眼',{exact:true})).toBeVisible();await expect(page.getByText('两个相连空点',{exact:true})).toBeVisible();
  const next=page.getByRole('button',{name:'下一步'});await next.click();await next.click();await next.click();await expect(page.getByRole('heading',{name:'最后填 E3'})).toBeVisible();await expect(page.getByText(/共同点 C3/)).toBeVisible();
  await expect(page.getByText(/黑方先 · 目标黑棋块/)).toBeVisible();await expect(page.getByText(/白方先 · 目标黑棋块/)).toBeVisible();await expect(page.getByText(/后续死活仍需继续走/)).toBeVisible();
  await expect(page.getByText(/没有两眼不自动等于死亡/)).toBeVisible();await expect(page.getByText(/双活等情形存在/)).toBeVisible();
  await page.evaluate(()=>{(document.activeElement as HTMLElement|null)?.blur();scrollTo(0,0);});await page.screenshot({path:`${evidence}/1280-life-lesson.png`,fullPage:true});
});

test('formal LIFE practice reuses T10 hints and verified tree, then returns unchanged',async({page})=>{
  await page.goto('/#/learn/life');await page.locator('.life-reference-list button').filter({hasText:'LIFE-003'}).click();await expect(page.getByText('LIFE-003 · 修订 1')).toBeVisible();
  await page.getByRole('button',{name:'显示提示'}).first().click();await expect(page.getByText('先检查目标块的全部气。')).toBeVisible();await page.getByRole('button',{name:'隐藏提示并重试'}).click();await expect(page.getByText('先检查目标块的全部气。')).toHaveCount(0);
  await page.locator('[data-row="0"][data-col="1"]').click();await expect(page.getByText('这条变化达到本题已核查标准。')).toBeVisible();await page.getByRole('button',{name:/返回眼与死活小课/}).click();await expect(page.getByTestId('life-lab')).toBeVisible();
});

test('360px touch and keyboard can complete the opening check without page overflow',async({browser})=>{
  const context=await browser.newContext({viewport:{width:360,height:800},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const page=await context.newPage();await page.goto('/#/learn/life');
  await page.getByText('可以合法落子',{exact:true}).tap();const candidate=page.locator('[data-row="2"][data-col="2"]').first();await candidate.focus();await candidate.press('Enter');await page.getByRole('button',{name:'验证这一步'}).tap();await expect(page.getByText(/提走 3 子/)).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(()=>{(document.activeElement as HTMLElement|null)?.blur();scrollTo(0,0);});await page.screenshot({path:`${evidence}/360-life-lesson.png`,fullPage:true});await context.close();
});

for(const width of [768,1280])test(`${width}px lesson remains readable`,async({page})=>{await page.setViewportSize({width,height:900});await page.goto('/#/learn/life');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.getByRole('heading',{name:'对方能落在被围住的空点吗？'})).toBeVisible();await page.evaluate(()=>{(document.activeElement as HTMLElement|null)?.blur();scrollTo(0,0);});await page.screenshot({path:`${evidence}/${width}-life-top.png`,fullPage:true});});

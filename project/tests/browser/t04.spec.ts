import {mkdir} from 'node:fs/promises';
import {test,expect} from '@playwright/test';

const evidence='output/playwright/t04';
test.beforeAll(async()=>{await mkdir(evidence,{recursive:true});});

test('prediction stays sealed, validates input, explains errors, and reveals only after submit',async({page})=>{
  await page.setViewportSize({width:1280,height:1000});await page.goto('/#/learn/liberties');
  await expect(page.getByRole('heading',{level:1,name:'气实验室'})).toBeVisible();
  await page.getByLabel(/先猜气数再验证/).check();
  await expect(page.locator('[data-marker-kind="liberty"]')).toHaveCount(0);
  const sealed=await page.locator('main').innerText();
  expect(sealed).not.toContain('核对结果：共有');expect(sealed).not.toContain('中央单子四周的四个');
  const aria=await page.locator('[aria-label]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')).join(' '));
  expect(aria).not.toContain('核对后的气');
  await page.getByRole('button',{name:'提交预测并验证'}).click();await expect(page.getByRole('status').filter({hasText:'请先写下'})).toBeVisible();
  const input=page.getByLabel('我预测这个棋块的气数');
  await input.fill('-1');await page.getByRole('button',{name:'提交预测并验证'}).click();await expect(page.getByText(/不会小于 0/)).toBeVisible();await expect(page.locator('[data-marker-kind="liberty"]')).toHaveCount(0);
  await input.fill('2.5');await page.getByRole('button',{name:'提交预测并验证'}).click();await expect(page.getByText(/完整的非负整数/)).toBeVisible();
  await input.fill('3');await page.getByRole('button',{name:'提交预测并验证'}).click();await expect(page.getByText(/预测偏少.*漏看/)).toBeVisible();await expect(page.locator('[data-marker-kind="liberty"]')).toHaveCount(4);
  await page.getByRole('button',{name:'隐藏提示后重试'}).click();await expect(page.locator('[data-marker-kind="liberty"]')).toHaveCount(0);await expect(input).toHaveValue('');
  await input.fill('4');await page.getByRole('button',{name:'提交预测并验证'}).click();await expect(page.getByText(/核对结果：共有 4 口气/)).toBeVisible();await expect(page.getByRole('heading',{name:'和伙伴在实体棋盘继续'})).toBeVisible();
});

test('circle mode compares point sets, reports omissions and extras, toggles duplicates, and completes',async({page})=>{
  await page.goto('/#/learn/liberties');await page.getByLabel(/圈出全部气/).check();
  const a5=page.locator('[data-row="0"][data-col="0"]');const c4=page.locator('[data-row="1"][data-col="2"]');
  await a5.click();await c4.click();await c4.click();
  await expect(page.locator('[data-marker-kind="candidate"]')).toHaveCount(1);
  await page.getByRole('button',{name:'提交圈选并核对'}).click();
  await expect(page.getByText(/漏选：C4、B3、D3、C2/)).toBeVisible();await expect(page.getByText(/误选：A5/)).toBeVisible();
  await page.getByRole('button',{name:'隐藏提示后重试'}).click();
  for(const [row,col] of [[1,2],[2,1],[2,3],[3,2]])await page.locator(`[data-row="${row}"][data-col="${col}"]`).click();
  await page.getByRole('button',{name:'提交圈选并核对'}).click();await expect(page.getByText(/去重气集合完全一致/)).toBeVisible();
});

test('all eight demos reset response state and connection comparison uses the whole merged group',async({page})=>{
  await page.goto('/#/learn/liberties');
  for(let number=1;number<=8;number++){
    const id=`DEMO-LIB-${String(number).padStart(3,'0')}`;
    await page.getByRole('button',{name:new RegExp(`^${String(number).padStart(2,'0')}`)}).click();
    await expect(page.locator('.liberty-workspace')).toHaveAttribute('data-demo-id',id);
  }
  await expect(page.locator('[data-marker-kind="group"]')).toHaveCount(1);
  await page.getByRole('button',{name:'放下连接子后'}).click();await expect(page.locator('[data-marker-kind="group"]')).toHaveCount(3);
  await page.getByLabel(/先猜气数再验证/).check();const input=page.getByLabel('我预测这个棋块的气数');await input.fill('8');await page.getByRole('button',{name:'提交预测并验证'}).click();await expect(page.getByText(/核对结果：共有 8 口气/)).toBeVisible();
  await page.getByRole('button',{name:/^02/}).click();await expect(page.locator('[data-marker-kind="liberty"]')).toHaveCount(0);await expect(input).toHaveValue('');
});

test('keyboard and touch can circle points without duplicate activation',async({browser})=>{
  const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:360,height:900}});const page=await context.newPage();await page.goto('/#/learn/liberties');await page.getByLabel(/圈出全部气/).check();
  const center=page.locator('[data-row="2"][data-col="2"]');await center.focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('Space');await expect(page.locator('[data-marker-kind="candidate"]')).toHaveCount(1);
  await page.locator('[data-row="2"][data-col="1"]').tap();await expect(page.locator('[data-marker-kind="candidate"]')).toHaveCount(2);
  await expect(page.getByRole('gridcell',{name:/C4，空点，可选择/})).toBeVisible();await context.close();
});

for(const width of [360,768,1280])test(`${width}px liberty lab is readable and contained`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.setViewportSize({width,height:1000});await page.goto('/#/learn/liberties');
  await expect(page.getByRole('heading',{level:1,name:'气实验室'})).toBeVisible();await expect(page.getByRole('gridcell')).toHaveCount(25);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const controls=await page.locator('.demo-picker button,.mode-picker label,.primary-action,.reset-action').evaluateAll(items=>items.filter(item=>{const box=item.getBoundingClientRect();return box.width>0&&box.height>0;}).map(item=>item.getBoundingClientRect().height));
  expect(Math.min(...controls)).toBeGreaterThanOrEqual(47.5);expect(errors).toEqual([]);
  await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();scrollTo(0,0);});await page.screenshot({path:`${evidence}/${width}-sealed.png`,fullPage:true});
});

test('projection, grayscale, and reduced motion keep feedback readable',async({page})=>{
  await page.setViewportSize({width:1280,height:1000});await page.goto('/#/learn/liberties');await page.getByLabel(/先猜气数再验证/).check();await page.getByLabel('我预测这个棋块的气数').fill('4');await page.getByRole('button',{name:'提交预测并验证'}).click();
  await page.getByText('投影模式',{exact:true}).locator('..').getByRole('checkbox').check();await expect(page.locator('.learning-app')).toHaveClass(/app-projector/);
  await page.addStyleTag({content:'html{filter:grayscale(1)}'});await expect(page.locator('[data-marker-kind="group"]')).toHaveCount(1);await expect(page.locator('[data-marker-kind="liberty"]')).toHaveCount(4);
  await page.emulateMedia({reducedMotion:'reduce'});const motion=await page.locator('.point-preview').first().evaluate(element=>({transition:getComputedStyle(element).transitionDuration,animation:getComputedStyle(element).animationDuration}));expect(['0s','0.01ms']).toContain(motion.transition);expect(['0s','0.01ms']).toContain(motion.animation);
  await page.screenshot({path:`${evidence}/1280-revealed-projector-grayscale.png`,fullPage:true});
});

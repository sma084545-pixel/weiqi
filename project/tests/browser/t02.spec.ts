import {mkdir} from 'node:fs/promises';
import {test,expect} from '@playwright/test';

const evidence='output/playwright/t02';
test.beforeAll(async()=>{await mkdir(evidence,{recursive:true});});

for(const width of [360,768,1280]){
  test(`${width}px: complete geometry, boundary hit, keyboard loop, and stable page`,async({page})=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.setViewportSize({width,height:1000});await page.goto('/#/board-lab');
    await page.getByLabel(/选点棋盘/).check();
    const cells=page.getByRole('gridcell');
    await expect(cells).toHaveCount(81);
    await expect(page.locator('[data-board-line-axis="horizontal"]')).toHaveCount(9);
    await expect(page.locator('[data-board-line-axis="vertical"]')).toHaveCount(9);
    for(const [row,col,label] of [[0,0,'A9'],[0,1,'B9'],[0,8,'J9'],[8,0,'A1'],[8,8,'J1']] as const){
      await expect(page.locator(`[data-row="${row}"][data-col="${col}"]`)).toHaveAttribute('aria-label',new RegExp(`^${label}，`));
    }
    for(const [row,col,label] of [[0,0,'A9'],[0,1,'B9'],[0,8,'J9'],[8,0,'A1'],[8,8,'J1']] as const){
      const point=page.locator(`[data-row="${row}"][data-col="${col}"]`);await point.scrollIntoViewIfNeeded();await point.click();await expect(page.getByRole('status')).toContainText(label);
    }
    await expect(page.getByTestId('action-count')).toContainText('5 次');
    const a9=page.locator('[data-row="0"][data-col="0"]');await a9.scrollIntoViewIfNeeded();await a9.hover();const hoverCapable=await page.evaluate(()=>matchMedia('(hover:hover) and (pointer:fine)').matches);await expect(a9.locator('.point-preview')).toHaveCSS('opacity',hoverCapable?'1':'0');
    await a9.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Space');
    await expect(page.locator('[data-row="0"][data-col="1"]')).toHaveAttribute('aria-selected','true');
    await expect(page.getByRole('status')).toContainText('B9');
    await page.keyboard.press('Tab');await page.keyboard.press('Enter');
    await expect(page.getByLabel(/只读棋盘/)).toBeFocused();
    const focusProof=await page.getByLabel(/只读棋盘/).evaluate(element=>getComputedStyle(element).outlineStyle);
    expect(focusProof).not.toBe('none');
    for(const size of [5,13,19] as const){
      await page.getByLabel(`${size}路`,{exact:true}).check();await expect(page.getByRole('gridcell')).toHaveCount(size*size);
      await expect(page.locator('[data-board-line-axis="horizontal"]')).toHaveCount(size);await expect(page.locator('[data-board-line-axis="vertical"]')).toHaveCount(size);
      const edge=page.locator(`[data-row="${size-1}"][data-col="${size-1}"]`);await edge.scrollIntoViewIfNeeded();const edgeBox=await edge.boundingBox();expect(edgeBox!.width).toBeGreaterThanOrEqual(31.9);expect(edgeBox!.height).toBeGreaterThanOrEqual(31.9);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
    await page.getByLabel('9路',{exact:true}).check();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});
    await page.evaluate(()=>scrollTo(0,0));
    await page.waitForTimeout(20);
    await page.screenshot({path:`${evidence}/${width}-select.png`,fullPage:true});
  });
}

test('19×19 keeps 32px hit cells, scrolls locally, zooms without coordinate drift, and resets',async({page})=>{
  await page.setViewportSize({width:360,height:900});await page.goto('/#/board-lab');
  await page.getByLabel(/选点棋盘/).check();await page.getByLabel('19路',{exact:true}).check();
  const viewport=page.locator('.board-viewport');const grid=page.locator('.board-grid');
  await expect(page.getByRole('gridcell')).toHaveCount(361);
  await expect(page.locator('[data-board-line-axis="horizontal"]')).toHaveCount(19);
  await expect(page.locator('[data-board-line-axis="vertical"]')).toHaveCount(19);
  const dimensions=await viewport.evaluate(element=>({client:element.clientWidth,scroll:element.scrollWidth}));expect(dimensions.scroll).toBeGreaterThan(dimensions.client);
  const corner=page.locator('[data-row="18"][data-col="18"]');await corner.scrollIntoViewIfNeeded();const box=await corner.boundingBox();expect(box!.width).toBeGreaterThanOrEqual(31.9);expect(box!.height).toBeGreaterThanOrEqual(31.9);
  await corner.click();await expect(page.getByRole('status')).toContainText('T1');
  const before=await grid.evaluate(element=>element.getBoundingClientRect().width);await page.getByRole('button',{name:'放大棋盘'}).click();
  const after=await grid.evaluate(element=>element.getBoundingClientRect().width);expect(after).toBeGreaterThan(before);
  const b18=page.locator('[data-row="1"][data-col="1"]');await b18.scrollIntoViewIfNeeded();await b18.click();await expect(page.getByRole('status')).toContainText('B18');
  await page.getByRole('button',{name:'复位缩放与滚动'}).click();await expect(page.getByLabel('当前缩放')).toHaveText('100%');
  expect(await viewport.evaluate(element=>({left:element.scrollLeft,top:element.scrollTop}))).toEqual({left:0,top:0});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`${evidence}/360-19-scroll.png`,fullPage:true});
});

test('touch tap fires once and occupied play points do not submit',async({browser})=>{
  const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:360,height:800}});const page=await context.newPage();await page.goto('/#/board-lab');
  await page.getByLabel(/选点棋盘/).check();await page.locator('[data-row="0"][data-col="0"]').tap();await expect(page.getByTestId('action-count')).toContainText('1 次');expect(await page.locator('[data-row="0"][data-col="0"] .point-preview').evaluate(element=>getComputedStyle(element).opacity)).toBe('0');
  await page.getByLabel(/落子棋盘/).check();const a9=page.locator('[data-row="0"][data-col="0"]');await a9.tap();await expect(page.getByTestId('action-count')).toContainText('1 次');
  await a9.tap({force:true});await expect(page.getByTestId('action-count')).toContainText('1 次');await expect(a9).toHaveAttribute('aria-label',/黑子，占用，不可落/);
  await context.close();
});

test('markers remain distinguishable in grayscale, projection mode enlarges geometry, and reduced motion is honored',async({page})=>{
  await page.setViewportSize({width:1280,height:1000});await page.goto('/#/board-lab');
  for(const kind of ['liberty','target','last-move','sequence','candidate','ownership'])await expect(page.locator(`[data-marker-kind="${kind}"]`).first()).toBeVisible();
  const labels=await page.getByRole('gridcell').allTextContents();expect(labels.join('')).toContain('黑');expect(labels.join('')).toContain('白');
  const standard=await page.locator('.board-grid').evaluate(element=>element.getBoundingClientRect().width);await page.locator('.control-panel').getByLabel('投影模式').check();
  const projected=await page.locator('.board-grid').evaluate(element=>element.getBoundingClientRect().width);expect(projected).toBeGreaterThan(standard);
  await page.addStyleTag({content:'html{filter:grayscale(1)}'});await page.screenshot({path:`${evidence}/1280-markers-grayscale.png`,fullPage:true});
  await page.emulateMedia({reducedMotion:'reduce'});
  const motion=await page.locator('.point-preview').first().evaluate(element=>({transition:getComputedStyle(element).transitionDuration,animation:getComputedStyle(element).animationDuration}));
  expect(['0s','0.01ms']).toContain(motion.transition);expect(['0s','0.01ms']).toContain(motion.animation);
});

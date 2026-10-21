import {mkdir} from 'node:fs/promises';
import {test,expect,type Page} from '@playwright/test';

const evidence='output/playwright/t07';
test.beforeAll(async()=>{await mkdir(evidence,{recursive:true});});
const cell=(page:Page,row:number,col:number)=>page.locator(`[data-row="${row}"][data-col="${col}"]`);
async function start(page:Page,size:'5'|'9'='5',liberties=false){
  await page.goto('/#/play/partner');
  await page.getByLabel('棋盘尺寸').selectOption(size);
  if(liberties)await page.getByLabel('显示气辅助').check();
  await page.getByRole('button',{name:'双方确认，开始本局'}).click();
}
async function moves(page:Page,points:readonly [number,number][]){for(const [row,col] of points)await cell(page,row,col).click();}

test('opening states the variant, defaults to 9路, and visibly locks joint settings',async({page})=>{
  await page.goto('/#/play/partner');
  await expect(page.getByRole('heading',{level:2,name:'先提到棋子者获胜；这是入门小游戏'})).toBeVisible();
  await expect(page.getByLabel('棋盘尺寸')).toHaveValue('9');
  await expect(page.getByRole('gridcell')).toHaveCount(81);
  await expect(page.getByText(/不计算面积/)).toBeVisible();
  await page.getByLabel('显示气辅助').check();
  await page.getByRole('button',{name:'双方确认，开始本局'}).click();
  await expect(page.getByLabel('棋盘尺寸')).toBeDisabled();
  await expect(page.getByText('当前：黑方 · 伙伴A',{exact:true}).first()).toBeVisible();
  await expect(page.getByText('辅助气环',{exact:true})).toBeVisible();
});

test('black capture ends immediately, explains the last liberty, and mutual undo resumes',async({page})=>{
  await start(page);
  await moves(page,[[1,0],[0,0],[0,1]]);
  await expect(page.locator('.capture-game-page')).toHaveAttribute('data-phase','finished');
  await expect(page.getByRole('heading',{name:'黑方 · 伙伴A获胜'})).toBeVisible();
  await expect(page.getByText(/只剩 1 口气：B5/)).toBeVisible();
  await expect(cell(page,0,0)).toHaveAttribute('data-stone','empty');
  await expect(cell(page,4,4)).toHaveAttribute('aria-disabled','true');
  await page.getByRole('button',{name:'申请悔棋'}).click();
  await expect(page.getByRole('dialog',{name:'双方确认悔棋'})).toBeVisible();
  await page.getByRole('button',{name:'黑方确认悔棋'}).click();
  await expect(page.getByRole('button',{name:'白方确认悔棋'})).toBeVisible();
  await page.getByRole('button',{name:'白方确认悔棋'}).click();
  await expect(page.locator('.capture-game-page')).toHaveAttribute('data-phase','playing');
  await expect(page.locator('.capture-game-page')).toHaveAttribute('data-move-count','2');
  await expect(cell(page,0,0)).toHaveAttribute('data-stone','W');
  await expect(cell(page,0,1)).toHaveAttribute('data-stone','empty');
});

test('white capture wins and invalid occupied play never changes the turn',async({page})=>{
  await start(page);
  await cell(page,0,0).click();
  await expect(page.getByText('当前：白方 · 伙伴B',{exact:true}).first()).toBeVisible();
  await expect(cell(page,0,0)).toHaveAttribute('aria-disabled','true');
  await cell(page,0,0).click({force:true});
  await expect(page.locator('.capture-game-page')).toHaveAttribute('data-move-count','1');
  await expect(page.getByText('当前：白方 · 伙伴B',{exact:true}).first()).toBeVisible();
  await moves(page,[[1,0],[2,2],[0,1]]);
  await expect(page.getByRole('heading',{name:'白方 · 伙伴B获胜'})).toBeVisible();
  await expect(page.locator('.capture-game-page')).toHaveAttribute('data-move-count','4');
});

test('one move can capture a two-stone group and the saved review contains exactly five moves',async({page})=>{
  await start(page);
  await moves(page,[[1,0],[0,0],[1,1],[0,1],[0,2]]);
  await expect(page.getByRole('heading',{name:'黑方 · 伙伴A获胜'})).toBeVisible();
  await expect(page.locator('.step-track li')).toHaveCount(5);
  await expect(page.getByText('第 5 / 5 步',{exact:true})).toBeVisible();
  await expect(page.getByText(/整块被移除/)).toBeVisible();
  await expect(page.locator('[data-marker-kind="target"]')).toHaveCount(2);
});

test('two passes make a no-winner round and swap colors clears every old result and move',async({page})=>{
  await start(page);
  await page.getByRole('button',{name:'停一手'}).click();
  await expect(page.locator('.capture-game-page')).toHaveAttribute('data-phase','playing');
  await page.getByRole('button',{name:'停一手'}).click();
  await expect(page.getByRole('heading',{name:'双方连续停手，本轮无胜者'})).toBeVisible();
  await page.getByRole('button',{name:'交换黑白再来一局'}).click();
  await expect(page.locator('.capture-game-page')).toHaveAttribute('data-phase','playing');
  await expect(page.locator('.capture-game-page')).toHaveAttribute('data-move-count','0');
  await expect(page.getByText('当前：黑方 · 伙伴B',{exact:true}).first()).toBeVisible();
  await expect(cell(page,0,0)).toHaveAttribute('data-stone','empty');
  await expect(page.locator('.capture-finish')).toHaveCount(0);
});

test('refusing undo keeps the same board and revision',async({page})=>{
  await start(page);await cell(page,2,2).click();
  const revision=await page.locator('.capture-game-page').getAttribute('data-game-revision');
  await page.getByRole('button',{name:'申请悔棋'}).click();
  await page.getByRole('button',{name:'拒绝，保留当前局面'}).click();
  await expect(cell(page,2,2)).toHaveAttribute('data-stone','B');
  await expect(page.locator('.capture-game-page')).toHaveAttribute('data-move-count','1');
  await expect(page.locator('.capture-game-page')).toHaveAttribute('data-game-revision',revision!);
  await expect(page.getByText(/原盘面与历史保持不变/)).toBeVisible();
});

test('touch, corner point, keyboard, and synchronous rapid clicks create only intended moves',async({browser})=>{
  const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:360,height:900}});
  const page=await context.newPage();await start(page);
  await cell(page,0,0).tap();
  await expect(cell(page,0,0)).toHaveAttribute('data-stone','B');
  await cell(page,4,4).focus();await page.keyboard.press('Enter');
  await expect(cell(page,4,4)).toHaveAttribute('data-stone','W');
  await page.evaluate(()=>{
    (document.querySelector('[data-row="2"][data-col="1"]') as HTMLElement).click();
    (document.querySelector('[data-row="2"][data-col="2"]') as HTMLElement).click();
  });
  await expect(page.locator('.capture-game-page')).toHaveAttribute('data-move-count','3');
  await expect(cell(page,2,1)).toHaveAttribute('data-stone','B');
  await expect(cell(page,2,2)).toHaveAttribute('data-stone','empty');
  await context.close();
});

test('full 9路 action now opens the installed T08 module',async({page})=>{
  await start(page);await moves(page,[[1,0],[0,0],[0,1]]);
  await page.getByRole('button',{name:'尝试完整 9×9'}).click();
  await expect(page.getByText(/完整小棋盘对弈已经可用/)).toBeVisible();
  await expect(page.locator('.full-game-help a')).toHaveAttribute('href','#/play/full-game');
});

for(const width of [360,768,1280])test(`${width}px capture game is readable and contained`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width,height:1050});await page.goto('/#/play/partner');
  await expect(page.getByRole('heading',{level:1,name:'双人吃子小游戏'})).toBeVisible();
  await expect(page.getByRole('gridcell')).toHaveCount(81);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const controls=await page.locator('.capture-game-controls button,.capture-game-controls select,.capture-game-controls label').evaluateAll(items=>items.filter(item=>{const box=item.getBoundingClientRect();return box.width>0&&box.height>0;}).map(item=>item.getBoundingClientRect().height));
  expect(Math.min(...controls)).toBeGreaterThanOrEqual(39.5);expect(errors).toEqual([]);
  await page.evaluate(()=>{scrollTo(0,0);if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});
  await page.screenshot({path:`${evidence}/${width}-initial.png`,fullPage:true});
});

test('projector, grayscale, and reduced motion retain text and shape cues',async({page})=>{
  await page.setViewportSize({width:1280,height:1050});await page.goto('/#/play/partner');
  await page.getByText('投影模式',{exact:true}).locator('..').getByRole('checkbox').check();
  await page.emulateMedia({reducedMotion:'reduce'});await page.addStyleTag({content:'html{filter:grayscale(1)}'});
  await page.getByLabel('棋盘尺寸').selectOption('5');await page.getByLabel('显示气辅助').check();await page.getByRole('button',{name:'双方确认，开始本局'}).click();
  await moves(page,[[1,0],[0,0],[1,1],[0,1],[0,2]]);
  await expect(page.locator('.learning-app')).toHaveClass(/app-projector/);
  await expect(page.locator('[data-marker-kind="target"]')).toHaveCount(2);
  await expect(page.getByText(/整块被移除/)).toBeVisible();
  await page.screenshot({path:`${evidence}/1280-finished-projector-grayscale.png`,fullPage:true});
});

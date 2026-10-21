import {mkdir} from 'node:fs/promises';
import {test,expect,type Page} from '@playwright/test';

const evidence='output/playwright/t08';
test.beforeAll(async()=>{await mkdir(evidence,{recursive:true});});
const cell=(page:Page,row:number,col:number)=>page.locator(`[data-row="${row}"][data-col="${col}"]`);
async function start(page:Page){await page.goto('/#/play/full-game');await page.getByRole('button',{name:'验证设置并开始对局'}).click();}
async function twoStoneScoring(page:Page){await start(page);await cell(page,0,0).click();await cell(page,8,8).click();await page.getByRole('button',{name:'停一手'}).click();await page.getByRole('button',{name:'停一手'}).click();}

test('setup defaults to 9路 and 0 komi, supports 13/19, and warns before discarding handicap',async({page})=>{
  await page.goto('/#/play/full-game');
  await expect(page.locator('.full-game-page')).toHaveAttribute('data-view','setup');
  await expect(page.getByLabel('棋盘尺寸')).toHaveValue('9');await expect(page.getByLabel('白方贴目')).toHaveValue('0');await expect(page.getByRole('gridcell')).toHaveCount(81);
  await page.getByLabel('本社团自由放置让子').check();await cell(page,4,4).click();await expect(cell(page,4,4)).toHaveAttribute('data-stone','B');
  await page.getByLabel('棋盘尺寸').selectOption('13');await expect(page.getByRole('dialog',{name:'清除已摆起始黑子？'})).toBeVisible();await page.getByRole('button',{name:'取消'}).click();
  await expect(page.getByLabel('棋盘尺寸')).toHaveValue('9');await expect(cell(page,4,4)).toHaveAttribute('data-stone','B');
  await page.getByLabel('棋盘尺寸').selectOption('13');await page.getByRole('button',{name:'确认清除并更改'}).click();await expect(page.getByRole('gridcell')).toHaveCount(169);
  await page.getByLabel('棋盘尺寸').selectOption('19');await expect(page.getByRole('gridcell')).toHaveCount(361);
});

test('free placement handicap is explicitly local and starts with white after validation',async({page})=>{
  await page.goto('/#/play/full-game');await page.getByLabel('本社团自由放置让子').check();
  await expect(page.getByText(/不是正式固定让子规则/)).toBeVisible();await cell(page,4,4).click();await page.getByRole('button',{name:'验证设置并开始对局'}).click();
  await expect(page.locator('.full-game-page')).toHaveAttribute('data-phase','playing');await expect(page.getByText('当前：白方',{exact:true}).first()).toBeVisible();
  await expect(page.getByLabel('白方贴目')).toHaveCount(0);await expect(cell(page,4,4)).toHaveAttribute('data-stone','B');
});

test('a complete game reaches scoring, resets stale confirmation on a mark change, and finalizes only after both confirm',async({page})=>{
  await twoStoneScoring(page);await expect(page.locator('.full-game-page')).toHaveAttribute('data-phase','scoring');
  await expect(page.getByRole('heading',{name:'面积计分预览'})).toBeVisible();await expect(page.getByText('79',{exact:true})).toBeVisible();
  await expect(page.getByText(/不是自动死活判断/)).toBeVisible();
  await page.getByRole('button',{name:'黑方确认当前死子与中立点'}).click();await expect(page.getByRole('button',{name:'白方确认同一份清单'})).toBeVisible();
  await cell(page,0,0).click();await expect(page.locator('[data-marker-kind="target"]')).toHaveCount(1);await expect(page.getByRole('button',{name:'黑方确认当前死子与中立点'})).toBeVisible();
  await page.getByRole('button',{name:'黑方确认当前死子与中立点'}).click();await page.getByRole('button',{name:'白方确认同一份清单'}).click();
  await expect(page.locator('.full-game-page')).toHaveAttribute('data-phase','finished');await expect(page.getByRole('heading',{name:'最终面积计分'})).toBeVisible();await expect(page.getByText('白方领先 81 目')).toBeVisible();
  await expect(cell(page,0,0)).toHaveAttribute('data-stone','B');await expect(page.getByText(/面积计分不把提子数再加一次/)).toBeVisible();
  await page.evaluate(()=>{scrollTo(0,0);if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});await page.screenshot({path:`${evidence}/1280-final-score.png`,fullPage:true});
});

test('dispute resume preserves the original board and returns to live play',async({page})=>{
  await twoStoneScoring(page);await page.getByRole('button',{name:'白方提出争议并恢复'}).click();
  await expect(page.locator('.full-game-page')).toHaveAttribute('data-phase','playing');await expect(cell(page,0,0)).toHaveAttribute('data-stone','B');await expect(cell(page,8,8)).toHaveAttribute('data-stone','W');
  await expect(page.getByText(/连续停手清零，重复历史保留/)).toBeVisible();await cell(page,4,4).click();await expect(page.locator('.full-game-page')).toHaveAttribute('data-move-count','6');
});

test('mutual undo from terminal confirmation restores the state before the second pass',async({page})=>{
  await twoStoneScoring(page);await page.getByRole('button',{name:'申请撤回终局前操作'}).click();await page.getByRole('button',{name:'黑方确认悔棋'}).click();await page.getByRole('button',{name:'白方确认悔棋'}).click();
  await expect(page.locator('.full-game-page')).toHaveAttribute('data-phase','playing');await expect(page.locator('.full-game-page')).toHaveAttribute('data-move-count','3');
  await cell(page,4,4).click();await expect(page.locator('.full-game-page')).toHaveAttribute('data-move-count','4');
});

test('resignation records no invented score and can be mutually undone',async({page})=>{
  await start(page);await page.getByRole('button',{name:'认输'}).click();await page.getByRole('button',{name:'确认认输'}).click();
  await expect(page.locator('.full-game-page')).toHaveAttribute('data-phase','finished');await expect(page.getByText(/认输只记录胜方，不编造面积分/)).toBeVisible();await expect(page.locator('.score-details')).toHaveCount(0);
  await page.getByRole('button',{name:'申请悔棋'}).click();await page.getByRole('button',{name:'黑方确认悔棋'}).click();await page.getByRole('button',{name:'白方确认悔棋'}).click();await expect(page.locator('.full-game-page')).toHaveAttribute('data-phase','playing');
});

test('history browsing is read-only and requires an explicit return before continuing',async({page})=>{
  await start(page);await cell(page,0,0).click();await cell(page,8,8).click();const revision=await page.locator('.full-game-page').getAttribute('data-game-revision');
  await page.getByRole('button',{name:'回退到上一步'}).click();await page.getByRole('button',{name:'回退到上一步'}).click();await expect(page.getByText(/只读复盘 · 开局设置/).first()).toBeVisible();
  await expect(cell(page,4,4)).toHaveAttribute('aria-disabled','true');await cell(page,4,4).click({force:true});await expect(page.locator('.full-game-page')).toHaveAttribute('data-game-revision',revision!);
  await page.getByRole('button',{name:'返回当前局面继续'}).click();await cell(page,4,4).click();await expect(page.locator('.full-game-page')).toHaveAttribute('data-move-count','3');
});

test('saved game reloads by verified replay on this device',async({page})=>{
  await start(page);await cell(page,0,0).click();await cell(page,8,8).click();await page.getByRole('button',{name:'保存到当前设备'}).click();await expect(page.getByText(/完整可重放对局保存/)).toBeVisible();
  await page.reload();await expect(page.locator('.full-game-page')).toHaveAttribute('data-view','game');
  await expect(page.locator('.full-game-page')).toHaveAttribute('data-move-count','2');await expect(cell(page,0,0)).toHaveAttribute('data-stone','B');await expect(page.getByText(/按规则重放验证完整对局/)).toBeVisible();
});

for(const width of [360,768,1280])test(`${width}px layout remains readable`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.setViewportSize({width,height:1050});await page.goto('/#/play/full-game');
  await expect(page.getByRole('heading',{level:1,name:'完整小棋盘对弈'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const heights=await page.locator('.full-game-controls button,.full-game-controls select,.full-game-controls input[type="number"]').evaluateAll(items=>items.filter(item=>{const box=item.getBoundingClientRect();return box.width>0&&box.height>0;}).map(item=>item.getBoundingClientRect().height));expect(Math.min(...heights)).toBeGreaterThanOrEqual(39.5);expect(errors).toEqual([]);
  await page.screenshot({path:`${evidence}/${width}-setup.png`,fullPage:true});
});

test('19路 small-screen local scrolling, projector, grayscale, reduced motion, and keyboard remain usable',async({browser})=>{
  const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:360,height:900},reducedMotion:'reduce'});const page=await context.newPage();await page.goto('/#/play/full-game');await page.getByLabel('棋盘尺寸').selectOption('19');
  const viewport=page.locator('.board-viewport');await expect(viewport).toHaveCSS('overflow-x','auto');expect(await viewport.evaluate(node=>node.scrollWidth>node.clientWidth)).toBe(true);
  await cell(page,18,18).focus();await page.keyboard.press('Enter');await expect(page.locator('.full-game-page')).toHaveAttribute('data-view','setup');
  await page.getByText('投影模式',{exact:true}).locator('..').getByRole('checkbox').check();await page.addStyleTag({content:'html{filter:grayscale(1)}'});await expect(page.locator('.learning-app')).toHaveClass(/app-projector/);
  await page.evaluate(()=>{scrollTo(0,0);if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});await page.screenshot({path:`${evidence}/360-19x19-projector-grayscale.png`,fullPage:true});await context.close();
});

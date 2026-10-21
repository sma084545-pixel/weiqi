import {mkdir} from 'node:fs/promises';
import {expect,test,type Page} from '@playwright/test';
const shot='output/playwright/free-play';
const cell=(page:Page,row:number,col:number)=>page.locator(`[data-row="${row}"][data-col="${col}"]`);
const ready=async(page:Page,size='5',komi='0')=>{await page.goto('/#/play/free');await page.getByLabel('棋盘尺寸').selectOption(size);await page.getByLabel('白方贴目').fill(komi);await page.getByRole('button',{name:'验证设置并开始对局'}).click();};
const end=async(page:Page)=>{await page.getByRole('button',{name:'停一手'}).click();await page.getByRole('button',{name:'停一手'}).click();await expect(page.getByTestId('free-play-result')).toHaveCount(0);await page.getByRole('button',{name:'黑方确认当前死子与中立点'}).click();await page.getByRole('button',{name:'白方确认同一份清单'}).click();};
test.beforeAll(async()=>{await mkdir(shot,{recursive:true});});
test('home partner card and top navigation open the playable board directly',async({page})=>{
 await page.goto('/');await page.locator('.entry-partner').getByRole('link',{name:/开始对弈/}).click();await expect(page.getByRole('heading',{name:'自由双人对弈',exact:true})).toBeVisible();
 await expect(page.getByLabel('棋盘尺寸')).toHaveValue('9');
 await expect(page.getByLabel('棋盘尺寸').locator('option')).toHaveText(['5路（小棋盘练习）','9路（默认）','13路','19路']);
 await page.getByRole('link',{name:'← 返回学习入口'}).click();await page.getByRole('navigation',{name:'主要导航'}).getByRole('link',{name:'双人对弈'}).click();await expect(page).toHaveURL(/#\/play\/free$/);
});
for(const size of [5,9,13,19])test(`${size}x${size}: grid, opposite corners, alternation and refresh recovery`,async({page})=>{
 await ready(page,String(size));await expect(page.getByRole('gridcell')).toHaveCount(size*size);
 await cell(page,0,0).click();await expect(cell(page,0,0)).toHaveAttribute('data-stone','B');await expect(page.locator('.turn-card')).toContainText('当前：白方');
 await cell(page,size-1,size-1).click();await expect(cell(page,size-1,size-1)).toHaveAttribute('data-stone','W');await expect(page.locator('.turn-card')).toContainText('当前：黑方');
 await page.reload();await expect(page.locator('.full-game-page')).toHaveAttribute('data-move-count','2');await expect(page.getByRole('gridcell')).toHaveCount(size*size);
});
test('capture continues full Go; illegal points and fast repeated click keep state valid',async({page})=>{
 await ready(page);for(const [r,c] of [[1,0],[0,0],[0,1]])await cell(page,r,c).click();
 await expect(cell(page,0,0)).toHaveAttribute('data-stone','empty');await expect(page.locator('.full-game-page')).toHaveAttribute('data-phase','playing');
 const revision=await page.locator('.full-game-page').getAttribute('data-game-revision');await cell(page,0,0).click();await expect(page.locator('.full-game-message')).toContainText('无气');await expect(page.locator('.full-game-page')).toHaveAttribute('data-game-revision',revision!);
 await expect(cell(page,0,1)).toHaveAttribute('aria-label',/占用，不可落/);await cell(page,0,1).click({force:true});await expect(page.locator('.full-game-page')).toHaveAttribute('data-game-revision',revision!);await expect(page.locator('.turn-card')).toContainText('当前：白方');
 await cell(page,4,4).evaluate((node:HTMLElement)=>{node.click();node.click();});await expect(page.locator('.full-game-page')).toHaveAttribute('data-move-count','4');await expect(cell(page,4,4)).toHaveAttribute('data-stone','W');
});
for(const [komi,winner,whiteTotal] of [['0','黑方获胜','1'],['1','和棋','2'],['1.5','白方获胜','2.5']])test(`automatic final score: ${winner}, opening komi ${komi}`,async({page})=>{
 await ready(page,'5',komi);for(const [r,c] of [[0,0],[4,4],[0,1]])await cell(page,r,c).click();await end(page);
 await expect(page.getByTestId('free-play-result').getByRole('heading',{name:winner,exact:true})).toBeVisible();await expect(page.getByTestId('free-play-result')).toContainText(`黑方 2 分 · 白方 ${whiteTotal} 分`);
 await expect(page.locator('.full-game-page')).toHaveAttribute('data-phase','finished');await cell(page,2,2).click({force:true});await expect(cell(page,2,2)).toHaveAttribute('data-stone','empty');
 if(komi==='0'){await page.evaluate(()=>{scrollTo(0,0);if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});await page.screenshot({path:`${shot}/final-score.png`,fullPage:true});}
});
test('resignation produces winner immediately, agreed undo recovers, old address keeps the same game',async({page})=>{
 await ready(page);await cell(page,0,0).click();await page.getByRole('button',{name:'认输',exact:true}).click();await page.getByRole('button',{name:'确认认输'}).click();
 await expect(page.getByTestId('free-play-result')).toContainText('黑方获胜');await expect(page.locator('.score-details')).toHaveCount(0);
 await page.getByRole('button',{name:'申请悔棋'}).click();await page.getByRole('button',{name:'黑方确认悔棋'}).click();await page.getByRole('button',{name:'白方确认悔棋'}).click();await expect(page.locator('.full-game-page')).toHaveAttribute('data-phase','playing');
 await page.goto('/#/play/full-game');await expect(page.getByRole('heading',{name:'完整小棋盘对弈',exact:true})).toBeVisible();await expect(cell(page,0,0)).toHaveAttribute('data-stone','B');
});
for(const width of [360,768,1280])test(`${width}px layout, keyboard turn and reduced motion`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});await ready(page,'9');
 await cell(page,0,0).focus();await page.keyboard.press('Enter');await page.keyboard.press('ArrowRight');await page.keyboard.press('Space');
 await expect(cell(page,0,0)).toHaveAttribute('data-stone','B');await expect(cell(page,0,1)).toHaveAttribute('data-stone','W');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.evaluate(()=>{scrollTo(0,0);if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});await page.screenshot({path:`${shot}/${width}-board.png`,fullPage:true});
});
test('touch on a locally scrolling 19x19 board and offline refresh',async({browser})=>{
 const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:360,height:900}});const page=await context.newPage();await page.goto('/#/teacher/offline-data');await expect(page.getByRole('heading',{name:'已可离线'})).toBeVisible({timeout:20000});
 await ready(page,'19');await cell(page,0,0).tap();await cell(page,18,18).scrollIntoViewIfNeeded();await cell(page,18,18).tap();await expect(cell(page,18,18)).toHaveAttribute('data-stone','W');
 const viewport=page.locator('.board-viewport');expect(await viewport.evaluate(e=>e.scrollWidth>e.clientWidth)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await context.setOffline(true);await page.reload();await expect(page.getByRole('heading',{name:'自由双人对弈',exact:true})).toBeVisible();await expect(page.locator('.full-game-page')).toHaveAttribute('data-move-count','2');
 await page.screenshot({path:`${shot}/360-touch-19-offline.png`,fullPage:true});await context.close();
});

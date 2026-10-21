import {mkdir} from 'node:fs/promises';
import {expect,test,type Page} from '@playwright/test';
const evidence=process.env.HISTORY_EVIDENCE_ROOT??'output/playwright/history';
const cell=(page:Page,row:number,col:number)=>page.locator(`[data-row="${row}"][data-col="${col}"]`);
const slider=(page:Page)=>page.getByRole('slider',{name:'棋局滑动条',exact:true});
const seek=async(page:Page,index:number)=>{await slider(page).focus();await slider(page).press('Home');for(let i=0;i<index;i++)await slider(page).press('ArrowRight');};
const current=async(page:Page)=>slider(page).press('End');
const startFull=async(page:Page,size=5,route='/#/play/free')=>{await page.goto(route);await page.getByLabel('棋盘尺寸').selectOption(String(size));await page.getByRole('button',{name:'验证设置并开始对局'}).click();};
const moves=async(page:Page,points:number[][])=>{for(const [row,col] of points)await cell(page,row,col).click();};
const openPuzzle=async(page:Page,id:string)=>{await page.goto('/#/challenges');await page.locator('.puzzle-card').filter({hasText:id}).getByRole('button',{name:/作答/}).click();};
test.beforeAll(async()=>{await mkdir(evidence,{recursive:true});});

for(const route of ['/#/play/free','/#/play/full-game'])test(`${route} capture history, native live drag, return and refresh preserve the actual game`,async({page})=>{
  await startFull(page,5,route);await moves(page,[[1,0],[0,0],[0,1]]);
  const game=page.locator('.full-game-page'),revision=await game.getAttribute('data-game-revision');
  await expect(slider(page)).toHaveValue('3');await page.getByRole('button',{name:'回退到上一步'}).click();
  await expect(cell(page,0,0)).toHaveAttribute('data-stone','W');await expect(cell(page,0,1)).toHaveAttribute('data-stone','empty');
  await expect(page.locator('.timeline-position')).toContainText('下一手：黑方');await expect(page.locator('.timeline-position')).toContainText('提子：黑 0');
  await cell(page,4,4).click({force:true});await expect(game).toHaveAttribute('data-game-revision',revision!);await expect(cell(page,4,4)).toHaveAttribute('data-stone','empty');
  // Move the native thumb while held. The rendered board must update before mouseup.
  await current(page);const box=(await slider(page).boundingBox())!;
  await page.mouse.move(box.x+box.width-8,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+8,box.y+box.height/2,{steps:5});
  await expect(slider(page)).toHaveValue('0');await expect(cell(page,1,0)).toHaveAttribute('data-stone','empty');await page.mouse.up();
  await page.getByRole('button',{name:'返回当前局面继续'}).click();await expect(cell(page,0,0)).toHaveAttribute('data-stone','empty');await expect(page.locator('.timeline-position')).toContainText('提子：黑 1');
  await cell(page,4,4).click();await expect(cell(page,4,4)).toHaveAttribute('data-stone','W');await expect(slider(page)).toHaveValue('4');
  await seek(page,1);await page.reload();await expect(slider(page)).toHaveValue('4');await expect(game).toHaveAttribute('data-move-count','4');
});

test('final score, passes and dispute are history steps, not preview removals; actual agreed undo resets range',async({page})=>{
  await startFull(page);await moves(page,[[0,0],[4,4]]);
  await page.getByRole('button',{name:'停一手',exact:true}).click();await page.getByRole('button',{name:'停一手',exact:true}).click();
  await page.getByRole('button',{name:'白方提出争议并恢复'}).click();await expect(slider(page)).toHaveAttribute('max','5');
  await seek(page,4);await expect(page.locator('.timeline-position')).toContainText('终局确认中');await expect(page.locator('.timeline-position')).toContainText('连续停手 2');
  await expect(page.locator('.score-details')).toHaveCount(0);await current(page);await expect(page.locator('.timeline-position')).toContainText('连续停手 0');
  await page.getByRole('button',{name:'停一手',exact:true}).click();await page.getByRole('button',{name:'停一手',exact:true}).click();await cell(page,0,0).click();
  await page.getByRole('button',{name:'黑方确认当前死子与中立点'}).click();await page.getByRole('button',{name:'白方确认同一份清单'}).click();
  await expect(slider(page)).toHaveAttribute('max','8');await expect(page.getByTestId('free-play-result')).toBeVisible();
  await seek(page,2);await expect(cell(page,0,0)).toHaveAttribute('data-stone','B');await expect(page.locator('[data-marker-kind="target"]')).toHaveCount(0);await expect(page.getByTestId('free-play-result')).toHaveCount(0);
  await current(page);await page.getByRole('button',{name:'申请悔棋'}).click();await page.getByRole('button',{name:'黑方确认悔棋'}).click();await page.getByRole('button',{name:'白方确认悔棋'}).click();
  await expect(slider(page)).toHaveAttribute('max','7');await expect(slider(page)).toHaveValue('7');await expect(page.locator('.full-game-page')).toHaveAttribute('data-phase','scoring');
});

test('Capture Go browses the whole round during play and beyond the last-five review; agreed undo and restart reset it',async({page})=>{
  await page.goto('/#/play/partner');await page.getByLabel('棋盘尺寸').selectOption('5');await page.getByRole('button',{name:'双方确认，开始本局'}).click();
  await moves(page,[[1,0],[0,0],[4,4],[4,3],[0,1]]);await expect(page.locator('.capture-game-page')).toHaveAttribute('data-phase','finished');
  await seek(page,2);await expect(cell(page,0,0)).toHaveAttribute('data-stone','W');await expect(page.locator('[data-marker-kind="target"]')).toHaveCount(0);
  await page.getByRole('button',{name:'回到开局'}).click();await expect(cell(page,1,0)).toHaveAttribute('data-stone','empty');await current(page);
  await page.getByRole('button',{name:'申请悔棋'}).click();await page.getByRole('button',{name:'黑方确认悔棋'}).click();await page.getByRole('button',{name:'白方确认悔棋'}).click();
  await expect(slider(page)).toHaveValue('4');await expect(page.locator('.capture-game-page')).toHaveAttribute('data-phase','playing');await expect(cell(page,0,0)).toHaveAttribute('data-stone','W');
  await page.getByRole('button',{name:'回退到上一步'}).click();await expect(page.getByRole('button',{name:'停一手',exact:true})).toBeDisabled();await current(page);
  await cell(page,0,1).click();await expect(page.locator('.capture-game-page')).toHaveAttribute('data-phase','finished');await page.getByRole('button',{name:'交换黑白再来一局'}).click();await expect(slider(page)).toHaveValue('0');await expect(slider(page)).toBeDisabled();
  await moves(page,[[0,0],[4,4],[0,1],[4,3],[1,0],[3,4],[1,1]]);await seek(page,1);await expect(slider(page)).toHaveAttribute('max','7');await expect(cell(page,0,0)).toHaveAttribute('data-stone','B');await expect(cell(page,4,4)).toHaveAttribute('data-stone','empty');
});

test('experiment setup remains a fresh root, game undo/redo and branching refresh the slider',async({page})=>{
  await page.goto('/#/board/experiment');await cell(page,4,4).click();await page.getByText(/确认把当前盘面作为新起点/).click();await page.getByRole('button',{name:'从当前局面开始按规则试下'}).click();
  await moves(page,[[0,0],[8,8]]);await seek(page,0);await expect(cell(page,4,4)).toHaveAttribute('data-stone','B');await expect(cell(page,0,0)).toHaveAttribute('data-stone','empty');
  await expect(page.getByRole('button',{name:'撤回对局'})).toBeDisabled();await expect(page.getByRole('button',{name:'把当前盘面带回摆棋示意'})).toBeDisabled();
  await current(page);await page.getByRole('button',{name:'撤回对局'}).click();await expect(slider(page)).toHaveValue('1');await expect(cell(page,8,8)).toHaveAttribute('data-stone','empty');
  await page.getByRole('button',{name:'重做对局'}).click();await expect(slider(page)).toHaveValue('2');await page.getByRole('button',{name:'撤回对局'}).click();await cell(page,8,7).click();await expect(page.getByRole('button',{name:'重做对局'})).toBeDisabled();
  await seek(page,2);await expect(cell(page,8,7)).toHaveAttribute('data-stone','W');await expect(cell(page,8,8)).toHaveAttribute('data-stone','empty');
});

test('puzzle variations and free trial browse independently without changing attempts or leaving a reply behind',async({page})=>{
  await openPuzzle(page,'CAP-001');await cell(page,1,3).click();await expect(page.getByText('正在播放题目回应…')).toBeVisible();await expect(slider(page)).toBeDisabled();await expect(page.getByRole('button',{name:'自由试下',exact:true})).toBeDisabled();
  await expect(cell(page,2,3)).toHaveAttribute('data-stone','W');await expect(slider(page)).toHaveValue('2');
  await seek(page,1);await expect(cell(page,2,3)).toHaveAttribute('data-stone','empty');await expect(page.getByText('题目中的合法反驳已经走出。')).toHaveCount(0);
  await current(page);await page.getByRole('button',{name:'回退一步',exact:true}).click();await expect(slider(page)).toHaveValue('1');await expect(cell(page,2,3)).toHaveAttribute('data-stone','empty');
  await page.getByRole('button',{name:'重置本题'}).click();await expect(slider(page)).toHaveValue('0');await page.getByRole('button',{name:'自由试下',exact:true}).click();
  await moves(page,[[4,4],[4,3]]);await seek(page,1);await expect(cell(page,4,3)).toHaveAttribute('data-stone','empty');await current(page);await page.getByRole('button',{name:'回退一步',exact:true}).click();await expect(slider(page)).toHaveValue('1');
  await page.getByRole('button',{name:'结束试下，返回题目'}).click();await expect(slider(page)).toHaveValue('0');await expect(cell(page,4,4)).toHaveAttribute('data-stone','empty');
  await cell(page,1,3).click();await page.getByRole('button',{name:'下一题 →'}).click();await expect(slider(page)).toHaveValue('0');await page.waitForTimeout(650);await expect(slider(page)).toHaveValue('0');
});

test('teacher answer path allows forward review after going back and preserves previous branches',async({page})=>{
  await page.goto('/#/teacher/editor');await page.getByRole('button',{name:/一步提子模板/}).click();const tree=page.locator('.tree-editor');
  await tree.getByLabel('节点结论').selectOption('unknown');await tree.getByLabel('本步解释').fill('开发检查用合法着法。');
  await tree.locator('[data-row="0"][data-col="0"]').click();await tree.getByLabel('本步解释').fill('另一方的合法回应。');await tree.locator('[data-row="4"][data-col="4"]').click();
  await expect(slider(page)).toHaveValue('2');const nodes=await tree.locator('.node-list button').count();await seek(page,0);await expect(tree.locator('[data-row="0"][data-col="0"]')).toHaveAttribute('data-stone','empty');
  await current(page);await expect(tree.locator('[data-row="4"][data-col="4"]')).toHaveAttribute('data-stone','W');await expect(tree.locator('.node-list button')).toHaveCount(nodes);
  await seek(page,1);await tree.getByLabel('本步解释').fill('在较早节点新建另一分支。');await tree.locator('[data-row="4"][data-col="3"]').click();await expect(tree.locator('.node-list button')).toHaveCount(nodes+1);await expect(slider(page)).toHaveValue('2');
});

test('component play example also offers the shared timeline',async({page})=>{
  await page.goto('/#/board-lab');await page.getByLabel(/落子棋盘/).check();await moves(page,[[0,0],[8,8]]);await seek(page,1);await expect(cell(page,8,8)).toHaveAttribute('data-stone','empty');await current(page);await expect(cell(page,8,8)).toHaveAttribute('data-stone','W');
});

for(const width of [360,768,1280])test(`${width}px timeline with keyboard, no page overflow and no animation`,async({page})=>{
  await page.setViewportSize({width,height:950});await page.emulateMedia({reducedMotion:'reduce'});await startFull(page,9);await moves(page,[[0,0],[8,8],[4,4]]);
  await slider(page).focus();await slider(page).press('ArrowLeft');await expect(slider(page)).toHaveValue('2');await expect(cell(page,4,4)).toHaveAttribute('data-stone','empty');
  await expect(slider(page)).toBeFocused();await slider(page).press('Home');await expect(slider(page)).toHaveValue('0');await slider(page).press('End');await expect(slider(page)).toHaveValue('3');
  await seek(page,2);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();scrollTo(0,0);});await page.screenshot({path:`${evidence}/${width}-history.png`,fullPage:true});
});

test('touch range, 19x19 local scrolling, offline refresh and history recovery',async({browser})=>{
  const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:360,height:900},reducedMotion:'reduce'}),page=await context.newPage();
  await page.goto('/#/teacher/offline-data');await expect(page.getByRole('heading',{name:'已可离线'})).toBeVisible({timeout:20000});await startFull(page,19);
  await cell(page,0,0).tap();await cell(page,18,18).scrollIntoViewIfNeeded();await cell(page,18,18).tap();await slider(page).scrollIntoViewIfNeeded();
  const box=(await slider(page).boundingBox())!;await page.touchscreen.tap(box.x+8,box.y+box.height/2);await expect(slider(page)).toHaveValue('0');await expect(cell(page,0,0)).toHaveAttribute('data-stone','empty');
  await page.getByRole('button',{name:'返回当前局面继续'}).tap();await expect(cell(page,18,18)).toHaveAttribute('data-stone','W');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.locator('.board-viewport').evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);
  await context.setOffline(true);await page.reload();await expect(slider(page)).toHaveValue('2');await seek(page,1);await expect(cell(page,18,18)).toHaveAttribute('data-stone','empty');await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();scrollTo(0,0);});await page.screenshot({path:`${evidence}/360-touch-19-offline.png`,fullPage:true});await context.close();
});

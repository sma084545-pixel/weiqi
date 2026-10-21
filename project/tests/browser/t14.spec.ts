import {mkdir,readFile} from 'node:fs/promises';
import {expect,test,type Page} from '@playwright/test';

const evidence='output/playwright/t14';
test.beforeAll(async()=>{await mkdir(evidence,{recursive:true});});
test.beforeEach(async({page})=>{await page.goto('/#/teacher/editor');await page.evaluate(()=>localStorage.clear());await page.reload();});

async function fillBlankNumberPuzzle(page:Page){
  await page.getByRole('button',{name:'新建空白题'}).click();
  await page.getByLabel('题目 ID').fill('TEST-LIB-BLANK');
  await page.getByLabel('列表标题').fill('自制中心数气');
  await page.getByLabel('学习目标').fill('识别中心单子的四口正交相邻气。');
  await page.getByLabel('难度理由').fill('单颗中心棋，只有一次整数计数。');
  await page.getByRole('textbox',{name:/^题干必填/}).fill('请数出目标黑子的气。');
  await page.locator('.editor-section').filter({hasText:'摆棋与目标标记'}).locator('[data-row="2"][data-col="2"]').click();
  await page.getByRole('button',{name:'目标三角'}).click();
  await page.locator('.editor-section').filter({hasText:'摆棋与目标标记'}).locator('[data-row="2"][data-col="2"]').click();
  await page.getByLabel('提示 1：观察什么').fill('观察目标棋上下左右的空点。');
  await page.getByLabel('提示 2：考虑关系').fill('斜角不算气，同一点只计一次。');
  await page.getByLabel('提示 3：关键步骤').fill('逐个标出正交相邻空点再计数。');
  await page.getByLabel('核查数字').fill('4');
  await page.getByLabel('答案解释').fill('中心单子上下左右共有四口气。');
  await page.getByLabel('解答核查方法').fill('先独立手算，再用 T01 getLiberties 核对为四个坐标。');
  await page.getByText('我明确自报：已经按上面的方法核查解答').click();
}

test('teacher view opens the local editor and explains its access boundary',async({page})=>{
  await page.goto('/#/teacher');
  await expect(page.getByRole('link',{name:'打开教师出题编辑器'})).toHaveAttribute('href','#/teacher/editor');
  await page.getByRole('link',{name:'打开教师出题编辑器'}).click();
  await expect(page.getByRole('heading',{name:'教师出题与答案变化编辑器'})).toBeVisible();
  await expect(page.getByText(/这里不是账号权限区，也没有“教师密码”/)).toBeVisible();
  await expect(page.locator('.template-row button')).toHaveCount(4);
});

test('a number puzzle can be authored, checked, saved, refreshed and loaded by the actual T10 catalog',async({page})=>{
  await fillBlankNumberPuzzle(page);
  await page.getByRole('button',{name:'运行自动检查'}).click();
  await expect(page.getByRole('heading',{name:'自动检查通过'})).toBeVisible();
  await expect(page.getByText(/不会证明答案完备/).first()).toBeVisible();
  await page.getByRole('button',{name:'发布到本机 T10'}).click();
  await expect(page.getByText(/已发布到当前设备/)).toBeVisible();
  await page.reload();
  await expect(page.getByText('自制中心数气').first()).toBeVisible();
  await page.goto('/#/challenges');
  await expect(page.getByText(/另含当前设备发布的 1 道本机题/)).toBeVisible();
  const card=page.locator('.puzzle-card').filter({hasText:'TEST-LIB-BLANK'});
  await expect(card).toContainText('自制中心数气');
  await card.getByRole('button',{name:/开始作答/}).click();
  await expect(page.getByRole('heading',{name:'自制中心数气'})).toBeVisible();
  await expect(page.getByText('solutionChecked')).toHaveCount(0);
});

test('student preview uses T10 and returns to the unchanged draft',async({page})=>{
  await page.getByRole('button',{name:/数气模板/}).click();
  await page.getByLabel('列表标题').fill('未保存预览标题');
  await page.getByRole('button',{name:'切换到学生预览'}).click();
  await expect(page.getByText('这是 T10 真实播放器')).toBeVisible();
  await expect(page.getByText('solutionChecked')).toHaveCount(0);
  await expect(page.getByText('humanReviewed')).toHaveCount(0);
  await page.getByRole('button',{name:/返回同一草稿继续编辑/}).click();
  await expect(page.getByLabel('列表标题')).toHaveValue('未保存预览标题');
});

test('tree editor rejects an occupied point atomically and can save an unknown branch',async({page})=>{
  await page.getByRole('button',{name:/一步提子模板/}).click();
  await expect(page.getByText('2 个节点')).toBeVisible();
  await page.getByLabel('节点结论').selectOption('unknown');
  await page.getByRole('combobox',{name:/^死活终点/}).selectOption('unknown');
  await page.getByLabel('本步解释').fill('这是合法试下，但模板没有覆盖后续。');
  const occupied=page.locator('.tree-editor [data-row="2"][data-col="2"]');
  await expect(occupied).toHaveAttribute('aria-disabled','true');
  await occupied.press('Enter');
  await expect(page.getByText('2 个节点')).toBeVisible();
  await page.locator('.tree-editor [data-row="0"][data-col="0"]').click();
  await expect(page.getByText('3 个节点')).toBeVisible();
  await expect(page.locator('.node-list')).toContainText('unknown');
});

test('official content stays read-only until copy or revision and soft deletion is reversible',async({page})=>{
  await page.locator('.official-row select').selectOption('LIB-001');
  await expect(page.getByText(/正式题只读视图/)).toBeVisible();
  await expect(page.getByLabel('题目 ID')).toBeDisabled();
  await page.getByRole('button',{name:'明确创建新 revision'}).click();
  await expect(page.getByLabel('Revision')).toHaveValue('2');
  await expect(page.getByLabel('题目 ID')).toBeEnabled();
  await page.getByRole('button',{name:'保存草稿'}).click();
  const local=page.locator('.draft-list article').filter({hasText:'LIB-001@2'});
  await expect(local).toBeVisible();
  await local.getByRole('button',{name:'软删除'}).click();
  await page.getByText('显示已软删除',{exact:true}).click();
  await expect(page.locator('.draft-list article.deleted').filter({hasText:'LIB-001@2'})).toBeVisible();
  await page.locator('.draft-list article.deleted').filter({hasText:'LIB-001@2'}).getByRole('button',{name:'恢复'}).click();
  await expect(page.locator('.draft-list article').filter({hasText:'LIB-001@2'})).not.toHaveClass(/deleted/);
});

test('Puzzle and Bundle downloads preserve schema identity',async({page})=>{
  await page.getByRole('button',{name:/数气模板/}).click();
  const puzzleDownload=page.waitForEvent('download');await page.getByRole('button',{name:'导出 Puzzle JSON'}).click();
  const puzzle=JSON.parse(await readFile((await (await puzzleDownload).path())!,'utf8'));
  expect(puzzle).toMatchObject({schemaVersion:1,id:'TEMPLATE-LIB-001',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Puzzle'});
  const bundleDownload=page.waitForEvent('download');await page.getByRole('button',{name:'导出 ContentBundle JSON'}).click();
  const bundle=JSON.parse(await readFile((await (await bundleDownload).path())!,'utf8'));
  expect(bundle).toMatchObject({schemaVersion:1,rulesetId:'GO-CLUB-AREA-1',kind:'ContentBundle'});expect(bundle.items).toHaveLength(1);
});

test('360px touch and keyboard author one board point without page overflow',async({browser})=>{
  const context=await browser.newContext({viewport:{width:360,height:800},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const page=await context.newPage();await page.goto('/#/teacher/editor');await page.evaluate(()=>localStorage.clear());await page.reload();
  const board=page.locator('.editor-section').filter({hasText:'摆棋与目标标记'});
  const point=board.locator('[data-row="0"][data-col="0"]');await point.focus();await point.press('Enter');
  await expect(point).toHaveAttribute('data-stone','B');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:evidence+'/360-editor.png',fullPage:true});await context.close();
});

for(const width of [768,1280])test(width+'px editor is readable',async({page})=>{
  await page.setViewportSize({width,height:950});await page.goto('/#/teacher/editor');
  await expect(page.getByRole('heading',{name:'教师出题与答案变化编辑器'})).toBeVisible();
  const geometry=await page.evaluate(()=>({innerWidth,scrollWidth:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll<HTMLElement>('body *')].map(element=>({tag:element.tagName,className:element.className?.toString(),text:(element.textContent??'').trim().slice(0,50),right:Math.round(element.getBoundingClientRect().right),width:Math.round(element.getBoundingClientRect().width)})).filter(item=>item.right>innerWidth+1||item.width>innerWidth+1).slice(0,12)}));
  expect(geometry).toMatchObject({innerWidth:width,scrollWidth:width,offenders:[]});
  await page.screenshot({path:evidence+'/'+width+'-editor.png',fullPage:true});
});

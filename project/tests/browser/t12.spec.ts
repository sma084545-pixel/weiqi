import {mkdir,readFile} from 'node:fs/promises';
import {expect,test,type Page} from '@playwright/test';

const evidence='output/playwright/t12';
test.beforeAll(async()=>{await mkdir(evidence,{recursive:true});});

async function fillDiscussion(page:Page,prefix='第一次'){
  await page.getByLabel('本手目标（新手可写一句）').fill(`${prefix}：照顾目标棋`);
  await page.getByLabel('为什么选它？').fill(`${prefix}：连接关系更清楚`);
  await page.getByLabel('对方可能怎样回应？').fill(`${prefix}：从另一侧靠近`);
  await page.getByLabel('这个回应依据什么？').fill(`${prefix}：那里仍有空点`);
  await page.getByLabel('先复述同伴的一项理由').fill(`${prefix}：同伴重视外侧发展`);
  await page.getByLabel('修改原想法').check();
  await page.getByLabel('共同写下现在的想法').fill(`${prefix}：连接后再观察回应`);
  await page.getByLabel('我们自行记录：同伴有解释机会').check();
}

test('stage 6 and teacher view expose the installed cooperative route',async({page})=>{
  await page.goto('/#/route/STAGE-06');await expect(page.getByText(/同伴合作挑战（T12）/)).toBeVisible();await page.getByRole('link',{name:'进入同伴合作挑战'}).click();
  await expect(page).toHaveURL(/#\/challenges\/together$/);await expect(page.getByRole('heading',{name:'一人提出计划，一人寻找回应'})).toBeVisible();
  await expect(page.getByText('开放讨论 · 不计时 · 不排名')).toBeVisible();await expect(page.getByText(/不是官方双人围棋/)).toBeVisible();
  await page.goto('/#/teacher');await expect(page.getByRole('link',{name:'打开同伴合作挑战'})).toHaveAttribute('href','#/challenges/together');
});

test('all five DISC puzzles run with A and B choices and hide author references until preview',async({page})=>{
  await page.goto('/#/challenges/together');
  for(const id of ['DISC-001','DISC-002','DISC-003','DISC-004','DISC-005']){await page.getByRole('button',{name:id}).click();await expect(page.getByRole('heading',{name:new RegExp(`^${id} ·`)})).toBeVisible();await expect(page.locator('.candidate-field input')).toHaveCount(3);}
  await page.getByRole('button',{name:'DISC-001'}).click();await expect(page.getByText(/E5 立即把两子连通/)).toHaveCount(0);
  await page.getByLabel(/^A · E5 连接/).check();await fillDiscussion(page);await page.getByRole('button',{name:'预览匿名讨论记录'}).click();
  await expect(page.getByRole('heading',{name:'DISC-001 匿名讨论记录'})).toBeVisible();await expect(page.getByText(/E5 立即把两子连通/)).toHaveCount(0);
  await page.getByRole('button',{name:'查看作者讨论参考'}).click();await expect(page.getByText('作者讨论参考 · 不是唯一答案')).toBeVisible();await expect(page.getByText(/E5 立即把两子连通/)).toBeVisible();
});

test('different legal candidates and a self-selected point are discussed without automatic quality verdicts',async({page})=>{
  await page.goto('/#/challenges/together');await page.getByLabel(/^B · C3 发展/).check();await fillDiscussion(page,'B方案');await page.getByRole('button',{name:'预览匿名讨论记录'}).click();
  await expect(page.getByText(/这项动作在当前明确起点合法/)).toBeVisible();expect((await page.locator('main').innerText())).not.toMatch(/观点优秀|战略错误|能力评分/);
  await page.getByRole('button',{name:'DISC-002'}).click();await page.getByLabel('自行提出落点').check();await expect(page.getByText('自选：请在棋盘选择空点')).toBeVisible();
  const selfPoint=page.getByRole('grid',{name:/DISC-002合作挑战棋盘/}).locator('[data-row="0"][data-col="0"]');await selfPoint.click();await expect(page.getByText('自选：A9')).toBeVisible();
  await fillDiscussion(page,'自选');await page.getByRole('button',{name:'预览匿名讨论记录'}).click();await expect(page.getByRole('heading',{name:'DISC-002 匿名讨论记录'})).toBeVisible();
});

test('role switching preserves entries and the three activities keep their local-task boundaries',async({page})=>{
  await page.goto('/#/challenges/together');await page.getByLabel('本手目标（新手可写一句）').fill('先连接目标');await page.getByRole('button',{name:'交换角色'}).click();
  await expect(page.getByText('伙伴 B',{exact:true}).first()).toBeVisible();await expect(page.getByLabel('本手目标（新手可写一句）')).toHaveValue('先连接目标');
  await page.getByRole('button',{name:/救出指定目标棋/}).click();await expect(page.getByRole('heading',{name:/^CON-003 ·/})).toBeVisible();await expect(page.getByText(/不等于整盘好棋/).first()).toBeVisible();
  await page.getByRole('button',{name:/接续解释下一手/}).click();await expect(page.getByRole('heading',{name:/^CON-001 ·/})).toBeVisible();await expect(page.getByText(/不证明棋块永远安全/).first()).toBeVisible();
});

test('multiple local anonymous records persist and deleting one leaves the other',async({page})=>{
  await page.goto('/#/challenges/together');await expect(page.getByText('还没有保存的讨论记录')).toBeVisible();
  await page.getByLabel(/^A · E5 连接/).check();await fillDiscussion(page,'记录一');await page.getByRole('button',{name:'预览匿名讨论记录'}).click();await page.getByRole('button',{name:'确认保存到当前设备'}).click();
  await page.getByRole('button',{name:'DISC-002'}).click();await page.getByLabel(/^B · E5 转向/).check();await fillDiscussion(page,'记录二');await page.getByRole('button',{name:'预览匿名讨论记录'}).click();await page.getByRole('button',{name:'确认保存到当前设备'}).click();
  await expect(page.locator('.saved-discussions li')).toHaveCount(2);await page.reload();await expect(page.locator('.saved-discussions li')).toHaveCount(2);
  await page.locator('.saved-discussions li').first().getByRole('button',{name:'删除这一条'}).click();await page.getByRole('button',{name:'确认删除'}).click();await expect(page.locator('.saved-discussions li')).toHaveCount(1);await expect(page.getByText(/只删除了所选的一条记录/)).toBeVisible();
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'导出记录 JSON'}).click();const download=await downloadPromise;const file=await download.path();expect(file).toBeTruthy();const parsed=JSON.parse(await readFile(file!,'utf8'));expect(parsed).toMatchObject({schemaVersion:1,rulesetId:'GO-CLUB-AREA-1'});expect(parsed.records).toHaveLength(1);
});

test('printable guide download carries the same formal IDs',async({page})=>{
  await page.goto('/#/challenges/together');const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'下载 Markdown'}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toBe('T12-一页合作活动说明.md');const text=await readFile((await download.path())!,'utf8');for(const id of ['DISC-001','DISC-002','DISC-003','DISC-004','DISC-005','CON-003','CON-001'])expect(text).toContain(id);expect(text).toContain('不是官方 Pair Go 赛制');
});

test('360px touch and keyboard can finish a discussion without overflow',async({browser})=>{
  const context=await browser.newContext({viewport:{width:360,height:800},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const page=await context.newPage();await page.goto('/#/challenges/together');
  await page.getByLabel('自行提出落点').tap();const point=page.getByRole('grid',{name:/DISC-001合作挑战棋盘/}).locator('[data-row="0"][data-col="0"]');await point.focus();await point.press('Enter');await fillDiscussion(page,'触屏键盘');await page.getByRole('button',{name:'预览匿名讨论记录'}).tap();await expect(page.getByRole('heading',{name:'DISC-001 匿名讨论记录'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.evaluate(()=>{(document.activeElement as HTMLElement|null)?.blur();scrollTo(0,0);});await page.screenshot({path:`${evidence}/360-cooperative.png`,fullPage:true});await context.close();
});

for(const width of [768,1280])test(`${width}px cooperative page remains readable`,async({page})=>{await page.setViewportSize({width,height:900});await page.goto('/#/challenges/together');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.getByRole('heading',{name:'一人提出计划，一人寻找回应'})).toBeVisible();await page.evaluate(()=>{(document.activeElement as HTMLElement|null)?.blur();scrollTo(0,0);});await page.screenshot({path:`${evidence}/${width}-cooperative.png`,fullPage:true});});

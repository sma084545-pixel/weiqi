import {mkdir} from 'node:fs/promises';
import {test,expect,type Browser,type Page,type BrowserContext} from '@playwright/test';
const evidence=process.env.ONLINE_EVIDENCE_ROOT??'output/playwright/online';
const cell=(page:Page,row:number,col:number)=>page.locator(`[data-row="${row}"][data-col="${col}"]`);
const slider=(page:Page)=>page.getByRole('slider',{name:'棋局滑动条',exact:true});
const seek=async(page:Page,index:number)=>{await slider(page).focus();await slider(page).press('Home');for(let i=0;i<index;i++)await slider(page).press('ArrowRight');};
const count=(page:Page,value:number)=>expect(page.getByTestId('online-game')).toHaveAttribute('data-move-count',String(value));
async function lobby(page:Page){await page.goto('/#/play/online');await expect(page.getByRole('heading',{name:'联机双人对弈',exact:true})).toBeVisible();await expect(page.locator('.connection-badge')).toContainText('服务已连接');}
async function pair(browser:Browser,options:{size?:number;width?:number;touch?:boolean}={}){
  const ac=await browser.newContext({viewport:{width:options.width??1280,height:950},hasTouch:options.touch??false,isMobile:options.touch??false}),bc=await browser.newContext(),a=await ac.newPage(),b=await bc.newPage();
  await lobby(a);await a.getByLabel('昵称（可留空）').fill('TEST 黑方');await a.getByLabel('联机棋盘尺寸').selectOption(String(options.size??5));await a.getByRole('button',{name:'创建房间',exact:true}).click();await expect(a.getByText('你执黑',{exact:true})).toBeVisible();
  const code=await a.getByLabel('当前房间码').inputValue();await expect(a.getByRole('button',{name:'停一手',exact:true})).toBeDisabled();
  await lobby(b);await b.getByLabel('昵称（可留空）').fill('TEST 白方');await b.getByLabel('输入房间码').fill(code);await b.getByRole('button',{name:'加入房间',exact:true}).click();await expect(b.getByText('你执白',{exact:true})).toBeVisible();await expect(a.locator('.online-seat').filter({hasText:'白方'})).toContainText('已连接');
  return {a,b,ac,bc,code,close:async()=>{await ac.close();await bc.close();}};
}
async function play(page:Page,row:number,col:number,next:number,other?:Page){await cell(page,row,col).click();await count(page,next);if(other)await count(other,next);}
async function undo(a:Page,b:Page){await a.getByRole('button',{name:'申请悔棋',exact:true}).click();await expect(b.locator('.online-undo')).toBeVisible();await a.getByRole('button',{name:'黑方确认悔棋',exact:true}).click();await b.getByRole('button',{name:'白方确认悔棋',exact:true}).click();await expect(a.locator('.online-undo')).toHaveCount(0);}
test.beforeAll(async()=>{await mkdir(evidence,{recursive:true});});

test('home and existing same-screen board expose the installed online entry',async({page})=>{
  await page.goto('/');await page.getByRole('link',{name:'创建或加入联机房间'}).click();await expect(page).toHaveURL(/#\/play\/online$/);await expect(page.locator('.connection-badge')).toContainText('服务已连接');
  await page.goto('/#/play/free');await page.getByRole('link',{name:/进入联机对弈/}).click();await expect(page.getByRole('heading',{name:'联机双人对弈',exact:true})).toBeVisible();
});

test('two isolated players synchronize turns/capture, illegal suicide and live history without duplicate moves',async({browser})=>{
  const {a,b,close}=await pair(browser);
  await play(a,1,0,1,b);await expect(cell(b,1,0)).toHaveAttribute('data-stone','B');await expect(a.getByRole('button',{name:'停一手',exact:true})).toBeDisabled();
  await play(b,0,0,2,a);await play(a,0,1,3,b);await expect(cell(a,0,0)).toHaveAttribute('data-stone','empty');await expect(cell(b,0,0)).toHaveAttribute('data-stone','empty');
  await cell(b,0,0).click();await expect(b.locator('.online-message')).toContainText('无气');await count(a,3);await count(b,3);
  await seek(a,2);await expect(cell(a,0,0)).toHaveAttribute('data-stone','W');await expect(cell(b,0,0)).toHaveAttribute('data-stone','empty');await count(b,3);
  await play(b,4,4,4,a);await expect(slider(a)).toHaveValue('4');
  await cell(a,2,2).evaluate((node:HTMLElement)=>{node.click();node.click();});await count(a,5);await count(b,5);
  await a.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();scrollTo(0,0);});await a.screenshot({path:`${evidence}/1280-live-room.png`,fullPage:true});await close();
});

test('bad/full room recovery, disconnect and same-tab refresh preserve the authenticated seat',async({browser})=>{
  const {a,b,bc,code,close}=await pair(browser);await play(a,0,0,1,b);
  const thirdContext=await browser.newContext(),third=await thirdContext.newPage();await lobby(third);await third.getByLabel('输入房间码').fill('AAAAAAAA');await third.getByRole('button',{name:'加入房间',exact:true}).click();await expect(third.locator('.online-message')).toContainText('没有找到');
  await third.getByLabel('输入房间码').fill(code);await third.getByRole('button',{name:'加入房间',exact:true}).click();await expect(third.locator('.online-message')).toContainText('已有两位');
  await b.reload();await expect(b.getByText('你执白',{exact:true})).toBeVisible();await count(b,1);await expect(cell(b,0,0)).toHaveAttribute('data-stone','B');await play(b,4,4,2,a);
  await bc.setOffline(true);await expect(b.locator('.connection-badge')).toContainText('网络已断开');await expect(a.locator('.online-seat').filter({hasText:'白方'})).toContainText('断线');await expect(a.getByRole('button',{name:'停一手',exact:true})).toBeDisabled();await count(a,2);
  await bc.setOffline(false);await expect(b.locator('.connection-badge')).toContainText('服务已连接');await expect(a.locator('.online-seat').filter({hasText:'白方'})).toContainText('已连接');await expect(cell(b,4,4)).toHaveAttribute('data-stone','W');await play(a,0,1,3,b);
  await bc.setOffline(true);await expect(b.locator('.connection-badge')).toContainText('网络已断开');await b.getByRole('button',{name:'返回大厅',exact:true}).click();await b.getByRole('button',{name:'确认返回大厅'}).click();await expect(b.getByRole('heading',{name:'找个伙伴，开一局'})).toBeVisible();await bc.setOffline(false);await expect(b.locator('.connection-badge')).toContainText('服务已连接');await b.getByRole('button',{name:/恢复上次房间/}).click();await expect(b.getByText('你执白',{exact:true})).toBeVisible();await count(b,3);
  await thirdContext.close();await close();
});

test('each seat confirms its own undo; rejection retains state, acceptance restores captures',async({browser})=>{
  const {a,b,close}=await pair(browser);await play(a,1,0,1,b);await play(b,0,0,2,a);await play(a,0,1,3,b);
  await b.getByRole('button',{name:'申请悔棋',exact:true}).click();await expect(a.locator('.online-undo')).toBeVisible();await expect(b.getByRole('button',{name:'黑方确认悔棋',exact:true})).toBeDisabled();await a.getByRole('button',{name:'拒绝悔棋，保留棋局'}).click();await expect(b.locator('.online-undo')).toHaveCount(0);await count(a,3);await expect(cell(a,0,0)).toHaveAttribute('data-stone','empty');
  await undo(a,b);await count(a,2);await count(b,2);await expect(cell(a,0,0)).toHaveAttribute('data-stone','W');await expect(cell(b,0,1)).toHaveAttribute('data-stone','empty');await expect(slider(a)).toHaveAttribute('max','2');await play(a,4,4,3,b);await expect(cell(b,0,1)).toHaveAttribute('data-stone','empty');await close();
});

test('double pass, changing dead marks, both-role score, historic read-only view and disputed restoration',async({browser})=>{
  const {a,b,close}=await pair(browser);await play(a,0,0,1,b);await play(b,4,4,2,a);await a.getByRole('button',{name:'停一手',exact:true}).click();await count(b,3);await b.getByRole('button',{name:'停一手',exact:true}).click();await expect(a.getByTestId('online-game')).toHaveAttribute('data-phase','scoring');
  await a.getByRole('button',{name:'黑方确认当前清单'}).click();await expect(b.getByRole('button',{name:'白方确认当前清单'})).toBeEnabled();await cell(b,0,0).click();await expect(a.getByRole('button',{name:'黑方确认当前清单'})).toBeEnabled();await expect(b.locator('[data-marker-kind="target"]')).toHaveCount(1);
  await a.getByRole('button',{name:'黑方确认当前清单'}).click();await b.getByRole('button',{name:'白方确认当前清单'}).click();await expect(a.locator('.online-result')).toContainText('白方获胜');await expect(b.locator('.online-result')).toContainText('白方获胜');await expect(a.getByRole('region',{name:'最终面积计分'})).toContainText('25');await expect(cell(b,0,0)).toHaveAttribute('data-stone','B');
  await seek(a,2);await expect(a.locator('.online-result')).toHaveCount(0);await expect(a.locator('[data-marker-kind="target"]')).toHaveCount(0);await expect(b.locator('.online-result')).toContainText('白方获胜');await slider(a).press('End');
  await undo(a,b);await expect(a.getByTestId('online-game')).toHaveAttribute('data-phase','scoring');await b.getByRole('button',{name:'有争议，恢复原盘对弈'}).click();await expect(a.getByTestId('online-game')).toHaveAttribute('data-phase','playing');await expect(cell(a,0,0)).toHaveAttribute('data-stone','B');await expect(cell(a,4,4)).toHaveAttribute('data-stone','W');await expect(a.locator('.timeline-position')).toContainText('连续停手 0');await close();
});

test('resignation has no invented score; leaving and restoring a room does not give its seat to a third player',async({browser})=>{
  const {a,b,close}=await pair(browser);await play(a,0,0,1,b);await b.getByRole('button',{name:'认输',exact:true}).click();await b.getByRole('button',{name:'确认认输',exact:true}).click();await expect(a.locator('.online-result')).toContainText('黑方获胜');await expect(a.locator('.score-details')).toHaveCount(0);
  await b.getByRole('button',{name:'返回大厅',exact:true}).click();await b.getByRole('button',{name:'确认返回大厅'}).click();await expect(b.getByRole('heading',{name:'找个伙伴，开一局'})).toBeVisible();await b.getByRole('button',{name:/恢复上次房间/}).click();await expect(b.getByText('你执白',{exact:true})).toBeVisible();await expect(b.locator('.online-result')).toContainText('黑方获胜');await close();
});

for(const width of [360,768,1280])test(`${width}px room layout, keyboard and local 19-route touch scrolling`,async({browser})=>{
  const {a,b,ac,close}=await pair(browser,{width,size:width===360?19:9,touch:width===360});await a.emulateMedia({reducedMotion:'reduce'});
  const pointStyle=await cell(a,0,0).evaluate(node=>{const style=getComputedStyle(node);return {background:style.backgroundColor,border:style.borderTopWidth,padding:style.paddingTop};});expect(pointStyle).toEqual({background:'rgba(0, 0, 0, 0)',border:'0px',padding:'0px'});
  await cell(a,0,0).focus();await cell(a,0,0).press('Enter');await count(b,1);await play(b,width===360?18:8,width===360?18:8,2,a);
  await seek(a,1);await expect(slider(a)).toBeFocused();await slider(a).press('End');await expect(slider(a)).toHaveValue('2');expect(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(width===360){expect(await a.locator('.board-viewport').evaluate(node=>node.scrollWidth>node.clientWidth)).toBe(true);await a.getByRole('button',{name:'回退到上一步'}).tap();await expect(slider(a)).toHaveValue('1');await a.getByRole('button',{name:'返回当前局面继续'}).tap();await expect(slider(a)).toHaveValue('2');}
  await a.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();scrollTo(0,0);});await a.screenshot({path:`${evidence}/${width}-room.png`,fullPage:true});await close();
});

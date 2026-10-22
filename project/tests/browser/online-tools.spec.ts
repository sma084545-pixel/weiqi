import {mkdir,writeFile} from 'node:fs/promises';
import {test,expect,type Browser,type Page} from '@playwright/test';
const evidence=process.env.ONLINE_TOOLS_EVIDENCE_ROOT??'docs/online-tools/checks/browser';
const main=(page:Page)=>page.locator('.online-board-card>.shared-board');
const cell=(view:ReturnType<Page['locator']>,row:number,col:number)=>view.locator(`[data-row="${row}"][data-col="${col}"]`);
const count=(page:Page,n:number)=>expect(page.getByTestId('online-game')).toHaveAttribute('data-move-count',String(n));
async function lobby(page:Page){await page.goto('/#/play/online');await expect(page.locator('.connection-badge')).toContainText('服务已连接');}
async function pair(browser:Browser,width=1280,size=9,touch=false){
 const ac=await browser.newContext({viewport:{width,height:950},hasTouch:touch,isMobile:touch}),bc=await browser.newContext(),a=await ac.newPage(),b=await bc.newPage();
 await lobby(a);await a.getByLabel('昵称（可留空）').fill('TEST 窗口黑');await a.getByLabel('联机棋盘尺寸').selectOption(String(size));await a.getByRole('button',{name:'创建房间',exact:true}).click();await expect(a.getByText('你执黑',{exact:true})).toBeVisible();
 const code=await a.getByLabel('当前房间码').inputValue();await lobby(b);await b.getByLabel('昵称（可留空）').fill('TEST 窗口白');await b.getByLabel('输入房间码').fill(code);await b.getByRole('button',{name:'加入房间',exact:true}).click();await expect(a.locator('.online-seat').filter({hasText:'白方'})).toContainText('已连接');
 await expect(a.locator('.chat-unavailable')).toHaveCount(0);await expect(a.getByRole('button',{name:'发送消息',exact:true})).toBeDisabled();
 return {a,b,ac,bc,close:async()=>{await ac.close();await bc.close();}};
}
test.beforeAll(async()=>{await mkdir(evidence,{recursive:true});});

test('room chat synchronizes text without changing the game; refresh, offline draft and room isolation',async({browser})=>{
 const {a,b,bc,close}=await pair(browser),revision=await a.getByTestId('online-game').getAttribute('data-room-revision');
 const text='<img src=x onerror=alert(1)> 一起下棋';await a.getByLabel('给同伴的消息').fill(text);await a.getByLabel('给同伴的消息').press('Enter');await expect(b.getByRole('log')).toContainText(text);await expect(a.getByLabel('给同伴的消息')).toHaveValue('');
 await expect(b.locator('.chat-log img')).toHaveCount(0);await count(a,0);await expect(a.getByTestId('online-game')).toHaveAttribute('data-room-revision',revision!);
 await b.getByLabel('给同伴的消息').fill('收到');await b.getByRole('button',{name:'发送消息',exact:true}).click();await expect(a.getByRole('log')).toContainText('白方 · TEST 窗口白');await expect(a.getByRole('log')).toContainText('收到');
 await b.reload();await expect(b.getByRole('log')).toContainText(text);await b.getByLabel('给同伴的消息').fill('断网保留输入');await bc.setOffline(true);await expect(b.locator('.connection-badge')).toContainText('断开');await expect(b.getByRole('button',{name:'发送消息',exact:true})).toBeDisabled();await expect(b.getByLabel('给同伴的消息')).toHaveValue('断网保留输入');await bc.setOffline(false);await expect(b.locator('.connection-badge')).toContainText('已连接');await expect(b.getByLabel('给同伴的消息')).toHaveValue('断网保留输入');
 await cell(main(a),0,0).click();await count(b,1);await cell(main(b),8,8).click();await count(a,2);
 const other=await browser.newContext(),page=await other.newPage();await lobby(page);await page.getByRole('button',{name:'创建房间',exact:true}).click();await expect(page.getByRole('log')).toContainText('还没有消息');await expect(page.getByRole('log')).not.toContainText(text);await other.close();
 await a.screenshot({path:`evidence/chat.png`.replace('evidence',evidence),fullPage:true});await close();
});

test('floating miniature follows play and read-only history; pointer, keyboard, resize and close are safe',async({browser})=>{
 const {a,b,close}=await pair(browser);await a.getByRole('button',{name:'悬浮小棋盘',exact:true}).click();const floating=a.getByRole('complementary',{name:'悬浮小棋盘'}),handle=a.getByRole('button',{name:'移动悬浮棋盘，使用方向键'});
 await expect(floating.getByRole('gridcell')).toHaveCount(81);await expect(cell(floating,0,0)).toBeDisabled();const miniaturePoint=await cell(floating,0,0).boundingBox();await a.mouse.click(miniaturePoint!.x+miniaturePoint!.width/2,miniaturePoint!.y+miniaturePoint!.height/2);await count(a,0);
 await cell(main(a),0,0).click();await count(b,1);await expect(cell(floating,0,0)).toHaveAttribute('data-stone','B');await cell(main(b),8,8).click();await count(a,2);
 const slider=a.getByRole('slider',{name:'棋局滑动条',exact:true});await slider.focus();await slider.press('Home');await expect(cell(floating,0,0)).toHaveAttribute('data-stone','empty');await expect(floating).toContainText('只读回看');await slider.press('End');
 const before=await floating.boundingBox();await handle.focus();await handle.press('ArrowRight');const shifted=await floating.boundingBox();expect(shifted!.x).toBe(before!.x+16);
 const grip=await handle.boundingBox();await a.mouse.move(grip!.x+20,grip!.y+20);await a.mouse.down();await a.mouse.move(480,360,{steps:8});await a.mouse.up();const moved=await floating.boundingBox();expect(moved!.x).toBeGreaterThan(100);
 await a.setViewportSize({width:360,height:740});const clamped=await floating.boundingBox();expect(clamped!.x).toBeGreaterThanOrEqual(0);expect(clamped!.x+clamped!.width).toBeLessThanOrEqual(360);
 await a.getByRole('button',{name:'关闭悬浮小棋盘'}).click();await expect(floating).toHaveCount(0);await count(a,2);await close();
});

for(const width of [360,768,1280])test(`${width}px maximized board, chat, touch/keyboard and focus return`,async({browser})=>{
 const {a,b,close}=await pair(browser,width,width===360?19:9,width===360);await a.emulateMedia({reducedMotion:'reduce'});
 const opener=a.getByRole('button',{name:'最大化棋盘',exact:true});if(width===360)await opener.tap();else await opener.click();const dialog=a.getByRole('dialog',{name:'放大棋盘',exact:true});await expect(dialog).toBeVisible();
 const point=cell(dialog,0,0);await point.focus();await point.press('Enter');await count(b,1);await cell(main(b),width===360?18:8,width===360?18:8).click();await count(a,2);await expect(point).toHaveAttribute('data-stone','B');
 await dialog.getByLabel('给同伴的消息').fill('放大棋盘中聊天');await dialog.getByLabel('给同伴的消息').press('Enter');await expect(b.getByRole('log')).toContainText('放大棋盘中聊天');
 const geometry=await dialog.evaluate(node=>({right:node.getBoundingClientRect().right,viewport:innerWidth,documentWidth:document.documentElement.scrollWidth}));expect(geometry.right).toBeLessThanOrEqual(width);expect(geometry.documentWidth).toBeLessThanOrEqual(width);
 if(width===360)expect(await dialog.locator('.board-viewport').evaluate(node=>node.scrollWidth>node.clientWidth)).toBe(true);
 if(width===1280){await dialog.getByRole('button',{name:'进入系统全屏'}).click();await expect.poll(()=>a.evaluate(()=>Boolean(document.fullscreenElement))).toBe(true);await dialog.getByRole('button',{name:'退出系统全屏'}).click();await expect.poll(()=>a.evaluate(()=>Boolean(document.fullscreenElement))).toBe(false);}
 await dialog.locator('.max-board-shell').evaluate(node=>{node.scrollTop=0;});await a.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});await a.mouse.move(0,0);
 await dialog.screenshot({path:`${evidence}/${width}-maximized.png`});await dialog.getByRole('button',{name:'返回普通棋盘'}).click();await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();await expect(main(a)).toBeVisible();await count(a,2);
 await opener.click();await a.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await close();
});

test('native picture-in-picture uses the real browser API or announces the floating fallback',async({browser})=>{
 const {a,b,close}=await pair(browser),support=await a.evaluate(()=>('documentPictureInPicture' in window));await a.getByRole('button',{name:'独立画中画',exact:true}).click();
 const opened=await a.evaluate(()=>Boolean((window as any).documentPictureInPicture?.window));
 if(opened){
   await expect(a.locator('.board-display-message')).toContainText('独立画中画已打开');
   await a.evaluate(()=>{const doc=(window as any).documentPictureInPicture.window.document;const at=doc.querySelector('[data-row="0"][data-col="0"]');if(!at)throw Error('PiP board missing');at.click();});await count(b,1);await cell(main(b),8,8).click();await count(a,2);
   expect(await a.evaluate(()=>(window as any).documentPictureInPicture.window.document.querySelector('[data-row="8"][data-col="8"]').dataset.stone)).toBe('W');
   await a.evaluate(()=>(window as any).documentPictureInPicture.window.close());
 }else{await expect(a.getByRole('complementary',{name:'悬浮小棋盘'})).toBeVisible();await expect(a.locator('.board-display-message')).toContainText(/浏览器/);}
 await writeFile(`${evidence}/native-pip.json`,JSON.stringify({support,opened,evidence:opened?'real requestWindow, real engine move and peer synchronization':'real browser fallback; no mock PiP'},null,2));await close();
});

test('older room service without chat capability retains games and announces chat update',async({browser})=>{
 const context=await browser.newContext();await context.routeWebSocket('**/api/online/ws',socket=>{const server=socket.connectToServer();server.onMessage(packet=>{const data=JSON.parse(String(packet));if(data.type==='hello')delete data.capabilities;socket.send(JSON.stringify(data));});});const page=await context.newPage();await lobby(page);await page.getByRole('button',{name:'创建房间',exact:true}).click();await expect(page.locator('.chat-unavailable')).toContainText('等待更新');await expect(page.getByRole('button',{name:'最大化棋盘'})).toBeEnabled();await expect(page.locator('.connection-badge')).toContainText('服务已连接');await context.close();
});

test('forced Fullscreen refusal remains visible inside the dialog and preserves the game',async({browser})=>{
 const {a,b,close}=await pair(browser);await a.evaluate(()=>{Element.prototype.requestFullscreen=()=>Promise.reject(new DOMException('Test denial','NotAllowedError'));});
 await a.getByRole('button',{name:'最大化棋盘',exact:true}).click();const dialog=a.getByRole('dialog',{name:'放大棋盘',exact:true});await dialog.getByRole('button',{name:'进入系统全屏'}).click();await expect(dialog.getByRole('status').filter({hasText:'浏览器未允许系统全屏'})).toBeVisible();await count(a,0);await dialog.getByRole('button',{name:'返回普通棋盘'}).click();await cell(main(a),0,0).click();await count(b,1);await close();
});

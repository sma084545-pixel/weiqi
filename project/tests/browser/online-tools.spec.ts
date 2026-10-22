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

test('floating board directly plays both colors once, follows read-only history and remains draggable',async({browser})=>{
 const {a,b,close}=await pair(browser);await a.getByRole('button',{name:'悬浮小棋盘',exact:true}).click();await b.getByRole('button',{name:'悬浮小棋盘',exact:true}).click();
 const floating=a.getByRole('complementary',{name:'悬浮小棋盘'}),other=b.getByRole('complementary',{name:'悬浮小棋盘'}),handle=a.getByRole('button',{name:'移动悬浮棋盘，使用方向键'});
 await expect(floating.getByRole('gridcell')).toHaveCount(81);await expect(cell(floating,0,0)).toBeEnabled();
 await cell(floating,0,0).dblclick();await count(b,1);await expect(cell(main(a),0,0)).toHaveAttribute('data-stone','B');await expect(cell(floating,0,1)).toBeDisabled();
 const blocked=await cell(floating,0,1).boundingBox();await a.mouse.click(blocked!.x+blocked!.width/2,blocked!.y+blocked!.height/2);await count(a,1);
 await cell(other,8,8).focus();await cell(other,8,8).press('Space');await count(a,2);await expect(cell(floating,8,8)).toHaveAttribute('data-stone','W');
 const slider=a.getByRole('slider',{name:'棋局滑动条',exact:true});await slider.focus();await slider.press('Home');await expect(cell(floating,0,0)).toHaveAttribute('data-stone','empty');await expect(floating).toContainText('只读回看');await expect(cell(floating,0,1)).toBeDisabled();
 const historic=await cell(floating,0,1).boundingBox();await a.mouse.click(historic!.x+historic!.width/2,historic!.y+historic!.height/2);await count(b,2);await expect(cell(main(b),0,0)).toHaveAttribute('data-stone','B');await slider.press('End');
 const before=await floating.boundingBox();await handle.focus();await handle.press('ArrowRight');const shifted=await floating.boundingBox();expect(shifted!.x).toBe(before!.x+16);
 const grip=await handle.boundingBox();await a.mouse.move(grip!.x+20,grip!.y+20);await a.mouse.down();await a.mouse.move(480,360,{steps:8});await a.mouse.up();const moved=await floating.boundingBox();expect(moved!.x).toBeGreaterThan(100);await count(a,2);
 await a.setViewportSize({width:360,height:740});await expect.poll(async()=>{const box=await floating.boundingBox();return box!.x+box!.width;}).toBeLessThanOrEqual(360);
 await a.getByRole('button',{name:'关闭悬浮小棋盘'}).click();await expect(floating).toHaveCount(0);await count(a,2);await close();
});

test('floating board uses the same capture, suicide, undo, scoring and finished-state guards',async({browser})=>{
 const {a,b,close}=await pair(browser,1280,5);
 for(const page of [a,b])await page.getByRole('button',{name:'悬浮小棋盘',exact:true}).click();
 const mini=(page:Page)=>page.getByRole('complementary',{name:'悬浮小棋盘'});
 const play=async(page:Page,row:number,col:number,n:number)=>{await cell(mini(page),row,col).click();await count(a,n);await count(b,n);};
 await play(a,1,0,1);await play(b,0,0,2);await play(a,0,1,3);await expect(cell(mini(b),0,0)).toHaveAttribute('data-stone','empty');
 await cell(mini(b),0,0).click();await expect(b.locator('.online-message')).toContainText('无气');await count(a,3);await expect(cell(mini(b),4,4)).toBeEnabled();await play(b,4,4,4);
 await a.getByRole('button',{name:'申请悔棋',exact:true}).click();await expect(cell(mini(a),2,2)).toBeDisabled();await b.getByRole('button',{name:'拒绝悔棋，保留棋局'}).click();await count(a,4);
 await a.getByRole('button',{name:'申请悔棋',exact:true}).click();await a.getByRole('button',{name:'黑方确认悔棋',exact:true}).click();await b.getByRole('button',{name:'白方确认悔棋',exact:true}).click();await count(a,3);await expect(cell(mini(b),4,4)).toHaveAttribute('data-stone','empty');await play(b,4,3,4);
 await a.getByRole('button',{name:'停一手',exact:true}).click();await count(b,5);await b.getByRole('button',{name:'停一手',exact:true}).click();await expect(a.getByTestId('online-game')).toHaveAttribute('data-phase','scoring');
 await a.getByRole('button',{name:'黑方确认当前清单'}).click();await cell(mini(b),1,0).click();await expect(a.getByRole('button',{name:'黑方确认当前清单'})).toBeEnabled();await expect(mini(a).locator('[data-marker-kind="target"]')).toHaveCount(1);await expect(cell(main(a),1,0)).toHaveAttribute('data-stone','B');
 await cell(mini(b),1,0).click();await a.getByRole('button',{name:'黑方确认当前清单'}).click();await b.getByRole('button',{name:'白方确认当前清单'}).click();await expect(a.getByTestId('online-game')).toHaveAttribute('data-phase','finished');await expect(cell(mini(a),2,2)).toBeDisabled();const locked=await cell(mini(a),2,2).boundingBox();await a.mouse.click(locked!.x+locked!.width/2,locked!.y+locked!.height/2);await count(a,7);await close();
});

for(const [size,width] of [[5,1280],[9,768],[13,768],[19,360]])test(`${width}px floating ${size}-route entire board and direct corner hit remain visible`,async({browser})=>{
 const {a,b,close}=await pair(browser,width,size,width===360);await a.emulateMedia({reducedMotion:'reduce'});await a.getByRole('button',{name:'悬浮小棋盘',exact:true}).click();
 const mini=a.getByRole('complementary',{name:'悬浮小棋盘'});await expect(mini.getByRole('gridcell')).toHaveCount(size*size);
 const visible=async()=>mini.evaluate(node=>{
  const panel=node.getBoundingClientRect(),points=[...node.querySelectorAll<HTMLElement>('[role="gridcell"]')];
  const viewport=node.querySelector<HTMLElement>('.board-viewport')!,area=node.querySelector<HTMLElement>('.compact-board')!.getBoundingClientRect();
  return {points:points.length,allInside:points.every(point=>{const b=point.getBoundingClientRect();return b.width>0&&b.height>0&&b.left>=panel.left&&b.top>=panel.top&&b.right<=panel.right+.5&&b.bottom<=panel.bottom+.5&&b.left>=area.left-.5&&b.top>=area.top-.5&&b.right<=area.right+.5&&b.bottom<=area.bottom+.5;}),noScroll:viewport.scrollWidth<=viewport.clientWidth+1&&viewport.scrollHeight<=viewport.clientHeight+1,panelInside:panel.left>=0&&panel.top>=0&&panel.right<=innerWidth&&panel.bottom<=innerHeight};
 });
 await expect.poll(visible).toEqual({points:size*size,allInside:true,noScroll:true,panelInside:true});
 if(width===360)await cell(mini,size-1,size-1).tap();else await cell(mini,size-1,size-1).click();await count(b,1);await expect(cell(main(b),size-1,size-1)).toHaveAttribute('data-stone','B');
 await cell(main(b),0,0).click();await count(a,2);await cell(mini,0,size-1).focus();await cell(mini,0,size-1).press('Enter');await count(b,3);await expect(cell(main(b),0,size-1)).toHaveAttribute('data-stone','B');await cell(main(b),size-1,0).click();await count(a,4);
 await expect.poll(visible).toEqual({points:size*size,allInside:true,noScroll:true,panelInside:true});
 await mini.screenshot({path:`${evidence}/${width}-floating-${size}.png`});
 // Short landscape and rotated tall windows must show all intersections, without scrolling.
 for(const dimensions of [{width:740,height:360},{width:360,height:740},{width:1280,height:800}]){await a.setViewportSize(dimensions);await a.waitForTimeout(100);if(!(await visible()).allInside){await writeFile(`${evidence}/geometry-${size}-${dimensions.width}.json`,JSON.stringify(await mini.evaluate(node=>{const rect=(n:Element|null)=>n?.getBoundingClientRect().toJSON();const all=[...node.querySelectorAll<HTMLElement>('[role="gridcell"]')].map(n=>n.getBoundingClientRect());return {panel:rect(node),area:rect(node.querySelector('.compact-board')),figure:rect(node.querySelector('.shared-board')),frame:rect(node.querySelector('.board-frame')),grid:rect(node.querySelector('.board-grid')),pointBounds:{left:Math.min(...all.map(r=>r.left)),right:Math.max(...all.map(r=>r.right)),top:Math.min(...all.map(r=>r.top)),bottom:Math.max(...all.map(r=>r.bottom))}};}),null,2));await mini.screenshot({path:`${evidence}/geometry-${size}-${dimensions.width}.png`});}await expect.poll(visible).toEqual({points:size*size,allInside:true,noScroll:true,panelInside:true});}
 await mini.getByRole('button',{name:'复位小窗',exact:true}).click();await expect.poll(visible).toEqual({points:size*size,allInside:true,noScroll:true,panelInside:true});
 const closeHit=await mini.getByRole('button',{name:'关闭悬浮小棋盘'}).evaluate(node=>{const b=node.getBoundingClientRect();return node.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));});expect(closeHit).toBe(true);
 expect(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await close();
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
 const {a,b,close}=await pair(browser,1280,19),support=await a.evaluate(()=>('documentPictureInPicture' in window));await a.getByRole('button',{name:'独立画中画',exact:true}).click();
 const opened=await a.evaluate(()=>Boolean((window as any).documentPictureInPicture?.window));
 if(opened){
   await expect(a.locator('.board-display-message')).toContainText('独立画中画已打开');
   await a.evaluate(()=>{const doc=(window as any).documentPictureInPicture.window.document;const at=doc.querySelector('[data-row="0"][data-col="0"]');if(!at)throw Error('PiP board missing');at.click();});await count(b,1);await cell(main(b),18,18).click();await count(a,2);
   const fits=await a.evaluate(()=>{const w=(window as any).documentPictureInPicture.window as Window;const points=[...w.document.querySelectorAll<HTMLElement>('[role="gridcell"]')];return points.length===361&&points.every(p=>{const r=p.getBoundingClientRect();return r.width>0&&r.height>0&&r.x>=0&&r.y>=0&&r.right<=w.innerWidth+.5&&r.bottom<=w.innerHeight+.5;});});expect(fits).toBe(true);
   expect(await a.evaluate(()=>(window as any).documentPictureInPicture.window.document.querySelector('[data-row="18"][data-col="18"]').dataset.stone)).toBe('W');
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

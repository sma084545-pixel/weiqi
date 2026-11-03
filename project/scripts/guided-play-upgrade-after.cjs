async page=>{
  const browser=page.context().browser();let p;
  for(const context of browser.contexts())for(const candidate of context.pages())if(candidate.url().startsWith('https://sma084545-pixel.github.io/weiqi/#/play/free')&&await candidate.evaluate(()=>window.name)==='guided-upgrade-own-test')p=candidate;
  if(!p)throw Error('Owned upgrade test tab missing; do not touch unrelated tabs');p.setDefaultTimeout(30000);
  await p.reload();const before=await p.locator('.app-version').textContent();if(!before.includes('0.25.2'))throw Error('Old cache should remain until explicit update');
  const applied=[];for(let step=0;step<3;step++){await p.getByRole('button',{name:'保存已提交内容并应用',exact:true}).click();await p.waitForFunction(old=>document.querySelector('.app-version')?.textContent!==old,applied.at(-1)||before);applied.push(await p.locator('.app-version').textContent());if(applied.at(-1).includes('0.26.1'))break;}if(!applied.at(-1)?.includes('0.26.1'))throw Error('Latest update not applied');
  if(await p.locator('[data-free-play=true]').getAttribute('data-move-count')!=='2')throw Error('Old game lost');
  for(const [row,col,color] of [[0,0,'B'],[8,8,'W']])if(await p.locator(`.full-board-panel>.shared-board [data-row="${row}"][data-col="${col}"]`).getAttribute('data-stone')!==color)throw Error('Old stones lost');
  const offline=await p.evaluate(async()=>{const reg=await navigator.serviceWorker.ready,c=new MessageChannel();return await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('offline status timeout')),15000);c.port1.onmessage=e=>{clearTimeout(t);resolve(e.data);};reg.active.postMessage({type:'GET_STATUS'},[c.port2]);});});
  if(!offline.ready||offline.version!=='0.26.1')throw Error('New cache not ready');await p.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0);});await p.screenshot({path:'output/playwright/guided-upgrade-preserved.png',fullPage:true});
  const result={schemaVersion:1,id:'GUIDED-PUBLIC-CACHE-UPGRADE',revision:1,rulesetId:'GO-CLUB-AREA-1',status:'passed',at:new Date().toISOString(),before,applied,after:await p.locator('.app-version').textContent(),moves:2,oldStonesPreserved:true,offline,onlyOwnSyntheticTestData:true};await p.context().close();return result;
}

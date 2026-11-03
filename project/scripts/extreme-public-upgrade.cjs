async page=>{
 page.setDefaultTimeout(100_000);
 if(await page.evaluate(()=>window.name)!=='extreme-production-upgrade')throw Error('Wrong browser; do not touch unrelated user data');
 await page.reload();await page.getByTestId('ai-game').waitFor();
 const app=page.getByTestId('ai-game');if(await app.getAttribute('data-move-count')!=='2'||await app.getAttribute('data-difficulty')!=='standard')throw Error('Old saved test game was lost');
 await page.getByRole('button',{name:'保存已提交内容并应用',exact:true}).waitFor();
 const before=await page.locator('.app-version').textContent();if(!before.includes('0.25.0'))throw Error('Old client must remain until explicit application');
 await page.getByRole('button',{name:'保存已提交内容并应用',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.app-version')?.textContent?.includes('0.25.1'));
 await app.waitFor();if(await app.getAttribute('data-move-count')!=='2'||await app.getAttribute('data-difficulty')!=='standard'||await app.getAttribute('data-paused')!=='true')throw Error('Saved game or pause state not preserved');
 const worker=await page.evaluate(async()=>{const reg=await navigator.serviceWorker.ready,channel=new MessageChannel();return await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Status timeout')),20_000);channel.port1.onmessage=e=>{clearTimeout(t);resolve(e.data);};reg.active.postMessage({type:'GET_STATUS'},[channel.port2]);});});
 if(!worker.ready||worker.version!=='0.25.1')throw Error('New cache not ready');
 await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});await page.screenshot({path:'output/playwright/public-upgrade-preserved.png',fullPage:true});
 return {schemaVersion:1,id:'EXTREME-PUBLIC-UPGRADE-AFTER',revision:1,rulesetId:'GO-CLUB-AREA-1',status:'passed',at:new Date().toISOString(),before,after:await page.locator('.app-version').textContent(),moves:await app.getAttribute('data-move-count'),difficulty:await app.getAttribute('data-difficulty'),paused:await app.getAttribute('data-paused'),offline:worker,checks:['old-cached-client-retained-until-user-applies','explicit-save-and-apply','saved-real-game-preserved','AI-remains-paused','new-version-actual-resources-ready'],humanReviewed:null};
}

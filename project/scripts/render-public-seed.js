async (page) => {
 const base='https://sma084545-pixel.github.io/weiqi/';
 await page.goto(base+'#/route/STAGE-05');await page.getByRole('button',{name:'还想练习',exact:true}).click();
 await page.goto(base+'#/play/free');await page.getByRole('button',{name:'验证设置并开始对局'}).click();
 await page.locator('[data-row="0"][data-col="0"]').click();await page.locator('[data-row="8"][data-col="8"]').click();
 await page.locator('.full-game-page[data-move-count="2"]').waitFor();
 if(await page.locator('[data-row="8"][data-col="8"]').getAttribute('data-stone')!=='W')throw Error('Seeded white stone missing');
 await page.evaluate(()=>navigator.serviceWorker.ready);
 return {schemaVersion:1,id:'RENDER-PUBLIC-OLD-VERSION-SEED',revision:1,rulesetId:'GO-CLUB-AREA-1',status:'passed',purpose:'Isolated QA browser, no real member records or feedback',version:await page.locator('.app-version').innerText(),stage:'STAGE-05',mark:'practice',gameMoves:2,site:base};
}

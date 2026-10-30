async page => {
  const base='https://sma084545-pixel.github.io/weiqi/';await page.goto(base+'#/teacher/offline-data');
  const before=await page.locator('.app-version').innerText();
  if(before!=='版本 0.24.2'){
    await page.getByRole('button',{name:'检查应用更新',exact:true}).click();const apply=page.getByRole('button',{name:'保存已提交内容并应用',exact:true}).first();await apply.waitFor({timeout:60000});await apply.click();
  }
  await page.getByText('版本 0.24.2',{exact:true}).waitFor({timeout:60000});await page.goto(base+'#/route/STAGE-05');
  if(await page.getByRole('button',{name:'还想练习',exact:true}).getAttribute('aria-pressed')!=='true')throw Error('Original progress mark lost');
  await page.getByRole('navigation',{name:'主要导航'}).getByRole('link',{name:'AI 对弈',exact:true}).click();await page.getByRole('heading',{name:'AI 对弈',exact:true}).waitFor();
  if(await page.locator('#ai-level option').count()!==3||await page.locator('#ai-size option').count()!==4)throw Error('Missing difficulty or size settings');
  await page.screenshot({path:'output/playwright/ai-public-upgrade-setup.png',fullPage:true});
  return {schemaVersion:1,id:'AI-PUBLIC-UPGRADE',revision:1,rulesetId:'GO-CLUB-AREA-1',status:'passed',from:before,to:'0.24.2',originalMarkRetained:true,siteDataCleared:false,apiInvoked:false,note:'Public frontend upgrade and setup only. Actual Render gameplay is separately gated until deployment.',browser:page.context().browser().version(),at:new Date().toISOString()};
}

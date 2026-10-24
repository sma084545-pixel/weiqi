async(page)=>{
 const base='https://sma084545-pixel.github.io/weiqi/';
 await page.goto(base+'#/route/STAGE-05');await page.getByRole('heading',{name:/眼与基础死活/}).waitFor();await page.getByRole('button',{name:'还想练习',exact:true}).click();
 await page.goto(base+'#/teacher/offline-data');await page.getByRole('heading',{name:'已可离线',exact:true}).waitFor({timeout:30000});
 const version=await page.locator('.app-version').innerText();if(version!=='版本 0.22.0')throw Error('upgrade baseline not 0.22.0');
 return {schemaVersion:1,id:'ADVANCED-UPGRADE-BASELINE',revision:1,rulesetId:'GO-CLUB-AREA-1',status:'prepared',url:base,version,testData:'self-mark created by automated development test, not member feedback',browser:page.context().browser().version()};
}

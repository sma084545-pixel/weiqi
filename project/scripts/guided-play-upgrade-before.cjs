async page=>{
  const context=await page.context().browser().newContext({viewport:{width:1280,height:960}}),p=await context.newPage();p.setDefaultTimeout(15000);
  await p.goto('https://sma084545-pixel.github.io/weiqi/#/play/free');
  if(!(await p.locator('.app-version').textContent()).includes('0.25.2'))throw Error('Expected actual old public version');
  await p.evaluate(()=>{window.name='guided-upgrade-own-test';});
  await p.getByRole('button',{name:'验证设置并开始对局',exact:true}).click();
  await p.locator('.full-board-panel>.shared-board [data-row="0"][data-col="0"]').click();await p.locator('.full-board-panel>.shared-board [data-row="8"][data-col="8"]').click();
  await p.getByRole('button',{name:'保存到当前设备',exact:true}).click();await p.reload();
  if(await p.locator('[data-free-play=true]').getAttribute('data-move-count')!=='2')throw Error('Old test game not saved');
  return {status:'prepared',oldVersion:await p.locator('.app-version').textContent(),marker:'guided-upgrade-own-test',moves:2,onlyOwnSyntheticTestData:true};
}

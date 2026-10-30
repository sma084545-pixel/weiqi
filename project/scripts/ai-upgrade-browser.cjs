// Begin at the isolated ai-upgrade-server.py old build. No participant data is used.
async page => {
  const c=await page.context().browser().newContext({viewport:{width:1280,height:950}}),p=await c.newPage(),base='http://127.0.0.1:4220/weiqi/',checks=[];
  const assert=(v,m)=>{if(!v)throw Error(m);};
  const records=async()=>p.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('go-club-local');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});const rows=await new Promise((resolve,reject)=>{const r=db.transaction('records','readonly').objectStore('records').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});db.close();return Object.fromEntries(rows.map(row=>[row.key,row.value]));});
  try{
    await p.goto(base+'#/route/STAGE-05');await p.getByRole('button',{name:'还想练习',exact:true}).click();assert(await p.locator('.app-version').innerText()==='版本 0.23.0','expected sealed baseline');
    await p.goto(base+'#/teacher/editor');await p.getByRole('button',{name:/数气模板/}).click();await p.getByLabel('列表标题').fill('DEV-AI-UPGRADE — 开发草稿，不是真实成员作品');await p.getByRole('button',{name:'保存草稿',exact:true}).click();
    await p.goto(base+'#/play/free');await p.getByRole('button',{name:'验证设置并开始对局'}).click();for(const [row,col] of [[0,0],[8,8]])await p.locator('[data-row="'+row+'"][data-col="'+col+'"]').click();await p.getByRole('button',{name:'保存到当前设备'}).click();
    await p.goto(base+'#/teacher/offline-data');await p.getByRole('heading',{name:'已可离线',exact:true}).waitFor({timeout:30000});const before=await records();
    assert(Object.keys(before).some(k=>k.includes('FULL-GAME')),'human save exists before upgrade');
    await p.request.get('http://127.0.0.1:4220/__ai_test_switch_to_current__');await p.getByRole('button',{name:'检查应用更新',exact:true}).click();
    const apply=p.getByRole('button',{name:'保存已提交内容并应用',exact:true}).first();await apply.waitFor({timeout:60000});assert(await p.locator('.app-version').innerText()==='版本 0.23.0','no forced update');await apply.click();await p.getByText('版本 0.24.1',{exact:true}).waitFor({timeout:60000});
    await p.goto(base+'#/route/STAGE-05');assert(await p.getByRole('button',{name:'还想练习',exact:true}).getAttribute('aria-pressed')==='true','old stage mark retained');
    await p.goto(base+'#/teacher/editor');assert(await p.getByLabel('列表标题').inputValue()==='DEV-AI-UPGRADE — 开发草稿，不是真实成员作品','draft retained');
    await p.goto(base+'#/play/free');await p.waitForFunction(()=>document.querySelector('.full-game-page')?.getAttribute('data-move-count')==='2');
    assert(await p.locator('[data-row="8"][data-col="8"]').getAttribute('data-stone')==='W','old human board retained');
    checks.push({name:'actual-worker-upgrade-0.23-to-0.24-without-clearing-human-save-draft-or-marks',status:'passed'});
    await p.goto(base+'#/teacher/offline-data');await p.getByRole('heading',{name:'已可离线',exact:true}).waitFor({timeout:30000});await c.setOffline(true);
    await p.goto(base+'#/play/ai');await p.reload();await p.getByRole('heading',{name:'AI 对弈',exact:true}).waitFor();await p.getByLabel('棋盘尺寸').selectOption('5');await p.getByRole('button',{name:'验证设置并开始 AI 对局'}).click();await p.locator('[data-row="0"][data-col="0"]').click();await p.getByText(/暂时无法连接 AI/).waitFor();
    assert(await p.getByTestId('ai-game').getAttribute('data-move-count')==='1','offline failure must not invent AI move');await p.reload();await p.waitForFunction(()=>document.querySelector('[data-testid="ai-game"]')?.getAttribute('data-move-count')==='1');assert(await p.getByTestId('ai-game').getAttribute('data-paused')==='true','offline restore paused');
    await p.screenshot({path:'output/playwright/ai-offline-upgrade.png',fullPage:true});checks.push({name:'network-disabled-reload-ai-page-human-move-save-and-honest-ai-network-error',status:'passed'});
    await p.goto(base+'#/teacher/offline-data');const d=p.waitForEvent('download');await p.getByRole('button',{name:'导出完整备份'}).click();await (await d).saveAs('output/playwright/ai-upgrade-full-backup.json');
    const after=await records(),humanKey=Object.keys(before).find(k=>k.includes('FULL-GAME'));assert(before[humanKey]===after[humanKey],'new AI session does not overwrite human game');assert(after['go-club:full-game:ai:v1'],'AI has independent backed-up record');
    await p.getByRole('button',{name:'学习进度与作答记录',exact:true}).click();await p.getByRole('button',{name:'确认清除该范围'}).click();await p.getByRole('status').filter({hasText:'已清除“学习进度与作答记录”'}).waitFor();
    const cleared=await records();assert(cleared[humanKey]===after[humanKey]&&cleared['go-club:full-game:ai:v1']===after['go-club:full-game:ai:v1'],'progress clear must preserve both game types');
    assert(Object.keys(cleared).some(k=>k.includes('teacher-drafts')),'progress clear retains drafts');checks.push({name:'full-backup-and-selective-progress-clear-preserve-ai-and-human-and-draft',status:'passed'});
    return {schemaVersion:1,id:'AI-UPGRADE-OFFLINE',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'DeveloperValidationReport',status:'passed',fromVersion:'0.23.0',toVersion:'0.24.1',browser:page.context().browser().version(),method:'Actual service worker and disabled browser network at one isolated /weiqi/ localhost origin; no public deployment or real member record claimed',checks,at:new Date().toISOString(),humanReviewed:null};
  }finally{await c.setOffline(false);await c.close();}
}

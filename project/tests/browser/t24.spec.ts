import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {expect,test,type Page} from '@playwright/test';

// Every answer below is independently stated in the fixed source/test vectors.
// These are isolated browser test records, never participant feedback.
const evidenceRoot='docs/t24/checks/journey';
const cell=(page:Page,row:number,col:number)=>page.locator(`[data-row="${row}"][data-col="${col}"]`);
test('T24 continuous learner to teacher journey, offline save and recovery',async({page,context,browser})=>{
  const evidence=evidenceRoot+'/'+browser.browserType().name();
  test.setTimeout(180_000);
  page.setDefaultTimeout(10_000);
  await mkdir(evidence,{recursive:true});
  const steps:{name:string;status:string}[]=[],errors:string[]=[],external:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith('http://127.0.0.1:4188'))external.push(r.url());});
  await page.setViewportSize({width:1280,height:950});
  await page.emulateMedia({reducedMotion:'reduce'});
  const step=async(name:string,action:()=>Promise<void>)=>{
    await test.step(name,action);steps.push({name,status:'passed'});
    await writeFile(evidence+'/journey.json',JSON.stringify({kind:'DeveloperValidationReport',schemaVersion:1,id:'T24-JOURNEY',revision:1,rulesetId:'GO-CLUB-AREA-1',browser:browser.version(),networkScope:process.env.T24_ONLINE_ONLY==='1'?'online-only':'online-then-context-offline',steps,errors,externalRequests:external,humanReviewed:null},null,2));
  };
  await step('首次访问与学习入口',async()=>{
    await page.goto('/');await expect(page.getByRole('heading',{name:'从这里开始'})).toBeVisible();
    await page.locator('a[href="#/learn/liberties"]').click();
    await expect(page.getByRole('heading',{name:'气实验室',exact:true})).toBeVisible();
  });
  await step('数气预测，提交前隐藏气环',async()=>{
    await page.getByLabel(/先猜气数再验证/).check();
    await expect(page.locator('[data-marker-kind="liberty"]')).toHaveCount(0);
    await page.getByLabel('我预测这个棋块的气数').fill('4');
    await page.getByRole('button',{name:'提交预测并验证'}).click();
    await expect(page.getByText(/核对结果：共有 4 口气/)).toBeVisible();
  });
  await step('提子预测与受控步骤终态',async()=>{
    await page.goto('/#/learn/captures');await page.getByRole('button',{name:/使用建议点 D3/}).click();
    await page.locator('.prediction-targets input').check();
    await page.getByRole('button',{name:'验证我的预测并播放'}).click();
    await expect(page.getByText('预测一致。',{exact:true})).toBeVisible();
    await expect(page.locator('.capture-lab-page')).toHaveAttribute('data-committed','true');
    await page.getByRole('button',{name:'撤回到动画前并重试'}).click();
    await expect(page.locator('.capture-lab-page')).not.toHaveAttribute('data-committed','true');
  });
  await step('摆棋验证、新历史、规则试下及两类撤回',async()=>{
    await page.goto('/#/board/experiment');await page.getByRole('button',{name:/^放黑/}).click();await cell(page,4,4).click();
    await page.getByRole('button',{name:/^按规则试下 从已验证/}).click();
    await page.getByRole('checkbox',{name:/确认把当前盘面作为新起点/}).scrollIntoViewIfNeeded();
    await page.getByRole('checkbox',{name:/确认把当前盘面作为新起点/}).check();
    await page.getByRole('button',{name:'从当前局面开始按规则试下'}).click();
    await expect(page.locator('[data-work-mode="rules"]')).toBeVisible();
    await expect(page.locator('.rule-summary dl>div').filter({hasText:'历史布局'}).locator('dd')).toHaveText('1');
    await cell(page,0,0).click();await expect(page.getByText('白方',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'撤回对局'}).click();await page.getByRole('button',{name:'重做对局'}).click();
    await page.getByRole('button',{name:'把当前盘面带回摆棋示意'}).click();
    await page.getByRole('button',{name:'撤回编辑'}).click();await expect(cell(page,0,0)).toHaveAttribute('data-stone','empty');
  });
  await step('双人吃子即时锁定与双方悔棋',async()=>{
    await page.goto('/#/play/partner');await page.getByLabel('棋盘尺寸').selectOption('5');
    await page.getByRole('button',{name:'双方确认，开始本局'}).click();
    for(const [r,c] of [[1,0],[0,0],[0,1]])await cell(page,r,c).click();
    await expect(page.locator('.capture-game-page')).toHaveAttribute('data-phase','finished');
    await expect(page.getByRole('heading',{name:'黑方 · 伙伴A获胜'})).toBeVisible();
    await page.getByRole('button',{name:'申请悔棋'}).click();await page.getByRole('button',{name:'黑方确认悔棋'}).click();await page.getByRole('button',{name:'白方确认悔棋'}).click();
    await expect(page.locator('.capture-game-page')).toHaveAttribute('data-phase','playing');
  });
  await step('完整9路、双停、标死争议恢复、确认及和棋',async()=>{
    await page.goto('/#/play/full-game');await page.getByRole('button',{name:'验证设置并开始对局'}).click();
    await cell(page,0,0).click();await cell(page,8,8).click();
    await page.getByRole('button',{name:'停一手'}).click();await page.getByRole('button',{name:'停一手'}).click();
    await page.getByRole('button',{name:'黑方确认当前死子与中立点'}).click();await cell(page,0,0).click();
    await expect(page.getByRole('button',{name:'黑方确认当前死子与中立点'})).toBeVisible();
    await page.getByRole('button',{name:'白方提出争议并恢复'}).click();
    await expect(cell(page,0,0)).toHaveAttribute('data-stone','B');
    await expect(page.getByText(/连续停手清零，重复历史保留/)).toBeVisible();
    await page.getByRole('button',{name:'停一手'}).click();await page.getByRole('button',{name:'停一手'}).click();
    await page.getByRole('button',{name:'黑方确认当前死子与中立点'}).click();await page.getByRole('button',{name:'白方确认同一份清单'}).click();
    await expect(page.getByRole('heading',{name:'最终面积计分'})).toBeVisible();await expect(page.getByText('和棋',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'保存到当前设备'}).click();await page.reload();
    await expect(page.locator('.full-game-page')).toHaveAttribute('data-phase','finished');
    await page.screenshot({path:evidence+'/full-game.png',fullPage:true});
  });
  const open=async(id:string)=>{const back=page.getByRole('button',{name:'返回列表',exact:true});if(await back.isVisible())await back.click();else await page.goto('/#/challenges');await page.locator('.puzzle-card').filter({hasText:id}).getByRole('button',{name:/作答/}).click();};
  await step('正式题分层提示、重试与正确数值',async()=>{
    await open('LIB-001');await page.getByRole('button',{name:'显示提示'}).first().click();
    await expect(page.getByText('沿线找上下左右相邻的空点。')).toBeVisible();
    await page.getByRole('button',{name:'隐藏提示并重试'}).click();
    await expect(page.getByText('沿线找上下左右相邻的空点。')).toHaveCount(0);
    await page.getByTestId('number-answer').fill('4');await page.getByRole('button',{name:'提交回答'}).click();await expect(page.getByText('已达到标准',{exact:true})).toBeVisible();
  });
  await step('未知合法手不判错、自由试下返回原题',async()=>{
    await open('CAP-001');await cell(page,4,4).click();await expect(page.getByText('目前未能判断',{exact:true})).toBeVisible();
    await expect(page.getByText(/不会记作错误/)).toBeVisible();
    await page.getByRole('button',{name:'自由试下',exact:true}).click();await cell(page,0,0).click();
    await page.getByRole('button',{name:'结束试下，返回题目'}).click();await expect(page.getByText('CAP-001 · 修订 1')).toBeVisible();
  });
  await step('死活对照合法提子与真实自杀拒绝',async()=>{
    await page.goto('/#/learn/life');await page.getByText('可以合法落子',{exact:true}).click();
    await page.getByRole('grid',{name:/看似被围住：假眼/}).locator('[data-row="2"][data-col="2"]').click();await page.getByRole('button',{name:'验证这一步'}).click();
    await expect(page.getByText(/提走 3 子/)).toBeVisible();await page.getByRole('button',{name:'再看两个真眼'}).click();
    await page.getByText('不能合法落子',{exact:true}).click();await page.getByRole('grid',{name:/两个独立真眼/}).locator('[data-row="1"][data-col="1"]').click();await page.getByRole('button',{name:'验证这一步'}).click();
    await expect(page.getByText(/自杀禁着/)).toBeVisible();await expect(page.getByText(/没有两眼不自动等于死亡/)).toBeVisible();
  });
  await step('合作自选点、交换角色、预览后本机保存',async()=>{
    await page.goto('/#/challenges/together');await page.getByLabel('自行提出落点').check();await cell(page,0,0).click();
    await page.getByLabel('本手目标（新手可写一句）').fill('自动化测试：观察边角');await page.getByRole('button',{name:'交换角色'}).click();
    await expect(page.getByLabel('本手目标（新手可写一句）')).toHaveValue('自动化测试：观察边角');
    await page.getByLabel('为什么选它？').fill('仅测试，非真实合作');await page.getByLabel('对方可能怎样回应？').fill('可能靠近');
    await page.getByLabel('这个回应依据什么？').fill('邻点尚空');await page.getByLabel('先复述同伴的一项理由').fill('自动化测试');
    await page.getByLabel('保留原想法').check();await page.getByLabel('共同写下现在的想法').fill('保留不同计划');await page.getByRole('button',{name:'预览匿名讨论记录'}).click();
    await page.getByRole('button',{name:'确认保存到当前设备'}).click();await expect(page.locator('.saved-discussions li')).toHaveCount(1);
  });
  await step('围地完整点集与面积明细、贴目教学试算',async()=>{
    await page.goto('/#/learn/territory');await page.getByLabel('可按给定假设试算').check();await page.getByRole('button',{name:'提交终局判断'}).click();
    for(const c of [1,3])await cell(page,0,c).click();await page.getByLabel('白方空点').check();for(const c of [1,3])await cell(page,4,c).click();
    await page.getByRole('button',{name:'提交区域答案'}).click();await expect(page.getByRole('heading',{name:'区域归属一致'})).toBeVisible();
    await page.getByRole('button',{name:'按顺序查看面积构成'}).click();for(let i=0;i<5;i++)await page.getByRole('button',{name:'下一步'}).click();
    await expect(page.getByRole('table',{name:'面积计分明细'})).toBeVisible();await page.getByLabel('试算贴目').fill('2.5');
    await expect(page.getByText(/教学试算：黑 10，白 17.5/)).toBeVisible();await page.getByRole('button',{name:'恢复原示例'}).click();
  });
  let draft:Buffer;
  await step('教师出题自动检查、保存及真实学生预览',async()=>{
    await page.goto('/#/teacher/editor');await page.getByRole('button',{name:/数气模板/}).click();await page.getByLabel('列表标题').fill('T24 自动化测试草稿，非正式题');
    await page.getByRole('button',{name:'运行自动检查'}).click();await expect(page.getByRole('heading',{name:'自动检查通过'})).toBeVisible();
    await page.getByRole('button',{name:'保存草稿'}).click();await page.getByRole('button',{name:'切换到学生预览'}).click();await expect(page.getByText('这是 T10 真实播放器')).toBeVisible();
    await page.getByRole('button',{name:/返回同一草稿继续编辑/}).click();
    const pending=page.waitForEvent('download');await page.getByRole('button',{name:'导出 Puzzle JSON'}).click();draft=await readFile((await (await pending).path())!);
    expect(JSON.parse(draft.toString())).toMatchObject({kind:'Puzzle',schemaVersion:1,revision:1,rulesetId:'GO-CLUB-AREA-1'});
  });
  await step('导入导出安全预览、坏JSON不覆盖',async()=>{
    await page.goto('/#/teacher/file-exchange');await page.getByLabel('JSON 文本').fill(draft!.toString());
    await page.getByRole('button',{name:'安全预览'}).click();await expect(page.getByTestId('json-preview')).toContainText('Puzzle 1');
    await page.getByRole('button',{name:/确认导入 1 项/}).click();await expect(page.getByText(/题目已作为未发布草稿交给 T14/)).toBeVisible();
    await page.getByLabel('JSON 文本').fill('{');await page.getByRole('button',{name:'安全预览'}).click();await expect(page.getByTestId('json-preview')).toContainText('不能导入');
    await page.getByRole('button',{name:'解析并逐分支验证'}).click();await page.getByLabel('线性功能使用的路线').selectOption('line-2');await page.getByRole('button',{name:'保存树与所选路线'}).click();
    await expect(page.getByText(/另有 1 条路线未加载/)).toBeVisible();
  });
  await step(process.env.T24_ONLINE_ONLY==='1'?'在线刷新与草稿恢复（不声称离线通过）':'真正禁网后刷新题库与草稿仍可用',async()=>{
    await page.goto('/#/teacher/offline-data');await expect(page.getByRole('heading',{name:'已可离线'})).toBeVisible({timeout:20_000});
    if(process.env.T24_ONLINE_ONLY!=='1')await context.setOffline(true);await page.reload();await page.goto('/#/challenges');await expect(page.getByText('30道正式题可用')).toBeVisible();
    await page.goto('/#/teacher/editor');await expect(page.getByLabel('列表标题')).toHaveValue('T24 自动化测试草稿，非正式题');
    await page.screenshot({path:evidence+'/offline-editor.png',fullPage:true});
  });
  await step(process.env.T24_ONLINE_ONLY==='1'?'在线反馈空态、重复提交锁、下一人清空':'离线反馈空态、重复提交锁、下一人清空',async()=>{
    await page.goto('/#/teacher/evidence');await expect(page.getByTestId('reply-total')).toContainText('答复数：0');
    await page.goto('/#/feedback');await page.getByRole('button',{name:'建立活动',exact:true}).click();
    await page.getByLabel('活动编号（留空自动建立）').fill('TEST-T24-JOURNEY');await page.getByLabel('活动日期',{exact:true}).fill('2026-10-09');
    await page.getByLabel('活动简名').fill('自动化开发验证，不是真实活动');await page.getByRole('button',{name:'保存活动',exact:true}).click();
    await page.getByLabel('今天活动难度感受').selectOption('comfortable');await page.getByLabel('最喜欢的活动').selectOption('liberties');
    await page.getByLabel('希望下次改变什么').fill('固定测试文本，不是真实成员意见');
    await page.getByRole('button',{name:'提交这一份'}).evaluate((b:HTMLButtonElement)=>{b.click();b.click();});
    await expect(page.getByRole('heading',{name:'这一份已保存'})).toBeVisible();await page.getByRole('button',{name:'下一位成员（空表）'}).click();
    await expect(page.getByLabel('希望下次改变什么')).toHaveValue('');
    await page.goto('/#/teacher/evidence');await page.getByLabel('选择活动').selectOption('TEST-T24-JOURNEY');await expect(page.getByTestId('reply-total')).toContainText('答复数：1');
    await page.getByRole('button',{name:'资源改进',exact:true}).click();await page.getByRole('button',{name:'新建改进条目'}).click();
    await page.getByLabel('观察到的问题').fill('自动化检查关联，不是真实观察');await page.getByLabel('拟改资源 ID / revision').selectOption('LIB-001@1');
    await page.getByLabel('修改内容（向题干补充；更多编辑在 T14 继续）').fill('仅本机测试草稿');await page.getByRole('button',{name:'保存改进条目'}).click();
    await expect(page.getByText(/实施后观察：未观察/)).toBeVisible();
  });
  await step('完整备份、选择性清除、损坏备份拒绝及恢复',async()=>{
    await page.goto('/#/teacher/offline-data');const pending=page.waitForEvent('download');await page.getByRole('button',{name:'导出完整备份'}).click();
    const backup=await readFile((await (await pending).path())!);const parsed=JSON.parse(backup.toString());expect(parsed.schemaVersion).toBe(1);expect(parsed.records.some((r:{namespace:string})=>r.namespace==='evidence')).toBe(true);
    await page.getByRole('button',{name:'学习进度与作答记录',exact:true}).click();await page.getByRole('button',{name:'确认清除该范围'}).click();
    await expect(page.getByRole('status').filter({hasText:'已清除“学习进度与作答记录”'})).toBeVisible();
    await page.getByLabel('选择备份文件').setInputFiles({name:'broken-test.json',mimeType:'application/json',buffer:Buffer.from('{"schemaVersion":99}')});
    await expect(page.getByText(/只支持.*备份主版本 1/)).toBeVisible();
    await page.getByLabel('选择备份文件').setInputFiles({name:'t24-test-backup.json',mimeType:'application/json',buffer:backup});await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'确认用此备份替换本机记录'}).click()]);
    await page.goto('/#/teacher/evidence');await page.getByLabel('选择活动').selectOption('TEST-T24-JOURNEY');await expect(page.getByTestId('reply-total')).toContainText('答复数：1');
    await page.goto('/#/teacher/editor');await expect(page.locator('.draft-list')).toContainText('T24 自动化测试草稿');
    await context.setOffline(false);
  });
  await step('无运行错误、无外部请求、测试数据仅存在隔离上下文',async()=>{expect(errors).toEqual([]);expect(external).toEqual([]);});
});

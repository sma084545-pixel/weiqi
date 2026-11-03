async page=>{
 const browser=page.context().browser(),checks=[],errors=[],model='kata1-tf2-b10c384-s2941M-d5872M';
 for(const [base,difficulty,human] of [['http://127.0.0.1:4190','extreme','W'],['https://sma084545-pixel.github.io/weiqi','relaxed','B'],['https://sma084545-pixel.github.io/weiqi','standard','B'],['https://sma084545-pixel.github.io/weiqi','challenge','B']]){
  const c=await browser.newContext({viewport:{width:1280,height:960},reducedMotion:'reduce'}),p=await c.newPage(),responses=[];p.setDefaultTimeout(100_000);p.on('pageerror',e=>errors.push(e.message));p.on('response',async r=>{if(r.request().method()==='POST'&&r.url().endsWith('/api/ai-move'))responses.push({url:r.url(),status:r.status(),body:await r.json().catch(()=>null)});});
  try{
   await p.goto(base+'/#/play/ai');await p.getByLabel('难度').selectOption(difficulty);await p.getByLabel('棋盘尺寸').selectOption('5');if(human==='W')await p.getByRole('radio',{name:'白方（AI 先行）'}).check();const received=p.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/api/ai-move'));await p.getByRole('button',{name:'验证设置并开始 AI 对局',exact:true}).click();
   if(human==='B')await p.locator('.full-board-panel>.shared-board [data-row="0"][data-col="0"]').click();
   await p.waitForFunction(n=>document.querySelector('[data-testid="ai-game"]')?.getAttribute('data-move-count')===String(n),human==='W'?1:2,{timeout:100_000});
   const raw=await received;const result={url:raw.url(),status:raw.status(),body:await raw.json()};if(result.status!==200||result.body.difficulty!==difficulty)throw Error('Missing real reply: '+difficulty+' '+JSON.stringify(result));
   if(difficulty==='extreme'){if(result.body.engine.model!==model||!result.url.startsWith('https://weiqi-katago-extreme.onrender.com/'))throw Error('Incorrect extreme endpoint/model');}
   else if(result.body.engine.model!=='g170-b6c96-s175395328-d26788732'||result.body.engine.maxVisits!==({relaxed:8,standard:24,challenge:64})[difficulty])throw Error('Old levels changed');
   checks.push({name:base.startsWith('http:')?'local4190-real-Render-extreme-CORS':'public-old-level-'+difficulty,status:'passed',response:result});
  }finally{await c.close();}
 }
 if(errors.length)throw Error(errors.join(';'));return {schemaVersion:1,id:'EXTREME-ALL-CLIENTS',revision:1,rulesetId:'GO-CLUB-AREA-1',status:'passed',at:new Date().toISOString(),browser:browser.version(),checks,errors,humanReviewed:null};
}

// Start a freshly extracted project through its documented dev command.
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const command=process.env.T24_PNPM??'pnpm';
const child=spawn(command,['dev','--port','4197'],{cwd:process.cwd(),env:process.env,stdio:['ignore','pipe','pipe']});
let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
let browser;
try{
  const origin='http://127.0.0.1:4197';
  for(let i=0;i<50;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch();const context=await browser.newContext();const page=await context.newPage();
  await page.goto(origin);await page.getByRole('heading',{name:'从这里开始'}).waitFor();
  console.log(JSON.stringify({schemaVersion:1,id:'T24-CLEAN-DEV-START',revision:1,rulesetId:'GO-CLUB-AREA-1',status:'passed',cwd:process.cwd(),command:[command,'dev','--port','4197'],programVersion:JSON.parse(await readFile('package.json','utf8')).version,browser:browser.version(),heading:await page.getByRole('heading',{name:'从这里开始'}).innerText(),humanReviewed:null}));
  await context.close();
}finally{if(browser)await browser.close();child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));console.log(output);}

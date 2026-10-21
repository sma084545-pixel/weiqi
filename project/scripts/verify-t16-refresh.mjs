import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';

const port=4191,origin=`http://127.0.0.1:${port}`;
const server=spawn('./node_modules/.bin/vite',['preview','--host','127.0.0.1','--port',String(port)],{stdio:['ignore','pipe','pipe']});
const waitForServer=()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Preview server did not start')),10_000);server.stdout.on('data',chunk=>{if(String(chunk).includes('Local:')){clearTimeout(timer);resolve();}});server.once('exit',code=>reject(new Error(`Preview server exited with ${code}`)));});
let browser;
try{
  await waitForServer();browser=await chromium.launch({headless:true});const page=await browser.newPage();
  await page.goto(`${origin}/#/teacher/editor`);await page.getByRole('button',{name:/数气模板/}).click();await page.getByLabel('列表标题').fill('刷新后仍在的草稿');
  await page.waitForFunction(async()=>{const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('go-club-local',1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});return new Promise(resolve=>{const request=db.transaction('records','readonly').objectStore('records').get('go-club:teacher-editor-session:v1');request.onsuccess=()=>{try{resolve(JSON.parse(request.result?.value??'null')?.entry?.title==='刷新后仍在的草稿');}catch{resolve(false);}};});});
  await page.waitForTimeout(500);await page.reload();const title=await page.getByLabel('列表标题').inputValue(),status=await page.locator('.editor-status').innerText();if(title!=='刷新后仍在的草稿'||!status.includes('已恢复上次尚未提交的编辑内容。'))throw new Error(`Refresh recovery mismatch: ${title} / ${status}`);
  console.log(JSON.stringify({ok:true,check:'teacher-editor-refresh-recovery',title,status:status.replace(/\n/g,' ')}));
}finally{await browser?.close();server.kill('SIGTERM');}

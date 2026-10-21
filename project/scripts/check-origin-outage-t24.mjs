// Independent origin-outage control. Not equivalent to disabling all networking.
import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium,webkit,expect} from '@playwright/test';
const root=path.resolve('dist'),out=path.resolve('docs/t24/checks/origin-outage');await mkdir(out,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png'};
const rows=[];
const snapshot=page=>page.evaluate(async()=>{const db=await new Promise((r,j)=>{const q=indexedDB.open('go-club-local',1);q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error);});return new Promise(r=>{const q=db.transaction('records','readonly').objectStore('records').getAll();q.onsuccess=()=>{const entries=q.result.filter(x=>x.namespace==='drafts').map(x=>({key:x.key,title:JSON.parse(x.value).entry?.title??null,savedTitles:JSON.parse(x.value).entries?.map(x=>x.title)??null}));db.close();r(entries);};});});
for(const [name,driver] of Object.entries({chromium,webkit})){
  let listening=true;const requests=[];const server=http.createServer(async(req,res)=>{
    requests.push(req.url);try{const file=path.join(root,new URL(req.url,'http://local').pathname==='/'?'index.html':decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
      const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'});res.end(data);
    }catch{res.writeHead(404);res.end('missing');}
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await driver.launch();const context=await browser.newContext();const page=await context.newPage();page.setDefaultTimeout(15_000);
  const result={name,version:browser.version(),method:'stop isolated HTTP origin; no setOffline flag',scope:'origin-unavailability control, not physical Wi-Fi disconnection',status:'pending'};
  try{
    await page.goto(origin+'/#/teacher/offline-data');await page.getByRole('heading',{name:'已可离线'}).waitFor();
    const readiness=await page.evaluate(async()=>{await navigator.serviceWorker.ready;return {controller:!!navigator.serviceWorker.controller,cacheNames:await caches.keys()};});if(!readiness.controller)throw Error('No service worker controller');result.readiness=readiness;
    await page.goto(origin+'/#/teacher/editor');await page.getByRole('button',{name:/数气模板/}).click();await page.getByLabel('列表标题').fill('TEST-T24 outage draft, not formal');await page.getByRole('button',{name:'保存草稿'}).click();result.beforeRefresh=await snapshot(page);
    await new Promise((resolve,reject)=>{server.close(e=>e?reject(e):resolve());server.closeAllConnections();});listening=false;const before=requests.length;
    await page.reload();await expect(page.getByLabel('列表标题')).toHaveValue('TEST-T24 outage draft, not formal',{timeout:15_000});
    await page.goto(origin+'/#/challenges');await page.getByText('30道正式题可用').waitFor();
    await page.locator('.puzzle-card').filter({hasText:'LIB-001'}).getByRole('button',{name:/作答/}).click();await page.getByTestId('number-answer').fill('4');await page.getByRole('button',{name:'提交回答'}).click();await page.getByText('已达到标准',{exact:true}).waitFor();
    await page.screenshot({path:out+'/'+name+'.png',fullPage:true});result.status='passed';result.requestsAfterOriginStopped=requests.slice(before);if(result.requestsAfterOriginStopped.length)throw Error('Origin still received requests');
  }catch(e){result.status='failed';result.error=e.message;result.afterFailure=await snapshot(page).catch(()=>null);process.exitCode=1;}
  finally{await context.close();await browser.close();if(listening){await new Promise(r=>{server.close(r);server.closeAllConnections();});}}
  rows.push(result);console.log(JSON.stringify(result));
}
await writeFile(out+'/results.json',JSON.stringify({schemaVersion:1,id:'T24-ORIGIN-OUTAGE-CONTROL',revision:1,rulesetId:'GO-CLUB-AREA-1',rows,humanReviewed:null},null,2));

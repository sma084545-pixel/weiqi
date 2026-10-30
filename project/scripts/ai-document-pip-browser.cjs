// The current CLI page has a real, two-move 9x9 AI game. This opens the browser's actual PiP API.
async page => {
  const context=page.context(),supported=await page.evaluate(()=>Boolean(window.documentPictureInPicture));
  if(!supported)return {status:'unsupported',fallback:'Interactive floating board checked separately'};
  let pip;for(const candidate of context.pages())if(candidate!==page&&await candidate.title()==='AI 对弈 · 画中画')pip=candidate;
  if(!pip){const opening=context.waitForEvent('page');await page.getByRole('button',{name:'独立画中画',exact:true}).click();pip=await opening;}
  await pip.getByRole('heading',{name:'AI 对弈 · 画中画',exact:true}).waitFor();
  const count=await pip.locator('[data-row][data-col]').count();if(count!==81)throw Error('PiP must show all nine-board points');
  const response=page.waitForResponse(r=>r.url().endsWith('/api/ai-move')&&r.request().method()==='POST');
  await pip.locator('[data-row="8"][data-col="8"]').click();await page.waitForFunction(()=>document.querySelector('[data-testid="ai-game"]')?.getAttribute('data-move-count')==='4',null,{timeout:100000});
  const res=await response,body=await res.json();if(res.status()!==200||body.engine.model!=='g170-b6c96-s175395328-d26788732')throw Error('Actual AI reply not received');
  await pip.screenshot({path:'output/playwright/ai-real-document-pip.png'});await pip.close();
  return {schemaVersion:1,id:'AI-DOCUMENT-PIP',revision:1,rulesetId:'GO-CLUB-AREA-1',status:'passed',independentWindow:true,intersections:count,mainMoves:await page.getByTestId('ai-game').getAttribute('data-move-count'),response:body,browser:context.browser().version(),at:new Date().toISOString()};
}

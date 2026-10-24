async (page) => {
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1280,height:900});
 await page.goto('http://127.0.0.1:4216/#/route/STAGE-07');
 await page.getByRole('heading',{name:'好形与坏形',exact:true}).waitFor();
 await page.getByRole('navigation',{name:'本课环节'}).getByRole('button',{name:/Try It Yourself/}).click();
 await page.locator('[data-scene-id="ADV-07-01"]').waitFor();
 await page.screenshot({path:'output/playwright/advanced-seven-1280.png',fullPage:true});
 await page.getByLabel('B：舒展直线',{exact:true}).check();
 await page.getByRole('button',{name:'验证本题',exact:true}).click();
 await page.locator('[data-verdict="success"]').waitFor();
 await page.getByRole('button',{name:'修复空三角倾向',exact:true}).click();
 await page.locator('[data-scene-id="ADV-07-03"] [data-row="2"][data-col="2"]').click();
 await page.getByRole('button',{name:'验证本题',exact:true}).click();
 await page.locator('[data-verdict="suboptimal"]').waitFor();
 await page.screenshot({path:'output/playwright/advanced-feedback-1280.png',fullPage:true});
 return {ok:true,errors,bodyWidth:await page.evaluate(()=>document.documentElement.scrollWidth),viewport:1280};
}

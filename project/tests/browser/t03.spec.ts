import {mkdir} from 'node:fs/promises';
import {test,expect} from '@playwright/test';
import {moduleRegistry} from '../../src/features/learning-hub/registry';

const evidence='output/playwright/t03';
test.beforeAll(async()=>{await mkdir(evidence,{recursive:true});});

test('first visit finds the available liberty entry and can return',async({page})=>{
  await page.setViewportSize({width:1280,height:900});await page.goto('/');
  await expect(page.getByRole('heading',{name:'从这里开始'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'我第一次接触围棋'})).toBeVisible();
  await expect(page.locator('.entry-partner a[href="#/play/free"]')).toHaveCount(1);
  await expect(page.locator('a[href="#/challenges"]')).toHaveCount(1);
  await page.locator('a[href="#/learn/liberties"]').click();
  await expect(page).toHaveURL(/#\/learn\/liberties$/);
  await expect(page.getByRole('heading',{level:1,name:'气实验室'})).toBeVisible();
  await page.getByRole('link',{name:/返回学习路线/}).click();
  await expect(page.getByRole('heading',{level:1,name:'六阶段学习路线'})).toBeVisible();
  await expect(page.locator('[data-stage-id]')).toHaveCount(6);
  await page.screenshot({path:`${evidence}/1280-route.png`,fullPage:true});
});

test('experienced route skip, self marks, refresh resume, and scoped clear',async({page})=>{
  await page.goto('/#/route/STAGE-05');
  await expect(page.getByRole('heading',{level:1,name:/眼与基础死活/})).toBeVisible();
  await page.getByRole('button',{name:'还想练习'}).click();
  await page.reload();
  await expect(page.getByRole('button',{name:'还想练习'})).toHaveAttribute('aria-pressed','true');
  await page.evaluate(()=>localStorage.setItem('go-club:v1:DEV-LIB-001','content-stays'));
  await page.goto('/#/home');
  const resume=page.getByRole('link',{name:/继续上次：眼与基础死活/});await expect(resume).toBeVisible();
  await resume.click();await expect(page).toHaveURL(/STAGE-05$/);
  await page.goto('/#/home');
  await page.getByRole('button',{name:'清除本机进度'}).click();await page.getByRole('button',{name:'确认清除'}).click();
  expect(await page.evaluate(()=>({progress:localStorage.getItem('go-club:learning-progress:v1'),content:localStorage.getItem('go-club:v1:DEV-LIB-001')}))).toEqual({progress:null,content:'content-stays'});
  await expect(page.getByText(/打开任一阶段后/)).toBeVisible();
});

test('published links resolve, unknown routes recover, and the former puzzle route remains usable',async({page})=>{
  await page.goto('/#/home');
  const homeRoutes=await page.locator('a[href^="#/"]').evaluateAll(links=>links.map(link=>link.getAttribute('href')!));
  for(const route of homeRoutes)expect(moduleRegistry.resolve(route),route).toMatchObject({ok:true});
  await page.goto('/#/route');
  const routeLinks=await page.locator('a[href^="#/"]').evaluateAll(links=>links.map(link=>link.getAttribute('href')!));
  for(const route of routeLinks)expect(moduleRegistry.resolve(route),route).toMatchObject({ok:true});
  await page.goto('/#/does-not-exist');await expect(page.getByRole('heading',{name:'没有找到这个页面'})).toBeVisible();await expect(page.getByRole('link',{name:'返回学习路线'})).toBeVisible();
  await page.goto('/#/challenge/try-one');await expect(page.getByRole('heading',{name:'互动挑战题'})).toBeVisible();await expect(page.getByText('30道正式题可用')).toBeVisible();
});

for(const width of [360,768,1280]){
  test(`${width}px learning hub navigation is readable without page overflow`,async({page})=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.setViewportSize({width,height:1000});await page.goto('/#/home');
    await expect(page.getByRole('navigation',{name:'主要导航'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'我第一次接触围棋'})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const targets=await page.locator('a,button,label').evaluateAll(items=>items.filter(item=>{const box=item.getBoundingClientRect();return box.width>0&&box.height>0;}).map(item=>item.getBoundingClientRect().height));
    expect(Math.min(...targets)).toBeGreaterThanOrEqual(37.5);
    expect(errors).toEqual([]);
    await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();scrollTo(0,0);});
    await page.screenshot({path:`${evidence}/${width}-home.png`,fullPage:true});
  });
}

test('teacher view exposes a usable optional plan and projection mode without internal terms',async({page})=>{
  await page.setViewportSize({width:1280,height:900});await page.goto('/#/teacher');
  await expect(page.getByRole('heading',{level:1,name:'教师视图'})).toBeVisible();
  await page.getByRole('button',{name:'查看安排'}).click();
  for(const item of ['5分钟','10分钟','15分钟'])await expect(page.getByText(item,{exact:true}).first()).toBeVisible();
  expect(await page.locator('.lesson-plan li').evaluateAll(items=>items.map(item=>Number(item.querySelector('time')?.textContent?.match(/\d+/)?.[0]??0)).reduce((sum,value)=>sum+value,0))).toBe(45);
  await page.locator('.projector-control input').check();await expect(page.locator('.learning-app')).toHaveClass(/app-projector/);
  const visibleText=await page.locator('main').innerText();expect(visibleText).not.toContain('schemaVersion');expect(visibleText).not.toContain('GO-CLUB-AREA-1');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`${evidence}/1280-teacher-projector.png`,fullPage:true});
});

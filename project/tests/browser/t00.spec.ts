import {test,expect} from '@playwright/test';
test('T00 landing contract remains readable on the T03 learning hub',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:360,height:900});await page.goto('/');
  await expect(page.getByRole('heading',{level:1})).toContainText('一起落子');
  await expect(page.getByText('这些是可调整的规划假设')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

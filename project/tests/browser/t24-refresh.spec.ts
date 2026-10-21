import {expect,test} from '@playwright/test';
// Isolated browser data; fixed test titles never become shipped user records.
test('immediate save, unsaved edit and route exit all restore the latest editor state',async({page})=>{
  await page.goto('/#/teacher/editor');
  await page.getByRole('button',{name:/数气模板/}).click();
  await page.getByLabel('列表标题').fill('TEST-T24 quick saved draft');
  await page.getByRole('button',{name:'保存草稿'}).click();
  await page.reload();
  await expect(page.getByLabel('列表标题')).toHaveValue('TEST-T24 quick saved draft');
  for(let i=0;i<3;i++){
    const title=`TEST-T24 quick unsaved edit ${i}`;
    await page.getByLabel('列表标题').fill(title);
    await page.reload();
    await expect(page.getByLabel('列表标题')).toHaveValue(title);
  }
  await page.getByLabel('列表标题').fill('TEST-T24 route exit preserves edit');
  await page.getByRole('link',{name:'← 返回教师视图'}).click();
  await page.goto('/#/teacher/editor');
  await expect(page.getByLabel('列表标题')).toHaveValue('TEST-T24 route exit preserves edit');
  await expect(page.locator('.draft-list')).toContainText('TEST-T24 quick saved draft');
});

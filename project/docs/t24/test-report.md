---
schemaVersion: 1
id: T24-TEST-REPORT
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 实际测试报告

检查日期2026-10-09；工具包0.17.1-t24.1/程序0.17.1；隔离工作副本，无真实成员数据。Node24.19.0、pnpm11.25.0执行声明pnpm11.19.0的现有锁文件；依赖与锁文件没有变更。

| 类别 | 实际命令/动作 | 结果 | 证据 |
|---|---|---|---|
| 干净安装 | pnpm install --frozen-lockfile | 通过 | checks/clean-install-online-approved.log（沙箱首次网络失败另存，不冒称成功） |
| 程序/规则完整 | pnpm check（修复后） | 通过，43文件358测试；含构建、引擎独立导入、容量与恢复 | checks/full-check-after-fix.log |
| 内容 | pnpm validate:t09 / test:t09-grader（包含在check） | 通过，851检查/134录入着/2179探索状态；30+6；grader20 | 同上、content/validation/ |
| 冻结 | verify:t16-freeze / verify:merge-a | 通过，201文件字节未变 | 同上 |
| Chromium | pnpm test:browser | 通过，150项，版本151.0.7922.34 | checks/browser-after-fix.log、output/playwright/ |
| 连续路线 | tests/browser/t24.spec.ts | 通过17步，从首次进入至反馈/备份恢复；真实context.setOffline禁网刷新 | checks/journey/chromium/journey.json及截图 |
| WebKit | T24_ONLINE_ONLY=1 pnpm exec playwright test tests/browser/t24.spec.ts tests/browser/t24-refresh.spec.ts --browser=webkit --workers=1 | 通过2项，WebKit26.5；17步在线路线、快速刷新 | checks/browser-webkit-after-fix.log、journey/webkit/ |
| 缓存控制 | node scripts/check-origin-outage-t24.mjs | Chromium/WebKit均通过；先缓存，再停止隔离HTTP服务，刷新草稿、完成数气题，服务关闭后收到0请求 | checks/origin-outage-after-fix.log、origin-outage/results.json |
| 材料回归 | Python scripts/verify-materials-t24.py | 全通过：T18 47、T19 44、T20规则/印刷、T21 84、T22内容/原生与备注 | checks/materials/commands.json及逐任务日志 |
| 跨介质静态 | Python scripts/audit-t24.py | 617通过、0失败；30+6，25主讲页，6活动各45分钟，全部handoff | checks/cross-media-audit.json |
| 页面渲染 | Python scripts/render-t24.py（最后--reuse-office仅复用已新转换Office副本） | 113PDF/459页实际渲染，315独立栅格/79联系表全部助手查看 | checks/render-report.json、visual-review.md |
| 归档再验收 | 解压候选ZIP、干净安装、完整check、Chromium连续路线、逐文件SHA/CRC | 通过，干净安装/完整check/两浏览器测试/README开发启动；最终ZIP另解压构建与校验 | checks/archive-recheck/及release外ARCHIVE_CHECK.json |

独立预期来自tests/fixtures、EXPECTED_RESULTS、T09显式点集/变化/终局手算、T19毫米参数；没有由被测引擎自产全部正确答案。T24连续路线明确回答中心单子4气、同屏角上3手首次提胜、黑白角子最终1:1/79中立、END-001已给假设10:15/贴目2.5变10:17.5等。

实际覆盖360/768/1280px、四种完整盘面、四角/边点、键盘/Enter/Space、模拟触摸、不重复回调、19路局部滚动/复位、灰度、减少动画、hash深链接/刷新、坏导入恢复、配额/写入拒绝、更新不强刷、旧revision不复用成绩。截图与浏览器断网区别于静态代码检查。

失败记录保留：T14快速刷新初次失败已复现并修复；T19误标签已修复；WebKit context.setOffline引发工具内部错误（未列通过）；Firefox启动超时/图形插件拒绝（未测）；首次沙箱无网络依赖获取失败后以获准环境重新安装通过；开发启动检查工具的首次路径错误更正后通过（原日志保留），成功检查后主动停止开发服务的143退出码为清理，不是页面启动失败。见known-issues.md。资源服务停止是网络来源不可用控制实验，不等于禁用全部网络或物理断开Wi-Fi。

真人教师复核、真实成员/课堂、实际打印制造、设备实机、学校CAS审核：未测/未发生。空表和固定TEST数据不冒充这些证据。归档里不带浏览器用户库、IndexedDB文件或测试生成的实际存储。

---
schemaVersion: 1
id: RENDER-PUBLIC-ACCEPTANCE
revision: 2
rulesetId: GO-CLUB-AREA-1
---

# 原网址公网联机验收

基线0.20.2-pages.1，前端0.20.3；公开运行后台探测为0.20.2、protocolVersion1。原地址https://sma084545-pixel.github.io/weiqi/，后台https://weiqi-rooms.onrender.com。规则、schema、正式题revision、材料和锁文件保持。

| 验收项 | 结论 | 实际证据 |
|---|---|---|
| 干净安装、393单元及完整check链 | 通过 | checks/check.log；851内容检查、30题6终局、冻结、独立引擎/容量链 |
| 公开构建与本地软件的来源分流 | 通过 | checks/build-pages.log；11个hosting测试含公开HTTPS、本地同源与错误来源 |
| 原176浏览器及9项本机联机回归 | 通过 | checks/browser.log；Playwright自带Chromium151，local-online截图 |
| 公开HTTPS健康/WSS、原邀请路径、无关Origin403 | 通过 | checks/service-probe.json，Render真实公网 |
| 原GitHub网址建房/加入、轮次、提子、自杀拒绝、快速连点 | 通过 | checks/public-journey.json；WSS均连接实际Render路径，两个独立匿名会话 |
| 独立回看、双方悔棋、恢复被提棋、新分支、刷新恢复座位 | 通过 | 同上，public-live-board.png |
| 双停、整块死子注释、修改取消确认、双方确认与1:1和棋 | 通过 | 同上，public-confirmed-draw.png；独立手算为双方各1活子+0围空，79混合边界空点中立 |
| 本机副本、真实导出和独立引擎重放 | 通过 | checks/QA-online-export.json（明确TEST）；export-replay.json，无座位token |
| 原网址0.20.2→0.20.3保存后升级，已有阶段标记/棋局保留 | 通过 | public-seed.json与public-journey.json，同一个独立QA来源真实更新，不清站点数据 |
| 原网址禁网刷新本机棋局及已准备的题库 | 通过 | public-journey.json，public-offline.png；不能把它称为断网联机 |
| 360/768/1280px、19/13/9路、触屏/键盘/reduced-motion | 通过 | checks/public-responsive.json与public-360/768/1280.png；19路局部滚动、不挤出页面 |
| 房间玩家实际禁网/联网重连 | 通过 | public-responsive.json；另一方暂停、断线不判负，原座位恢复并同步下一手 |
| 基准规则/模型/全部内容/材料/旧交接/共享组件/锁 | 通过 | checks/preservation.json，1047项逐文件SHA不变 |
| 原生Safari/Firefox、真人辅助技术、两台实体设备和独立网络 | 未测 | 不把Chrome155的两个隔离会话冒充物理双设备 |
| 免费实例休眠/重新部署后的长期存储 | 未测且不承诺保留房间 | 临时文件设计，界面提示本机副本/导出，不提供永久云存档 |
| Render账户计费、地域与实际构建提交 | 未测 | 浏览器访问后台被保存策略拒绝；用户自行创建服务，未绕过或购买 |

公开浏览器为Playwright CLI实际HeadlessChrome155；与本机自动化Chromium151分开记录。公开流程和响应式检查均0页面运行错误。截图经过模型视觉检查，不称为人类教师审核；未做实体制造或课堂效果验证。

首轮公网自动化没有等到另一端收到确认消息就修改标记，验证等待超时；补上按状态同步等待后再验。次轮已到最终计分，测试脚本的动态Node导入不受CLI执行环境支持；改用download.saveAs并在独立runner中校验JSON。最终完整流程通过，未为修复测试脚本改变已发布程序。两次原失败日志与修正说明保留在checks/public-check-retries.json及attempt日志，不掩盖为首轮全通过。

归档解压CRC/逐文件SHA、干净目录构建/内容校验、无node_modules软件包运行与远端发布校验见版本发布旁ARCHIVE_CHECK.json及PUBLISH_RESULT.json。验收不构成通用死活证明、长期服务保证、实体设备验证或CAS认可。

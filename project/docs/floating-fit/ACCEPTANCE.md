---
schemaVersion: 1
id: FLOATING-FIT-ACCEPTANCE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 整盘悬浮棋盘验收

底本ONLINE_FLOATING_PLAY 0.21.2-pages.1，结果0.21.3-pages.1。

| 检查 | 状态 | 实际证据 |
|---|---|---|
| 5/9/13/19路全部N²交点、四角和棋子同时在小窗内 | 通过 | 22项online-browser.log，逐点矩形与窗口/布局区域边界检查，内部无滚动 |
| 360/768/1280宽、740×360短横屏、窗口旋转和复位 | 通过 | 四种盘面各自缩放回归；local-*-floating-19.png逐张检查 |
| 触屏四角直接落子、键盘、连点去重、主盘和伙伴同步 | 通过 | 本机4190真实Chrome155.0.8059.86两独立上下文；local-preview.json |
| 回看只读、对方轮次禁落、自杀、提子、悔棋、死子确认 | 通过 | online-browser.log；共用原规则与客户端，不改引擎 |
| 真正原生PiP19路整盘显示及操作；最大化/全屏/聊天恢复 | 通过 | native-pip.json和22项联机测试，Chromium151.0.7922.34 |
| 399单元/49文件、851内容检查与构建、11Pages检查 | 通过 | check.log、pages.log、build-pages.log |
| 规则/schema、内容30题/6终局、材料、旧交接、依赖保持 | 通过 | preservation.json，1042份受保护文件一致 |
| 原GitHub网站的实际显示与双向联机 | 通过 | public-journey.json：Chrome155，9组实际流程，361交点/四角、旋转、同步、PiP/聊天、禁网恢复，0页面异常 |
| 最终ZIP解压、CRC/全部哈希、干净安装测试构建、无依赖软件启动 | 独立归档复验 | ZIP同目录ARCHIVE_CHECK.json和bare-app.json最终状态为准 |
| 真实手机、异地独立网络、原生Safari/Firefox、屏幕阅读器 | 未测 | 浏览器触屏模拟与独立上下文不等于实体/真人测试 |

按照用户“整盘可见”的明确要求，小窗优先完整全局视野，覆盖0.21.2对小窗每格32px并滚动的展示选择。普通和放大棋盘保持较大的点击区域，密集19路可一键放大；没有改变共享坐标、BoardProps、规则或已保存数据。

初次沙箱TCP监听被拒，获准运行后399项通过；首次短横屏的13/19路几何错误已修正，最终22/22通过。原始失败与几何证据在checks/pre-fix和resolved-issues.md，不将失败隐藏或改松断言。

本轮未重复不受影响的全站176项静态浏览器套件；该套件上一版本通过。本轮实际执行受影响22项、完整check、Pages与本机/公网独立交互，不把历史通过冒充本轮重跑。

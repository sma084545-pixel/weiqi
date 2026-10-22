---
schemaVersion: 1
id: FLOATING-PLAY-ACCEPTANCE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 0.21.2 悬浮棋盘验收

底本ONLINE_PLAY_TOOLS 0.21.1-pages.1；结果0.21.2-pages.1。所有测试使用明确的TEST自动化房间，不是学生活动或反馈。2026-10-22实际执行，无人类教学审核。

| 项目 | 状态 | 证据 |
|---|---|---|
| 小窗黑白直接点击/空格，主盘与双方同步 | 通过 | 21项online-browser.log；原网址public-journey.json |
| 连点只落一次、非本人轮次/占点/自杀/结束后拒绝 | 通过 | online-tools.spec.ts及online-browser.log |
| 提子、双方悔棋同意/拒绝、死子注释取消旧确认 | 通过 | online-browser.log；规则使用既有引擎 |
| 只读回看、对方现局不变，返回当前继续 | 通过 | 本地及公网两独立浏览器上下文 |
| 5/9/13/19路、32px交点、360/768/1280、大盘窗内滚动/复位 | 通过 | browser/*floating*.png及public-360-floating-19.png |
| 拖动柄、键盘焦点跟随、顶部关闭实际可命中 | 通过 | online-tools.spec.ts；导航遮挡已修正 |
| 既有PiP、Fullscreen、聊天/刷新/禁网后重连 | 通过 | 本地实际API及公网Chrome155.0.8059.86，public-journey.json |
| 完整源工程和内容回归 | 通过 | check.log：399项/49文件、851内容检查与既有各检查；176项浏览器回归；11项Pages检查 |
| 正式规则/schema/30题/6终局/材料/旧交接/锁文件 | 通过 | preservation.json：1041份受保护文件相同；旧生成图已恢复字节，新证据另存 |
| 原GitHub网址与Render0.21.0兼容，无需后台重启 | 通过 | 原站0.21.2，health实际0.21.0/roomChat=1；9组公网流程，0页面异常 |
| 最终ZIP完整解压、全部内部哈希、新目录安装/测试/构建与软件启动 | 归档独立验证 | ZIP同目录ARCHIVE_CHECK.json、bare-app.json、SHA256SUMS.txt（其最终状态为准） |
| 真实手机、异地两条网络、原生Safari/Firefox、屏幕阅读器/课堂 | 未测 | 本轮实际为桌面Chrome/Chromium独立上下文及触屏模拟，不冒充实体或人类检验 |

首轮有一个测试预期错误：最终确认作为第7个历史事件，按4落子+2停手+1最终确认修正，未改变引擎。首轮20/21日志保留；最终21/21。视觉发现导航层级盖小窗顶，已修复并加实际命中断言，最终截图复查通过。

主要原始记录在checks/，命令和内核版本汇总于checks/local-checks.json。公网运行由scripts/run-floating-play-browser.py执行scripts/online-floating-public.js：实际HTTPS原网址、Render WSS、真实Document PiP、禁用网络和触屏模拟，不是看代码替代测试。自动化的TEST数据不进入真实成员反馈或教学成效。

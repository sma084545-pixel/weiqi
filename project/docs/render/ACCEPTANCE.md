---
schemaVersion: 1
id: RENDER-PUBLIC-ACCEPTANCE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 公网接入验收

以0.20.2-pages.1完整主线为底，前端0.20.3，实际运行后台0.20.2/protocol1。无规则/schema/正式内容/依赖变化。

| 项目 | 状态 | 证据 |
|---|---|---|
| 干净锁文件安装、393单元、完整check链与构建 | 通过 | checks/check.log、checks/build-pages.log |
| 176原浏览器+9本机联机用例 | 通过 | checks/browser.log，local-online截图 |
| Render公开HTTPS健康、合法来源WSS、原邀请路径、无关Origin403 | 通过 | checks/service-probe.json |
| 原网址建房/加入/同步/悔棋/计分 | 待本次上线后实际验证 | checks/public-journey.json生成后记录 |
| 原网址旧缓存升级及断网恢复 | 待本次上线后实际验证 | checks/public-seed.json及后续检查 |
| 两台实体设备/不同网络、长期运行/休眠恢复、真人教学 | 未测 | 不把浏览器会话称为实体设备 |

测试数据只用于独立QA浏览器，不生成真实成员反馈。历史验证文件恢复原字节，新的回归日志另存。归档CRC/逐文件SHA/干净复验将在发布旁记录；未完成前不据此宣称全部上线验收通过。

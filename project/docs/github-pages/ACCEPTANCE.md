---
schemaVersion: 1
id: GITHUB-PAGES-ACCEPTANCE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 原网址同步验收

唯一基线ONLINE_PLAY 0.20.0-online.1；远端初始main=71953a7d1054c67f1cbfa27cf8920b4cb32d113f、Pages主分支根目录legacy发布，原版本0.16.0。恢复原已授权GitHub CLI凭据助手（临时二进制缺失），比对官方2.98.0 SHA并沿用keyring账号，不输出令牌或申请新权限。

程序0.20.1/结果0.20.1-pages.1。Pages静态功能更新，房间服务器未部署时明确说明；将来PUBLIC_APP_URL保留/weiqi邀请，PUBLIC_ORIGIN校验前端源。未购买托管或改正式内容。

- pnpm install --frozen-lockfile --prefer-offline：锁文件及原依赖版本保持，Node22.23.3/pnpm11.25.0实际运行。
- pnpm check：48文件390单元、851内容/30题6终局/201冻结、生产构建与离线资源、独立引擎及容量；checks/check.log。
- 8个hosting独立预期覆盖本机/子路径/Pages无服务/HTTPS后台/混合内容/凭据/坏路径及file恢复。
- pnpm test:browser：原176项+真实联机9项通过，Chromium；checks/browser-all.log。
- 规则/schema/正式内容/材料/旧handoff/Board/GameTimeline/锁文件共1038个基准文件SHA一致；checks/preservation.json。

原网址实际交互、旧缓存更新、发布提交与Pages状态、归档复验由本次交接、checks和发布旁PUBLISH_RESULT.json记录；未执行不能列通过。没有数据库或正式题revision迁移；更新保存后应用，不清除本机数据。

未测：真实双设备跨公网/TLS房间运维，原生Safari/Firefox/Edge、真人辅助技术、课堂与制造。WebKit禁网宿主限制沿用，Chromium不冒充其他环境通过。配置可接入服务器不等于已部署公网后台。

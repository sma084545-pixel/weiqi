---
taskId: GITHUB_PAGES_SYNC
baseVersion: ONLINE_PLAY 0.20.0-online.1
resultVersion: 0.20.2-pages.1
programVersion: 0.20.2
rulesetId: GO-CLUB-AREA-1
schemaVersion: 1
status: complete
---

# 原GitHub网址同步交接

用户授权更新sma084545-pixel/weiqi和原Pages网址，远端此前实际仍0.16.0。独立解压继承最新0.20.0完整归档，未用旧远端替代主线，未修改sources。

修改：online-game/hosting.ts和8个边界测试；OnlineGame静态服务能力/恢复入口与样式；LearningHub版本页脚；version/package/t16版本断言；server/index的PUBLIC_APP_URL保留邀请路径；finalize-offline的version.json与指南；依赖验证允许同锁0.20补丁；新同步/打包/发布工具、docs/github-pages与共同文档。规则/schema/依赖/正式题revision/材料不变。

实际验证：pnpm check390单元、851内容及完整回归链和构建；Chromium176本机+9联机；1038个规则/内容/材料/旧交接/共享组件/锁文件SHA不变。源码到仓库project/，dist到根；旧0.16分卷只标历史。完整命令日志见docs/github-pages/checks。

已实际推送并从原网址完成0.20.2交互。最终功能提交c033b1c60a08663757fac047bc84ee3ad86001d7，Pages状态built；线上验证含四种尺寸选项、合法提子/自杀拒绝、实时回看、双方悔棋、新分支、刷新恢复、30题/反馈、无后台说明、真实禁网刷新、双方确认后的手算2:1面积，以及360px/键盘/reduced-motion。9组均通过、0运行错误、0不存在的WebSocket连接。旧0.16.0同来源升级保留阶段标记与9路棋局且禁网恢复。完整记录见checks/public-journey.json和upgrade.json；归档复验与最终部署/Release记录见发布目录PUBLISH_RESULT.json/ARCHIVE_CHECK.json。后续仅文档证据提交保持同一套已测生产资源。

未测：真实双设备跨公网/TLS后台、原生Safari/Firefox/辅助技术、课堂与制造。Pages不运行Node，房间后台仍未接入，不声称异地对弈已上线。沿用原GitHub身份，没有账户/权限扩张或购买。

迁移：无数据库/题库迁移；原用户保存后应用更新，不清站点记录。后续后台配置VITE_ONLINE_SERVER_URL、PUBLIC_ORIGIN、PUBLIC_APP_URL，不上传学习进度/草稿/反馈。下游以0.20.2-pages.1完整归档及本交接为基线，保持GO-CLUB-AREA-1、schema1和正式ID/revision。修改文件SHA清单由打包工具生成。

冲突/修复：远端旧版不能覆盖当前主线；已保留source/旧分卷并以project/为最新源码。上线复查修复首页联机可用性措辞及相对favicon404，首次已发布0.20.1所以提升0.20.2触发明确缓存更新，无规则/数据/依赖迁移。旧历史检查恢复原字节，当前新证据单独保存在checks/journey。

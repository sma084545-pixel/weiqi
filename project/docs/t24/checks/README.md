---
schemaVersion: 1
id: T24-CHECKS-INDEX
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 当前与历史检查记录

当前结论用full-check-after-fix.log、browser-after-fix.log、browser-webkit-after-fix.log、origin-outage-after-fix.log/results.json、cross-media-audit-final.log/.json、materials-regression-final.log、render-report.json及archive-recheck/。后缀approved、existing或较早journey日志是修复前/前期成功记录，不能替代修复后结果。

browser-journey-final.log和origin-outage-before-fix.log是T14快速刷新缺陷的修复前失败；原文件名保留。WebKit-offline-failure/browser-webkit及Firefox日志是工具/宿主限制，未列通过。clean-install、full-check等初始沙箱失败与批准环境复跑均保留；没有用失败日志冒充成功。

rendered/含113PDF459页实际渲染及79联系表；每页映射sourceSha256和栅格代表。Office临时配置与字体缓存不打包。archive-recheck中dev-start-initial-path-error.log为测试工具路径失败；当前dev-start成功后143退出是主动结束服务。候选归档SHA只标识当时测试包，最终唯一归档SHA以ZIP同目录ARCHIVE_CHECK.json/SHA256SUMS为准。

所有TEST文本、截图中的自动化草稿和例表均为开发验证，不是成员活动记录。没有浏览器数据库或用户配置文件进入归档。

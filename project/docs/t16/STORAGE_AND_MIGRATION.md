---
schemaVersion: 1
id: DOC-T16-STORAGE-MIGRATION
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 统一存储与迁移说明

## 单一事实源

浏览器权威库是 IndexedDB `go-club-local` 主版本 1，包含 `records` 与 `meta`。所有旧模块仍调用同步 `StoragePort`，但 T16 在 React 启动前把这个端口安装为统一 IndexedDB 镜像。分区为 progress、attempts、games、drafts、settings、exchange、discussions、positions 与 other。

localStorage 只承担两种兼容职责：首次迁移来源，以及 `go-club:storage-journal:v1` 未提交写入恢复日志。日志按键只保留最后一个 set/remove，IndexedDB 事务成功后立即清除；启动时先原子重放再载入内存镜像。它不是第二个长期事实源。

## 旧版迁移

首次打开读取全部旧 `go-club:*` 键，但排除内部恢复日志。记录与 `legacy-localstorage-v1` 完成标记在同一 IndexedDB 事务写入；事务完成后才删除旧键。再次打开看到完成标记后不重复迁移。事务失败或数据库不可用时旧记录仍留在原处。

## 内容身份

每条记录保存存储 schemaVersion、namespace、原键、value、updatedAt，以及从值中提取的 contentId/contentRevision。题目升级 revision 后，T10 仍按其原有 exact id@revision 逻辑判断完成状态；T16 不把旧 revision 的成绩迁成新 revision 已完成。

## 备份与恢复

`LocalBackup` 固定 schemaVersion 1、revision 1、rulesetId GO-CLUB-AREA-1、storageSchemaVersion 1。导出前等待当前写入；恢复前检查根字段、最多 1000 条、每条最多 5 MB、项目键前缀、命名空间和重复键。恢复在一个 `records` 读写事务中先清空再写入；任一错误使事务回滚，内存镜像只在成功后替换。

选择性清除映射：progress 同时清进度和题目尝试；games 清对局与临时局面；drafts 清教师草稿、编辑会话、讨论和交接库；settings 只清显示与本机设置。正式题库属于构建资源，不在这些分区中。

## 版本迁移规则

数据库结构改变时递增 `LOCAL_DATABASE_VERSION` 并在 `onupgradeneeded` 中完成事务迁移。备份或内容主版本未知时失败关闭，保留原文件，不自动降级。正式题、schema 或规则变更仍遵循原项目 revision/rulesetId 规则；T16 不更改其含义。

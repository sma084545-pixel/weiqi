---
schemaVersion: 1
id: DOC-T03-PROGRESS-STORAGE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 基础进度适配接口

`createLearningProgressStore(StoragePort)`复用T00公共`getItem/setItem/removeItem`端口。浏览器适配器只使用localStorage键`go-club:learning-progress:v1`，没有Cookie、账号、后台请求或默认上传。

记录带`schemaVersion=1`、稳定`id=LOCAL-LEARNING-PROGRESS`、`revision`和`rulesetId`。业务字段只有：

- `visitedModuleIds`：本设备打开过的可追踪模块ID，去重保存；
- `stageMarks`：六阶段各自可选`learned`或`practice`；
- `recentModuleId`：最近打开的可追踪且已安装模块，用于“继续上次”。

新实例调用`load()`可恢复刷新前记录。空键返回空记录；损坏JSON、未知主版本或字段不合要求时返回`INVALID_PROGRESS`和可继续浏览的内存空记录，不自动覆盖或删除原字节。访问存储被浏览器阻止或配额失败时返回`STORAGE_UNAVAILABLE`，页面继续运行并显示可关闭说明。

`clear()`只调用`removeItem(LEARNING_PROGRESS_KEY)`。内容键`go-club:v1:${contentId}`、题库、棋局、草稿和项目静态文件不在清除范围。自动测试以相邻内容键证明清除范围。

T16可以在此端口上增加离线、备份和版本迁移。若迁移进度，未知版本必须先保留原数据并给出恢复选择；不得因为内容库升级而把自选标记转换成成绩、解锁条件或成员身份。


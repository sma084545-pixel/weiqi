---
schemaVersion: 1
id: DOC-T03-REQUIREMENT-TRACE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T03要求追踪

| 要求 | 实现位置 | 验收位置 |
|---|---|---|
| 三个清楚入口与诚实可用范围 | `LearningHub.tsx` EntryCard/HomePage | `tests/t03/navigation.test.tsx`；`tests/browser/t03.spec.ts` |
| 六阶段自由浏览、短目标、动作、棋形和入口 | `stages.ts`、RoutePage、StagePage、T02 Board | 单元导航；浏览器六阶段与直接第五阶段 |
| 模块route/id/content/状态/返回接口 | `types.ts`、`registry.ts` | `tests/t03/registry.test.ts` |
| 断链、planned与缺内容恢复 | registry RouteResolution、RecoveryPage | registry负例与浏览器直接地址 |
| 已访问/会了/练习/最近/重置 | `progress.ts`、StagePage、ProgressSummary | `tests/t03/progress.test.ts`；刷新和清除浏览器流 |
| 不删除题库 | progress clear只删专用键 | 单元及浏览器相邻内容键保持测试 |
| 教师今日活动、投影、可选45分钟 | TeacherPage、全局projector状态 | 浏览器教师流与截图 |
| 首次设备说明、无账号/默认上传 | DeviceNotice、使用文档 | 首页文案与静态实现检查 |
| 手机/平板/桌面、键盘和无断链 | 响应式CSS、语义链接、T02 Board | 360/768/1280浏览器检查 |

T03没有实现T04–T15内部功能。`DEV-LIB-001`只用于当前可运行入口基础和组件验证；页面逐处说明正式模块尚未安装。


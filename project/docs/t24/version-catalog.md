---
schemaVersion: 1
id: T24-VERSION-CATALOG
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 版本与跨介质总清单

本次主线唯一最新版本 **0.17.1-t24.1**，程序 **0.17.1**。以下交接为输入历史版本，不能用其旧全量归档覆盖本工具包。T19最小修复的当前说明优先于旧T19 handoff的标签描述。

| 任务 | 输入版本 | 实际交接 |
|---|---|---|
| T00 | 0.1.0 | [handoff/T00.md](../../handoff/T00.md) |
| T01 | 0.2.0 | [handoff/T01.md](../../handoff/T01.md) |
| T02 | 0.3.0 | [handoff/T02.md](../../handoff/T02.md) |
| T03 | 0.4.0 | [handoff/T03.md](../../handoff/T03.md) |
| T04 | 0.5.0 | [handoff/T04.md](../../handoff/T04.md) |
| T05 | 0.6.0 | [handoff/T05.md](../../handoff/T05.md) |
| T06 | 0.7.0 | [handoff/T06.md](../../handoff/T06.md) |
| T07 | 0.8.0 | [handoff/T07.md](../../handoff/T07.md) |
| T08 | 0.9.0 | [handoff/T08.md](../../handoff/T08.md) |
| T09 | 0.2.0-t09.1 | [handoff/T09.md](../../handoff/T09.md) |
| T10 | 0.10.0 | [handoff/T10.md](../../handoff/T10.md) |
| T11 | 0.11.0 | [handoff/T11.md](../../handoff/T11.md) |
| T12 | 0.12.0 | [handoff/T12.md](../../handoff/T12.md) |
| T13 | 0.13.0 | [handoff/T13.md](../../handoff/T13.md) |
| T14 | 0.14.0 | [handoff/T14.md](../../handoff/T14.md) |
| T15 | 0.15.0 | [handoff/T15.md](../../handoff/T15.md) |
| T16 | 0.16.0 | [handoff/T16.md](../../handoff/T16.md) |
| T17 | 0.17.0 | [handoff/T17.md](../../handoff/T17.md) |
| T18 | 0.2.0+t18.1 | [handoff/T18.md](../../handoff/T18.md) |
| T19 | 0.2.0-t19.1 | [handoff/T19.md](../../handoff/T19.md) |
| T20 | 0.2.0-t20.1（材料分支版本；程序package.json仍0.2.0） | [handoff/T20.md](../../handoff/T20.md) |
| T21 | 0.15.1-t21.1（材料增量） | [handoff/T21.md](../../handoff/T21.md) |
| T22 | 0.15.1-t22.1 | [handoff/T22.md](../../handoff/T22.md) |
| T23 | 0.17.0-plus-t23.1 | [handoff/T23.md](../../handoff/T23.md) |

逐题映射见 release-inventory.json：30正式题、6终局的源JSON、id/revision、棋形SVG、答案册、T21正背/教师页码、实际T22引用和独立验证字段。未引用到某一PPT的题保留空引用清单，不能假造全部题均已主讲。6个终局由T09源码/图示/答案及T13程序使用；END-006仍unsettled、expectedScore=null。T22只有25张唯一主讲页，分册与合册是重复包装；T09的36页参考课件单独列明。

91份原交付PDF共339页；再从可编辑源转换的22份PDF只作QA副本，完整计数113份/459页。不重复把QA副本当新教学材料。根RELEASE_MANIFEST.json记录本包每个源码与成品的字节SHA。旧FILE_MANIFEST、旧QA与交接按来源年代保留，最终包校验以根清单为准。

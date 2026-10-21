---
schemaVersion: 1
id: DOC-T11-CONTENT-CHANGES
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# LIFE 正式内容变更记录

本任务没有修改 `content/puzzles/LIFE-001.json`–`LIFE-005.json`、`content/t09/bundle.json`、配套 SVG、题卡、答案或内容清单；五题继续使用 revision 1。

不提升 revision 的理由是现有内容已经覆盖本任务需要的结构：LIFE-001 为两个独立眼，LIFE-002 为假眼和先提后有气，LIFE-003 为先手占关键点做眼，LIFE-004 提供另一种已核查做眼变化，LIFE-005 区分两个相连空点并给出有限已核查的 `verified-dead` 分支。T11 只增加教学编排、同布局不同轮次的独立引擎重放，以及对原题证据边界的可见说明。

T11 专题通过 `id + revision` 引用正式内容，并嵌入 T10 播放器；没有复制或改写正式答案。未来若更改题干、棋形、目标、条件、提示、答案树或证据，必须提升相应 LIFE revision，并同步独立 JSON、bundle、图示、阅读版答案、清单与验证报告。


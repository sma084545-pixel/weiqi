---
schemaVersion: 1
id: T22-SOURCE-LOG
revision: 1
rulesetId: GO-CLUB-AREA-1
freezeId: GO-CLUB-FREEZE-B-20260919-01
---

# 来源与证据边界

本地权威输入来自用户提供的 `01-go-club-FREEZE-B-content-20260919-01.zip` 和 `02-go-club-FREEZE-B-0.15.1-full.zip`。两份CONTENT_FREEZE.json逐字节一致；完整项目中的冻结路径558条哈希记录全部一致（见qa/freeze-lock-check.json）。已读取FREEZE_B、T00、T11、T15、T20交接及RULES、TERMINOLOGY、CURRICULUM等规范。主线0.15.1为本次基线；历史文档中的0.15.0不作为新冻结版本。T09题目与T20演示局面均r1，图形由其精确坐标生成，来源哈希和本地路径见assets/source-index.json。局部空盘采用新T22 ID，未冒用旧题号。

网页实际正文访问：2026-10-05，未仅凭摘要。使用范围如下。

|来源|实际用途|与项目规则的区别|
|---|---|---|
|[BGA Teaching Beginners](https://britgo.org/organisers/handbook/club4)|短讲、成员尽早尝试、小棋盘教学方法背景|未采用排名梯级机制；建议不等于本项目已取得效果|
|[BGA How to Play](https://www.britgo.org/intro/intro2.html)|交叉点、正交连接、气、提子、眼及双活的一般概念|网页不同的计分、停手交子、白方最后下和常规贴目均未混入|
|[BGA Interpretation of AGA Rules](https://www.britgo.org/rules/bgainterpretation.html)|明确AGA与项目的差异|本项目按位置超级劫、无效动作不变、双停确认、争议继续下；不引入AGA流程|

规则本身以GO-CLUB-AREA-1约定为准。T09/T20题目、中文表达、图示原件为上游原创；T22短讲稿、课堂组合、原生幻灯片实现为本次原创。没有复制BGA图示。棋形重放使用冻结原版引擎，不构建另一套规则引擎。47项检查只支持列明的局面、分支、气数与计分边界，不是通用死活证明。上游humanReviewed为null；本次模型视觉检查及自动化核查也不称为人类教师审核。

字体：Google Noto Sans SC，400静态实例，源https://github.com/google/fonts/tree/main/ofl/notosanssc；Noto项目OFL授权副本附于assets/fonts/OFL.txt。字体实例化只保留常规字重，制作时由查看器合成粗体；不更改字形。原版引擎及项目规范副本的许可遵循原项目，不将规则事实、借鉴概念与本次原创表达混为一类。

---
schemaVersion: 1
id: T09-SOURCES
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 来源与证据边界

访问日期：2026-09-07。页面正文均已实际读取。intro2.html 起初超时，随后通过无扩展名的官方地址重定向成功。

| 来源 | 实际使用范围 | 未采用的差异 |
| --- | --- | --- |
| [BGA Teaching Beginners](https://britgo.org/organisers/handbook/club4) | 简短说明后开始小盘活动、同伴对弈、讨论死子后再计分的教学思路 | 不采用公开排名梯、强制速度、指定学生胜率；资料建议不是本社团成效 |
| [BGA How to Play](https://www.britgo.org/intro/intro2.html) | 正交连接、整块气与提子、先提后获得气、两眼及双活的一般概念 | 不混入其围地加提子计分、停手交子、白最后一手、简化劫说明或贴目参数 |
| [BGA Interpretation of AGA Rules](https://www.britgo.org/rules/bgainterpretation.html) | 核对规则集差异，以及争议可通过继续下棋处理 | 该文重复判定、停手及争议结束约定不同；本项目只用 GO-CLUB-AREA-1 |

36 份局面、题干、提示、解释、SVG 和有限验证程序均为本次依据用户规则原创。没有搬运协会题目或图示，没有使用 AI 胜率。LIFE 的充分条件和有限目标由模型逐项推导，计算部分由原 T01 引擎验证；这不是协会认证、教师审题或通用死活证明。humanReviewed 全部保留 null。

规则源：输入 T01 0.2.0 的 docs/RULES.md、docs/TERMINOLOGY.md、schemas/content.schema.json、dist-engine/go-club-rules.mjs。schemaVersion=1、坐标与规则 ID 原样沿用。

材料制作工具：Python ReportLab / Pillow / PyMuPDF 用于 PDF 和渲染检查，JavaScript @oai/artifact-tool 用于可编辑 PPTX。实际版本与命令见交接；共享工程依赖及锁文件未改。生成图是坐标图，不是学校活动照片。

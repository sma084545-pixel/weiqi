---
schemaVersion: 1
id: DOC-T00-ACCEPTANCE
revision: 2
rulesetId: GO-CLUB-AREA-1
---

# T00验收 · 0.1.0 · 2026-09-06

> 这是T00当时的历史记录。T02于2026-09-10补做Board浏览器检查，T03同日补做当前学习入口、导航和设备进度检查；分别见`docs/t02/ACCEPTANCE.md`与`docs/t03/ACCEPTANCE.md`。下表保留当时未测事实，不追溯改写。

**总体：部分完成，待浏览器实屏复测。** 必需文件和最小工程已制作；安装、构建、75项自动测试与结构正负例通过。浏览器管理员策略校验服务不可用，两次请求均未获准打开本机页面，未绕过控制。没有发现已实现基础中的未解决测试失败；没有据此声称通用规则引擎正确或真人教师审核。

| 验收项 | 状态 | 实际证据与范围 |
|---|---|---|
| A1 全新目录按锁文件安装 | 通过 | `sh scripts/clean-verify.sh`创建无node_modules/dist的新目录，`pnpm install --frozen-lockfile`退出0；output/validation/clean-install.log。复用了pnpm下载缓存，但未复用工程安装目录 |
| A2 TypeScript与生产构建 | 通过 | 原目录及全新目录`pnpm check`退出0；Vite8.2.2生成dist；check.log与clean-install.log |
| A3 README启动命令 | 通过 | 原目录`pnpm dev`和全新目录`pnpm dev --port 5174`均显示ready；dev-start.log记录工具原始观察，验证服务随后主动停止 |
| A4 首页实际可读、360/768/1280布局 | 未测 | 浏览器工具策略校验不可用；browser-block.json。没有实际截图，不能以设计参考图或DOM检查替代 |
| B1 有效模型 | 通过 | 10份有效开发文档（包括bundle）均结构接受；content-report.json |
| B2 越界、重复占点、未知棋子、未知主版本 | 通过 | 4份负例全部拒绝，错误分别定位/ stones相关字段与/schemaVersion；确切路径见content-report.json，无输入修改 |
| B3 类型、引用与历史结构补充 | 通过 | tests/validation.test.ts；含真实size、空目标、先手、完整历史编码、动作分型、未核查死活标签、bundle revision、坐标型反馈上下文、未知版本与格式错误 |
| C1 六关键词跨文档一致 | 通过（助手文档审查） | REVIEW_NOTES.md逐条比对；document-contract.test.ts只作必备项回归，不代替完整阅读。无真人教师复核 |
| C2 面积手算与提子不重复加分 | 通过（固定教学算例） | RULES R5先给字符盘与9+1:9+1；area-example.test.ts核对DEV-END-001完整坐标、25点分区与7/2提子不加分。不是通用计分测试 |
| D 坐标/历史/变体接口明确 | 通过（契约范围） | INTERFACES、contract.ts、生成类型及编译；明确pass例外、fresh-setup、完整序列/快照、undo/redo、终局与小游戏不同。规则函数实现在T01 |
| 组件完整棋盘、受控选择、方向键 | 通过（DOM模拟） | board.test.tsx：5/9/13/19尺寸分别25/81/169/361点；单Tab入口、边界焦点移动、角点回调、输入盘面不变、文本转义 |
| 实屏Enter/Space、触控、焦点可见、屏内滚动、减少动画、无控制台错误 | 未测 | tests/browser/t00.spec.ts已交付；`pnpm exec playwright test --list`可列出3视口测试，但没有执行浏览器。DOM事件不验证浏览器原生激活行为或布局 |
| 存储错误可恢复、拒绝不写 | 通过（适配层） | persistence.test.ts：往返、拒绝写入、空间/权限失败、损坏原文保留、超限保存拒绝；无PWA或长期成员数据 |
| 真机手机/iPad/投影、辅助技术朗读、学校/教师/学生审核 | 未测 | 无实际设备与参与者；未填任何humanReviewed或学生反馈 |
| PDF/PPT/实体教具 | 不适用本次范围 | T00未生成印刷品/课件；属于T18–T23，矩阵未提前标通过 |

## 失败及恢复记录

1. 默认环境没有node/npm/npx命令：采用已提供的Node24.19.0与pnpm11.19.0绝对PATH；没有要求用户安装付费服务。
2. 沙箱网络初次安装失败：经工具许可正常下载免费开源依赖，生成锁文件；esbuild初始化脚本按pnpm allowBuilds明确列出并成功运行。
3. tsx CLI在沙箱创建IPC失败：改用等价的`node --import tsx`运行校验脚本，后续全套通过。
4. 沙箱内监听本机端口EPERM：按授权启动本机服务；原/新目录均ready。没有公开监听地址。
5. 浏览器两次拒绝，原因均为管理员策略无法核验；未换通道绕过。浏览器测试文件只做列举校验，实屏检查仍未完成。
6. 交付前初读提示词路径不可访问：重读桌面AGENTS，采用其明确指定的`go_cas_gpt_work_execution_v1_1 2/prompts/`。24份当前哈希一致；T18仅前增标题文字，正文相同；材料责任目录已同步修正，见input-manifest.json。

## 唯一剩余验收步骤

在获准使用浏览器的环境按README执行`pnpm exec playwright install chromium`、`pnpm build`、`pnpm test:browser`，然后逐张打开12张截图，检查文字、真实边角、棋盘交叉点、焦点与移动端页面。另确认200%缩放与实际投影阅读；浏览器发现问题则修正后重跑相关检查。此前T00不能标全项完成。

后续T01与材料任务读取本完整包及handoff/T00.md；按原任务门槛，先解决T00剩余浏览器验收再标为已验收基线。当前人类复核为空不应被自动填写。

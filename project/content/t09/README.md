---
schemaVersion: 1
id: T09-README
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T09 使用与合并说明

这是基于 **T01 0.2.0** 的内容支线，内容版本 **0.2.0-t09.1**。含正式题 30 道、独立终局示例 6 个，所有内容 revision=1。原规则、坐标、schemaVersion=1、共享依赖、锁文件和主线页面未修改。

## 直接使用成品

| 用途 | 文件 |
| --- | --- |
| 打印题目卡 | `content/print/T09_挑战卡_A4.pdf`，18 张 A4，每张两卡，沿虚线裁切 |
| 查答案、提示、解释 | `content/print/T09_答案册.pdf`，36 页，每题／示例一页 |
| 可编辑文字答案 | `content/print/T09_答案册.md`，同一 revision，配套 SVG 使用相对路径 |
| 投影教学 | `content/print/T09_教学演示_r1.pptx`，36 页，棋子、棋盘与文字均可编辑；答案及三层提示在演讲者备注中 |
| 程序导入 | `content/t09/bundle.json`；单题在 `content/puzzles/`，END 在 `content/endgames/` |
| 插入其他材料 | `content/artwork/` 的 36 张矢量 SVG，包含题号、方向及元数据 |

打印选择 A4、100%／实际大小。建议先试印一页看本机边距和黑白区分，确认后再整批打印。这里完成了数码渲染检查，没有声称真实打印或课堂试用已完成。题卡用于阅读和标记，不是按正式棋子尺寸设计的实物对弈棋盘。

默认建议可调整：中学生、约 45 分钟、两人共用棋盘。学校年龄、人数和设备尚未获确认。可任选 2–4 题轮流讨论，也可跳过题目直接对弈。给提示逐层进行，不强制计时，不设排行榜或输赢价值评判。PPT 放映显示题目，带领者可从备注读取答案；需要给学生独立查看时使用题卡 PDF。

## 题目与发布范围

LIB、CAP、CON、LIFE、AREA、DISC 各 5 题。END-001–006 单独计数，AREA 引用 END 不重复增加题数。正式题号不依赖目录排序。

25 道封闭题可按已核查答案结构判断；5 道 DISC 仅按“依据、对方回应、听取同伴”量规交流。`release-pool.json` 显式列出自动题、讨论题、示例和隔离池。隔离池当前为空，缺额为 0。全部 humanReviewed=null，人类专业复核没有被伪造为已完成。

对棋题的着法树，只有已覆盖节点可按其 outcome 判断。合法但树未收录的着法必须返回 unknown；即使离线穷举报告列出其他手不符合某个有限目标，也不得把库中缺少的动作一概判错。CAP 与多数 CON 只要求本手达到目标。LIFE-005 的证明边界是完整 5×5、最多三手、提掉原目标块，包含所有合法防守和停手；没有提供通用死活求解器。CON-002 与 LIFE-004 明确保留两种成功首手。

END-001–005 都是明确教学假设，confirmedBy=[]，不冒称真实双方终局确认。END-006 status=unsettled、expectedScore=null，不可展示最终分数。END-005 提子账本只是反事实标签，不是伪造棋谱。

## 内容兼容与调用

现有封闭 schema 没有 title、commonErrors、peerDiscussion 等额外 Puzzle 字段。本任务把这些内容放入既有 conditions.assumptions、answer.explanation 和相同 ID 的 `t09/pedagogy.json` 教学补充文档。没有向 Puzzle 偷加未知字段。补充文档是技术／教学清单，不作为 schema 中的 ContentDocument 导入；`bundle.json` 只含 30 个 Puzzle 与 6 个 TerminalFixture，可直接通过原 T00 校验器。

`grade.mjs` 是纯内容判题参考适配器，所有落子仍调用 T01。它接收原 schema 的 Response，不执行 HTML 或脚本，不访问网络，不持久化用户内容。

```js
import { gradePuzzle } from './content/tools/grade.mjs';
const result = gradePuzzle(puzzle, { type: 'number', value: 4 });
// move-tree: gradePuzzle(puzzle, {type:'move', move}, playedMoves)
// verdict: success / failure / continue / unknown / invalid / discussion
```

实际页面仍由后续主线集成。本包不把数据导入、卡片或测试脚本伪装成已完成的浏览器挑战页。

## 验证与重新生成

在具有 T01 0.2.0 依赖的工程根目录执行：

```sh
node --import tsx content/tools/validate.mjs
node content/tools/test-grade.mjs
python3 content/tools/validate_exports.py
```

重新编辑时先改 `build_content.py` 中原始坐标与独立预期，再运行以下顺序。新版本发布必须更新受影响内容 revision、引用、图示及答案，不能在已分发 r1 上静默改答案。

```sh
python3 content/tools/build_content.py
node --import tsx content/tools/validate.mjs --stamp
node content/tools/test-grade.mjs
python3 content/tools/render_materials.py
node content/tools/build_deck.mjs
```

build_content 会把检查记录重置为 null；只有完整适用校验通过后，--stamp 才写入发布检查状态。改完必须重新生成并逐页检查 PDF/PPT。PPT 构建的终稿／验证收据不自动覆盖已有文件；新发布时修改输出文件名、收据文件名与相应清单。重新生成不等于复核完成。

本次使用 Node 24.19.0、原 T01 项目依赖，ReportLab 4.4.9、pdfplumber 0.11.9、pypdf 6.10.0、Pillow 12.3.0、@oai/artifact-tool 2.8.59。PDF 使用本机 `/Library/Fonts/Arial Unicode.ttf`；其他机器可在脚本中明确换用有中文字符的授权字体并重新渲染。PPT 生成需要 Codex 自带 artifact-tool 及 presentation finalizer，由 RUNTIME_NODE_MODULES、RUNTIME_PYTHON、PRESENTATION_SKILL_DIR 可配置。成品本身可直接使用，不需要重新生成。

## 合并到后续主线

1. 保留当前最新主线，先读取 `handoff/T09.md` 与 `FILE_MANIFEST.json`。本支线只新增 content 下列出的文件和 handoff/T09.md。
2. 将内容增量包解压到独立目录，先以 `python3 content/tools/apply_patch.py --target /绝对路径/当前主线 --dry-run` 检查。
3. 明确目标路径后去掉 --dry-run 应用。脚本会先检查引擎／schema 指纹及全部源文件哈希，存在不同的同名内容会拒绝，防止覆盖主线已修改题库。
4. 在目标主线重跑内容验证与适配器测试，并由主线执行合并点 A 的浏览器集成验收。

如果目标已更改 schema 或引擎产物指纹，先由主线核对兼容性并用新基线重验，不绕过检查。本包附的 T01 复现工程仅供重现这一内容支线，**不是最新程序主线，不能整包覆盖 T08 等后续版本**。

详细验收见 `content/validation-report.md`。来源、输入哈希和修改文件清单均在本目录；原 T00/T01 的实屏未测项原样保留。

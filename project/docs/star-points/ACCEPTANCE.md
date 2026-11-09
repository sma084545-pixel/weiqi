---
schemaVersion: 1
id: BOARD-STARS-ACCEPTANCE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 星位更新验收

本轮为0.27.2，实际检查记录保存于本目录checks；旧交接中的历史结果不作为本轮新证据。

| 项目 | 状态与证据 |
|---|---|
| 构建及原完整检查 | 通过；`pnpm check`，626项总单元测试、正式内容与独立引擎/容量/离线检查，见checks/full-check.log |
| 原浏览器回归 | 通过；`pnpm test:browser`，176＋22＝198项，见checks/browser-regression.log |
| 星位专项UI | 通过；checks/browser-local.json，360/768/1280×5/9/13/19路、精确坐标/几何、实际触屏模拟与键盘落子、历史只读、教学页面、双会话小窗同步及真实Document PiP |
| 复盘及辅助模型 | 通过；85项既有受影响测试，见docs/game-review/checks/affected-unit.log |
| 辅助下棋完整流程 | 通过；docs/game-review/checks/guided-regression.json，逐层提示、对手、悔棋/报告/重试与实际禁网刷新 |
| 原复盘A/B流程 | 通过；本轮真实KataGo回复、原第40手续下、联机结束后落子前重试、原谱/对端/结果保持；见docs/game-review/checks/browser-local.json |
| 导出与裁切 | 通过；checks/exports.json；四尺寸SVG/PDF及原坐标裁切；PNG沿用同一SVG栅格化路径 |
| PDF与SVG视觉检查 | 四份A4 PDF实际渲染并逐图查看；裁切SVG用浏览器渲染后查看，见checks/pdf-render.json和crop-browser.json |
| 保护范围 | 源码/规则/数据/材料/schema/部署和锁文件逐字节对比；最终以checks/preservation.json为准 |
| 原GitHub网站 | 尚待发布和公开浏览器验收，不以本地通过替代 |
| 完整归档 | 尚待最终打包与重新解压校验，不以旧归档替代 |

初次完整检查因执行环境禁止监听本机端口而失败，610项通过、16项失败；原日志保留为initial-restricted-check.log。允许本机监听后完整626项通过，未改变测试断言或引擎。星位专项脚本最初用exact匹配包含下拉选项文字的label，随后改成匹配实际label；失败保存为initial-browser-selector.json/log，应用代码未因此变更。

MuPDF不能正确渲染这份SVG的内嵌CSS，初次裁切SVG图保留为明确标注的initial-unsupported-renderer.png；以真实浏览器的DEV-STARS-CROP-browser.png作为SVG视觉证据。PDF四页用MuPDF正常渲染。本轮不声称实体打印、真人教师审核、实机触屏或原生Safari/Firefox测试。

既有浏览器回归产生的新截图单独放在checks/legacy-regression，原T24及online-tools历史截图已从封存基线恢复原字节，对应映射见legacy-regression.json。

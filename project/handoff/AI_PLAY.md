---
taskId: AI_PLAY
baseVersion: ADVANCED_COURSES 0.23.0-pages.1
resultVersion: 0.24.2-pages.1
rulesetId: GO-CLUB-AREA-1
schemaVersion: 1
status: complete-digital-scope-with-documented-limits
---

# 真实 AI 对弈增量交接

2026-10-31，现有原网站 https://sma084545-pixel.github.io/weiqi/#/play/ai 与本机默认4190软件都已调用现有Render真实KataGo，3+3段实际浏览器流程通过。账户持有人完成手动部署；未新建或升级付费资源，也未绕过被拒绝的Render后台权限。本交接所称完成指本次数字功能范围，不代表真人棋力、课堂效果或任意死活自动裁判。

唯一新主线源码：`work/ai-play-20261030/mainline/go-club`。基线取自已完成0.23.0归档，SHA-256为 `6f99a1be987df3c45d629cf919075e23ef4a0c6c0ee1ab1e861c9be7d268d0ee`，未从旧T01/材料支线覆盖。sources只读未动。最新完整包在`work/release/0.24.2-pages.1/`；完成归档旁复查后才提升`work/release/LATEST.json`，旧归档保留为历史。

## 实现与修改文件

- 新增`src/features/ai-game/{AiGame.tsx,AiGame.css,model.ts,storage.ts,client.ts,useAiOpponent.ts}`、`src/core/analysis/ai-contract.ts`、`server/analysis/ai.ts`、`schemas/ai-session.schema.json`、`tests/ai-game/`及明确测试fixture。
- 最小调整`server/analysis/{position,http,engine,index}.ts`：独立ai-move用途、重放校验、限定搜索、共用排队取消、就绪能力与程序版本。原分析仍要求对局结束；不靠伪造认输绕过门槛。API版本2不改变内容schema1。
- LearningHub/registry/导航添加`ai-play`、`#/play/ai`和联网声明；FullGame复用确认对话框与入口；BoardDisplayTools增加可选AI语境，原联机默认不变；新手机布局按原样式修复溢出。
- T15 SGF的AP版本改用公共APP_VERSION，避免旧0.15硬编码；续玩新schema严格拒绝未知字段/无效贴目。
- 新增真实HTTP、CLI浏览器、禁网缓存升级脚本、归档脚本和`docs/ai-play/`。精确逐文件清单/基线及结果摘要见`docs/ai-play/CHANGED_FILES.json`和发布旁`CHANGE_MANIFEST.json`。
- 未改T01落子规则、T02棋盘核心、GO-CLUB-AREA-1、坐标、正式30题/6终局/37进阶场景、纸卡课件、内容revision、依赖和锁文件；1593个保护文件字节核对一致。

## 使用范围

轻松/标准/挑战为8/24/64最大访问预算，双执色、5/9/13/19、自由让子白先、轮流合法落子、暂停/显式重试、悔棋一手/最近回合、redo分支截断、只读滑动复盘、悬浮整盘/独立画中画/最大化及JSON/SGF。难度不是人类段级位。轻松从实际搜索过且接近首候选的非pass中抽样，不生成随机合法点冒充引擎。

连续两停转人工清单；修改死子取消双方确认，争议保留原盘与超级劫历史。AI不代替使用者核定任意死亡。最终面积分不重复加提子，认输不假造分。只有结束后能主动查看真实候选、变化、黑方胜率和预计目差；估计不修改原终局结果。

## 保存与兼容

公共存储新增`go-club:full-game:ai:v1`，namespace `games`，AiGameSession schema1持有options、完整可重放GameState和待核对注释。真人/引导棋局和课程进度键不变，不强制迁移。刷新后AI暂停，由使用者继续，避免重复计算。合法导入必须重放，不相信外部提子/赢家/重复历史。备份覆盖独立AI键；清学习进度不清棋局/草稿；续玩JSON保留难度和redo路径，SGF主线不完整携带终局注释与AI设置。

## 实际检查与证据

- Node22.23.3、pnpm11.19.0，`corepack pnpm install --frozen-lockfile --prod=false`；`corepack pnpm check`通过532项单测及类型/schema/正式内容851断言/冻结/容量/构建；`corepack pnpm build:analysis`、`corepack pnpm build:pages`。
- `corepack pnpm test:ai`46项；既有`pnpm test:browser`176条、online22条及原复盘UI8条通过。CLI运行`scripts/ai-browser-journey.cjs`7组，传输替身明确标记；`scripts/ai-real-browser.cjs`原生3段、正式网站3段、本机4190至Render3段实际引擎。报告和截图在`docs/ai-play/checks/`，不是学生记录。
- `scripts/ai-upgrade-browser.cjs`真正禁用网络，0.23→0.24.2 Service Worker升级、旧自标记/真人棋局/草稿、新AI恢复与备份隔离通过。AI断网只保存/浏览，不假称离线计算。
- Docker真实Linux CI Actions41109154159 / `6eb3f38`：0.1CPU/512MB、15项AI+7项review，固定KataGo1.18.1 Eigen与g170-b6c96模型；最终0.24.2相对该后台只变程序文字及让子提示，API逻辑不变。早期5ed6920/c6a80ac单列历史证据。
- 正式后端 main `43a57e3e4d484595195d51d181149eeea020988c`，GitHub部署7452023481成功；`/readyz`0.24.2/API2、1实例、512MiB上限/实际CPU配额采样0.15。`public-ready-final.json`采样active0/queued0、内存峰值约72.8MiB。3个精确CORS来源通过，其他github.io拒绝。没有定期请求保活。
- `public-real-browser.json`与`public-local-real-browser.json`各3段流程、真实POST、控制台及页面错误0；`public-publication.json`核对13个正式线上构建文件散列。真实9路→undo/redo→刷新→认输→赛后分析，5路白方键盘与唯一合法pass→人工25–0→复盘均执行；pass例为测试起点，不伪造空盘整局。
- 完整归档封包后的重新解压、CRC/全文件SHA/数量/干净安装构建及远端Release资产摘要，证据在版本目录`ARCHIVE_CHECK.json`、`PUBLICATION_PROOF.json`与日志；这些旁附检查不宣称已在封包内部倒写。

## 失败修复、未测和限制

初次旧T24用例未等异步反馈保存：175/176，补充完成状态等待后176全过，业务断言未放宽。新AI手机表单固有宽度溢出已修复；新增精确本机Origin的类型配置遗漏已修复。原失败日志留存。没有未解决的阻断/重要问题。

未测真实Safari/iPhone/iPad、长期多人负载、完整平台休眠/拉镜像冷启动、人类棋力校准；未读取Render受限后台日志或账单。有限搜索和旧小模型不保证强手/精确目差；免费服务休眠与12AI/IP/分钟、18全服务/分钟、1计算+2排队限制仍在。不承诺无限并发/每步秒回；无收费升级、无自动保活。

任意外部SGF直接转AI续玩尚未实现，使用T15浏览和AI续玩JSON；已安装37场景与引导13路的本地教学机器人保持原范围。实际打印、制造、真人教学、CAS认定均未在本轮验证。

## 发布与后续迁移

仓库`sma084545-pixel/weiqi`，Pages为main/root，当前源码在project/。KataGo仍是已有`weiqi-katago`，房间`weiqi-rooms`未部署/修改。Render Blueprint为`project/deploy/katago.render.yaml`，autoDeploy关闭；本轮最终证据文档提交不需再次手动部署。正式网站URL不变，下载见GitHub Release `v0.24.2-pages.1`。

升级前保存/导出，再点网站“保存已提交内容并应用”，不清站点数据。回滚先备份；Render与前端各部署已记录版本，旧review-only后台应显示需更新而非伪造AI。下一个任务以此0.24.2完整包和本交接为基线，先核对LATEST及归档旁证明，不用预部署包或旧归档覆盖。部署/环境变量/模型替换与限制见`docs/ai-play/DEPLOYMENT.md`、`KNOWN_ISSUES.md`。

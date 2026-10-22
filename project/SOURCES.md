---
schemaVersion: 1
id: DOC-SOURCES
revision: 21
rulesetId: GO-CLUB-AREA-1
---

# 来源与使用边界

网页初次查阅日期：2026-09-05；T04/T05于2026-09-10/11重新打开下列3个BGA正文页。T06–T08于2026-09-12复核本机共享契约。合并 A 与 T10 于2026-09-14完成。T11 于2026-09-15重新核对 BGA 的提子、自杀、两眼、关键点和双活概念。T12–T15 的来源边界见下表。T16 于 2026-09-21 核对 MDN 的 IndexedDB、Service Worker 与安全上下文说明，以及 web.dev 的 Service Worker 生命周期和更新流程；没有因此改变 GO-CLUB-AREA-1。

| 来源 | 实际使用 | 未采用或限制 |
|---|---|---|
| [MDN form](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/form)、[Using IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB)，2026-10-05 访问 | T17 原生表单、显式提交、只在事务完成后更新镜像、失败整体回滚 | 不作成员身份认证或观点质量评判；浏览器注入写入失败不代表所有实机配额行为 |
| [BGA club teaching](https://britgo.org/organisers/handbook/club4)，2026-10-05 复读 | 核对既有新手参与与教学建议的证据边界 | T17 的反馈、CAS 模板、代码和固定开发测试为本项目原创；不声称教学建议已在本社团取得效果 |
| [MDN IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)、[Using IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB)，2026-09-21 访问 | T16 数据库版本、对象仓库、事务迁移、失败保留和异步写入设计 | 浏览器配额和隐私模式行为由浏览器决定；自动化模拟不等于所有设备实测 |
| [MDN Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)、[Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)，2026-09-21 访问 | T16 注册、安装/激活、缓存、离线回退和 localhost/HTTPS 部署边界 | 不声称 `file://` 或任意 HTTP 主机具有同等能力，不引入远程推送或后台同步 |
| [web.dev Service worker lifecycle](https://web.dev/articles/service-worker-lifecycle)、[Update a PWA](https://web.dev/learn/pwa/update)，2026-09-21 访问 | T16 等待更新、显式应用、旧缓存清理和避免编辑中强制刷新 | 本次未在第二个真实发布版本间完成现场更新替换；只验证代码门控和数据刷新恢复 |
| 用户T00提示词；桌面 `go_cas_gpt_work_execution_v1_1 2/prompts/` 权威1.1.0任务包，docs/input-manifest.json含初读/当前路径与哈希 | GO-CLUB-AREA-1所有规范、目标、范围；T01接口要求；T09正式编号；T00–T24责任矩阵 | 提示词不是已实施成果；模型推荐与本次产品实现无关 |
| T09 0.2.0-t09.1 内容增量包、`content/t09/SOURCES.md`、`content/validation-report.md`及实际日志 | 合并 A 的30题、6终局、图示、阅读材料、生成/验证工具与证据边界 | T09旧T01复现工程不作为主线；归档内自动/模型核查不等于人类教师复核或课堂成效 |
| 本地 modern-web-guidance（forms、accessibility、scrollability）与 frontend-app-builder，2026-09-14 | T10 原生表单语义、48px 操作目标、live 反馈、可见焦点、响应式与 reduced-motion 实施方向 | 不是围棋来源；自动检查不替代真人辅助技术或实体设备测试 |
| OpenAI 内置 ImageGen，2026-09-14；`docs/t10/design-concept.png` | 依据 T03/T07 既有视觉语言生成 T10 桌面/手机布局参考 | 参考图不是棋形、题目答案、学生照片、实施效果或可用性证明；最终内容按真实 JSON 和代码校正 |
| Playwright 1.62.1 / Chromium 151.0.7922.34 | T10 六种作答、六类别、多解、未知、反驳、异步取消、revision、360 触屏/键盘、768/1280 和 reduced-motion | 不代表 Safari、Firefox、实体设备、VoiceOver、TalkBack 或 JAWS 通过 |
| British Go Association, “How to Play Go”, 2026-09-15 访问 | T11 核对先提对方后检查自杀、两个眼的基础解释、关键点和双活概念 | 不把该协会赛规混入 GO-CLUB-AREA-1；概念参考不等于本题人类复核 |
| British Go Association, “Teaching Beginners”, 2026-09-15 访问 | T11 短段落、让成员先尝试、角部三点眼形与关键点的教学顺序参考 | 课程建议不是本社团实际效果 |
| 本地 modern-web-guidance 与 frontend-app-builder，2026-09-15 | T11 原生控件、可见焦点、48px 手机目标、单列响应式、live 状态和 reduced-motion | 不是围棋来源或实机可访问证明 |
| OpenAI 内置 ImageGen，2026-09-15；`docs/t11/design/life-lab-concept.png` | T11 布局与视觉层级参考 | 不是题目证据、学生照片或可用性证明 |
| Playwright 1.62.1 / Chromium 151.0.7922.34 | T11 真/假眼、先手、填外气、T10 原题复用、360 触屏/键盘、768/1280 与 reduced-motion | 不代表 Safari、Firefox、实体设备、VoiceOver、TalkBack 或 JAWS 通过 |
| 本地 modern-web-guidance（forms、html、accessibility），2026-09-15 | T12 原生表单、明确标签、48px 操作目标、可见焦点、单列小屏、打印样式和 reduced-motion | 不是围棋来源；自动检查不替代真人辅助技术、实体设备或合作质量评价 |
| Playwright 1.62.1 / Chromium 151.0.7922.34 | T12 五道 DISC、A/B/自选、角色交换、匿名本机记录、逐条删除、导出、360 触屏/键盘、768/1280 与 reduced-motion | 不代表 Safari、Firefox、实体设备、VoiceOver、TalkBack 或 JAWS 通过 |
| 本地 modern-web-guidance（forms、accessibility），2026-09-15 | T13 原生分组控件、显式标签、语义表格、48px 手机目标、live 状态、答案延迟挂载、单列小屏和 reduced-motion | 不是围棋来源；自动检查不替代真人辅助技术、实体设备或教学正确性审核 |
| Playwright 1.62.1 / Chromium 151.0.7922.34 | T13 六个 END、区域标记/撤回、边界反馈、答案隐藏、六步面积、贴目试算、提子对比、下载、360 触屏/键盘、768/1280 与 reduced-motion | 不代表 Safari、Firefox、实体设备、VoiceOver、TalkBack、JAWS 或真实打印通过 |
| [BGA Teaching Beginners](https://britgo.org/organisers/handbook/club4) | 少讲解后动手、小棋盘起步、教师避免信息过载等教学方向；六阶段分流由本项目原创 | 教学建议不作为本社团已取得成效；未采用旧软件推荐 |
| [BGA How to Play](https://www.britgo.org/intro/intro2.html) | 交叉点、正交连接、整块气、先提子后判断自杀、眼和双活等一般概念核对 | 不复制该页图示；不采用其提子计分、停手交子、白方最后一手、简单劫说明作为完整项目赛规 |
| [BGA Interpretation of AGA Rules](https://www.britgo.org/rules/bgainterpretation.html) | 确認不同规则在重复、停手、贴目与争议处理上有差异，用于防止混写 | 不把AGA解释中的玩家条件重复或四停处理混入本项目；本项目不自称AGA |
| [Vite Getting Started](https://vite.dev/guide/) | Node要求、静态开发与构建流程，React模板路线 | 使用安装时稳定发布版本，精确版本见package.json和锁文件 |
| [React Creating a React App](https://react.dev/learn/creating-a-react-app) | React应用结构与Vite起步方向 | 最小静态工程不引入服务端框架 |
| [TypeScript Documentation](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html) | 静态类型与联合类型 | 类型不能替代导入运行时校验 |
| 本地modern-web-guidance搜索工具，2026-09-10 | 检索React学习入口、可访问导航和本机偏好保存模式 | 返回匹配度较低，没有把高级抽屉、滚动动画或实验API引入实现；工具提示本地skill版本旧于其远端版本 |
| OpenAI内置ImageGen，2026-09-10；`docs/t03/design-concept.png` | 生成T03完整桌面与手机界面设计参考；最终UI以代码和真实可用状态校正 | 设计图不是教学来源、实施照片、学生反馈或可用性证据 |
| Playwright 1.62.1 / Chromium 151.0.7922.34 | T03真实浏览器导航、刷新、本机存储、响应式与投影验收 | 不代表Safari、Firefox、实体设备或专用辅助技术通过 |
| 本地 modern-web-guidance 搜索工具，2026-09-10/11；accessibility、forms 指南 | T04 使用原生表单语义、可见焦点、至少 48px 触摸目标、提交时校验、ARIA 动态状态和 reduced-motion | 工具提示本地 skill 版本较旧；没有据此引入实验 API，自动检查不替代真人辅助技术 |
| OpenAI 内置 ImageGen，2026-09-10；`docs/t04/design-concept.png` | 依据既有 T03 视觉语言生成 T04 桌面/手机布局参考 | 参考图不是教学棋形、学生照片、实施证据或可用性证明；最终封题和路由状态按代码修正 |
| Playwright 1.62.1 / Chromium 151.0.7922.34 | T04 真实浏览器封题、点集、数字反馈、8 演示、键盘、触屏模拟、360/768/1280、灰度、投影和 reduced-motion | 不代表 Safari、Firefox、实体设备、VoiceOver、TalkBack 或 JAWS 通过 |
| 本地 modern-web-guidance 搜索工具，2026-09-11；可访问 stepper、reduced-motion 与取消模式 | T05 使用原生按钮、可见焦点、锁盘文字、单定时器 cleanup 和减少动画 | 工具提示本地 skill 版本较旧；没有据此引入实验 API，自动检查不替代真人辅助技术 |
| OpenAI 内置 ImageGen，2026-09-11；`docs/t05/design-concept.png` | 依据 T04 视觉语言生成 T05 完整桌面/手机布局参考 | 参考图不是教学棋形、活动照片、学生反馈或可用性证明；内容和规则以代码/固定向量为准 |
| Playwright 1.62.1 / Chromium 151.0.7922.34 | T05 真实浏览器预测、暂停回看、撤回、取消、键盘、触屏模拟、360/768/1280、灰度、投影与 reduced-motion | 不代表 Safari、Firefox、实体设备、VoiceOver、TalkBack 或 JAWS 通过 |
| 本地 modern-web-guidance 搜索工具，2026-09-12；复杂布局交互指南 | T06 原生控件、模式文字、可见焦点，并把 `content-visibility:auto` 与 `contain-intrinsic-size` 作为渐进增强 | 搜索匹配度较低；没有把实验 API 变成正确性依赖，旧浏览器仍显示全部内容 |
| OpenAI 内置 ImageGen，2026-09-12；`docs/t06/design-concept.png` | 根据 T05 实际截图生成 T06 完整桌面布局参考；实现再按真实 schema、默认贴目和历史规则校正 | 参考图不是棋谱、题目、学生照片、实施反馈或可用性证明 |
| Playwright 1.62.1 / Chromium 151.0.7922.34 | T06 真实浏览器检查非法摆棋、fresh 历史、撤回、尺寸、保存/导出、键盘、触屏模拟、360/768/1280、灰度、投影和 reduced-motion | 不代表 Safari、Firefox、实体设备、VoiceOver、TalkBack 或 JAWS 通过 |
| 本地 modern-web-guidance 搜索工具，2026-09-12；accessibility 指南 | T07 使用原生 fieldset、按钮和 dialog，保留可见焦点、44px 操作目标、文字状态、礼貌动态提示和 reduced-motion | 搜索结果匹配度较低且工具提示本地 skill 版本较旧；没有据此改变围棋规则或采用实验 API |
| OpenAI 内置 ImageGen，2026-09-12；`docs/t07/design-concept.png` | 根据 T06 实际页面生成 T07 桌面流程参考；实现再按真实引擎事件、坐标、胜负和可用路由校正 | 参考图不是棋谱、学生照片、实施反馈、可用性证明或正式教学内容 |
| Playwright 1.62.1 / Chromium 151.0.7922.34 | T07 真实浏览器检查共同开局、黑/白/多子胜负、两停、悔棋、换色、最后五手、触屏模拟、键盘、快速连点、360/768/1280、灰度、投影和 reduced-motion | 不代表 Safari、Firefox、实体设备、VoiceOver、TalkBack 或 JAWS 通过 |
| 本地modern-web-guidance 2026-09-12；html、accessibility、css-layout | T08采用原生标题/fieldset/按钮/dialog、可见焦点、live状态、内在grid/flex、局部overflow和reduced-motion | 工具提示本地版本`2026_05_16-c5e78707`旧于最新`2026_09_04-7de96777`；没有据此改变围棋规则或使用实验API |
| Playwright 1.62.1 / Chromium 151.0.7922.34 | T08真实浏览器检查让子白先、双停确认、死子整块、确认失效、争议恢复、终局撤回、认输、只读复盘、本机重放、360/768/1280、19路滚动、灰度、投影和reduced-motion | 不代表Safari、Firefox、实体设备、VoiceOver、TalkBack或JAWS通过 |
| [Ajv Getting Started](https://ajv.js.org/guide/getting-started.html) | JSON Schema编译与错误对象 | Ajv外增加相对棋盘大小、重复占点等跨字段检查 |
| [Vite Library Mode](https://vite.dev/guide/build.html#library-mode) | T01独立ESM成品采用build.lib，保留源码映射和类型声明 | 没有外部运行依赖、公共发布或新的依赖版本 |
| modern-web-guidance技能及本机指南（accessibility、css-layout、scrollability、fluid-scaling、size-aware-styling） | T02原生按钮网格、roving焦点、ARIA文字、容器查询、局部滚动、触摸目标、减少动画 | 非官方围棋来源；指南符合性和自动化不能代替真人辅助技术测试 |
| frontend-app-builder与ImageGen | 根据现有T00视觉语言生成T02布局参考；成品按真实坐标与可访问要求修正 | 参考图不作为棋形、规则、学校实施或测试证据；参考图的I列与占点文案未沿用 |
| [Playwright Test](https://playwright.dev/docs/intro) | T02用锁定的1.62.1执行Chromium视口、键盘、触屏、滚动、灰度与reduced-motion测试 | 只证明本次Chromium自动化；不代替Safari/Firefox/实体设备/VoiceOver等 |

规则本身来自用户的项目约定，非本项目声称发明的通用围棋知识。T01固定测试向量、中文推导、状态实现和测试为本项目本次原创开发成果；数学规则由用户指定，不把BGA题形复制为自编题。
原创：六阶段课程编排、中文解释、DEV-* 固定样例、DEMO-LIB-* 与 DEMO-CAP-* 棋形/题目/教师说明、工程代码及从坐标生成的原生棋盘。未复用 BGA 插图或题目，不宣称取得协会授权或推荐。
ImageGen生成的T00首页及T02组件设计参考图只用于界面方向；它不作为精确棋形、学生照片、实际活动或成果证据。首页棋盘由代码按真实尺寸绘制。开源依赖各自许可由原包保留；本项目没有对第三方资料再许可。
所有validation.humanReviewed为空；本次没有真人教师审核，也没有学生实践成效数据。

| T13 0.13.0 主线归档与 handoff/T13.md，2026-09-15 | T14 唯一基线、正式 30 题与共享接口字节对照 | T14 没有修改正式题、终局、规则或 schema |
| 本地 modern-web-guidance（required field feedback、validate after interaction），2026-09-15 | T14 原生必填控件、字段级说明、延后错误、可见状态、响应式与 reduced-motion | 不是围棋来源；浏览器自动化不替代真人辅助技术或教学审核 |
| [SGF FF[4] 规范主页](https://www.red-bean.com/sgf/)、[语法](https://www.red-bean.com/sgf/sgf4.html)、[围棋扩展](https://www.red-bean.com/sgf/go.html)、[属性](https://www.red-bean.com/sgf/properties.html)，2026-09-16 访问 | T15 游戏树、属性值转义、左上原点坐标、空值/tt 停手、AB/AW/AE/PL/KM/RU/C 子集 | 不承诺所有 SGF 扩展；SGF 不作为教学元数据权威格式；外部 RU 不替换项目规则 |
| Playwright 1.62.1 / Chromium 151.0.7922.34；Poppler `pdfinfo`/`pdftoppm` | T15 JSON/SGF 真实页面流程、SVG/PNG/PDF/ZIP 下载、360/768/1280；A4 PDF 尺寸与逐页渲染检查 | 不代表 Safari、Firefox、实体设备、专用辅助技术或实体打印通过 |
| T14 0.14.0 主线归档与 `handoff/T14.md` | T15 唯一基线、正式内容与共享契约字节对照 | T15 没有修改正式题、终局、规则、schema、Board 或依赖锁文件 |


## T24 核查来源 · 2026-10-09

- [MDN IndexedDB transaction](https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/transaction)：区分发起写入与事务完成，沿用统一写入恢复日志；没有使用非标准 readwriteflush。
- [MDN pagehide](https://developer.mozilla.org/en-US/docs/Web/API/Window/pagehide_event)：离开事件不能作为可靠保存的唯一途径，本次选择立即保存编辑状态。
- [Playwright Service Workers](https://playwright.dev/docs/service-workers)：自动化支持范围；WebKit控制实验与Chromium禁网分别报告。
- [Playwright issue 42775](https://github.com/microsoft/playwright/issues/42775)：setOffline+WebKit reload内部错误的同症状公开复现；这里只作为工具缺陷推断，非本项目原生Safari失败证明。
- modern-web-guidance 2026_05_16-c5e78707：执行真实搜索，结果低匹配并提示指南版本较旧；没有据此改变围棋规则或引入依赖。

T24未复制BGA插图/题目，也未引入新第三方素材。BGA原先的概念/教学来源边界继续适用。第三方运行依赖许可证另随 docs/t24/third-party/ 保留；Noto Sans SC 的 OFL 在微课 assets/fonts/。系统字体只在已有PDF内嵌，不在本包分发系统字体文件。


## FREE_PLAY · 2026-10-21

以本地已校验T24 0.17.1-t24.1完整归档和交接为唯一基线；沿用用户指定GO-CLUB-AREA-1，不混入其他赛规。实现前实际检索modern-web-guidance并读取accessibility/forms两份指南，采用原生select、按钮、明确标签、可见焦点和polite结果提示。已有Playwright项目测试体系继续用于真实页面检查，无新增依赖或第三方图示。新代码和用例是本次项目开发；测试文本不代表成员反馈或课堂实施。


## 棋局滑动条追加核查 · 2026-10-21

MDN [input type=range](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/range) 与 React [input](https://react.dev/reference/react-dom/components/input)：用于原生滑动条、受控实时更新、标签、范围与步长。modern-web-guidance 的 slider/accessibility 指导保存于 docs/history/checks/web-guidance.txt。没有新增依赖或更改围棋赛规；具体历史展示与测试为本项目新增代码。浏览器自动化不是实机或真人辅助技术审核。


## ONLINE_PLAY · 2026-10-21

- [ws官方仓库/文档](https://github.com/websockets/ws)：Node服务端noServer升级、Origin入口、广播和ping/pong。采用稳定ws8.22.0，仅服务器使用；浏览器仍用原生WebSocket。MIT许可随docs/online/third-party保留。
- [MDN WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)：浏览器连接与状态事件；同源HTTPS使用wss，不引入外部实时服务。
- 本机modern-web-guidance实际检索WebSocket/reconnect/authoritative state，读取local-network-access指南；仅作为现代浏览器边界参考。界面同源连接，不用公网网页跨地址空间请求localhost规避浏览器限制。
- 新增@types/ws8.18.2是开发类型，MIT许可附存；其余直接依赖版本保持。服务器复用已有引擎，没有复制其他网站的棋形、赛规或题库。
- 双独立浏览器自动化不代表两台实体设备、公网发布、原生Safari/辅助技术或真人课堂验证。


## GITHUB_PAGES_SYNC · 2026-10-21

GitHub官方[Pages说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)和[限制](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)：核对静态托管、项目路径和容量。官方[GitHub CLI登录说明](https://cli.github.com/manual/gh_auth_login)：恢复已登录的原凭据助手；CLI2.98.0从官方cli/cli发布下载并比对官方SHA256，未输出令牌或申请新权限。modern-web-guidance实际检索并读取local-network-access/accessibility，指导避免静态页自动访问用户本地网络及错误恢复说明。原BGA教学来源边界保持；没有新增正式题或更改赛规。


## Render公开联机接入 · 2026-10-21

官方文档实际核查：Render https://render.com/docs/free（免费实例休眠和临时磁盘）、https://render.com/docs/websocket（WSS与断线）、https://render.com/docs/blueprint-spec（配置）；Vite https://vite.dev/guide/env-and-mode（公开构建变量）。这些仅支持部署技术选择，不是课堂效果、人类审核或持久存储保证。现代Web技能检索得到local-network-access指引；本次公网HTTPS/WSS不引入本地网络权限或放宽Origin。


ONLINE_PLAY_TOOLS（2026-10-22实际访问）：[Chrome Document PiP](https://developer.chrome.com/docs/web-platform/document-picture-in-picture)、[MDN requestFullscreen](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen)、[MDN dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)。仅用于API条件/兼容和焦点行为核对；代码与文案为本项目实现，不复制文章图示。modern-web-guidance的drag指引用于独立拖动把手、pointer capture、夹边及键盘替代；没有引入运行时依赖。

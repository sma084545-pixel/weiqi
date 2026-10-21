---
taskId: RENDER_DEPLOY
baseVersion: GITHUB_PAGES_SYNC 0.20.2-pages.1
resultVersion: 0.20.3-pages.1
programVersion: 0.20.3
rulesetId: GO-CLUB-AREA-1
schemaVersion: 1
status: complete-with-documented-hosting-limits
---

# 原GitHub网站公网联机接入交接

用户授权Render服务器配置及原GitHub地址联机。Render后台访问多次被保存的浏览器安全策略拒绝；没有绕过。先把已校验免费Blueprint上传现有仓库，用户自行创建并提供https://weiqi-rooms.onrender.com。随后通过公开HTTPS健康与WSS探测，确认规则/协议和邀请路径，保持原站https://sma084545-pixel.github.io/weiqi/接入。实际功能发布提交54574bb0f2f1aa1e66949ce8ba3af0a74a72c2ad，Pages已built；最终证据与归档发布记录见版本目录PUBLISH_RESULT.json。

修改文件：package.json与core/version/t16版本断言；online-game/hosting、OnlineGame及LearningHub调用方；新增deploy/github-pages.json、deploy/render.yaml、build-public-site；finalize-offline和sync-github-pages、package-render；hosting边界测试、公开浏览器检查工具；README/CHANGELOG/SOURCES、docs/render与ONLINE_SETUP、当前交接。精确清单在docs/render/changed-files.json。根render.yaml和RENDER_SETUP/配置元数据也同步。规则、schema、服务器业务代码、1047个受保护内容/材料/旧交接/共享组件及锁文件保持SHA，不改正式题revision或材料冻结。

构建公开站用corepack pnpm build:pages，读取公开JSON配置。只有原GitHub来源使用Render；本地软件仍连自己同源Node服务。前端0.20.3与当前探测后台0.20.2的协议1兼容，本次不因前端接入强制重启后台。不能把后台源代码未改说成已核查Render构建提交；实际后台设置未能读取。维护时按docs/render/DEPLOYMENT.md先保存棋局，再由维护者手动更新。

实际命令/检查：干净corepack pnpm install --frozen-lockfile；pnpm check（48文件393单元、851内容、13 T14/16 T15及原完整验证链、构建/离线、独立引擎与容量）；pnpm build:pages；pnpm test:browser（176+9）；公开CLI双隔离会话从原网站检查建房、加入、双颜色、提子、自杀拒绝、快速连点、独立历史、双方悔棋、刷新、认输、双停注释/双方确认、手算1:1导出；独立规则restoreGame重放真实下载；360/768/1280的19/13/9路、键盘/触屏/reduced-motion与真实禁网/重连。原网站0.20.2缓存更新保留棋局和标记，实际禁网刷新保留本机棋局。日志与截图在docs/render/checks，详细验收见ACCEPTANCE.md。

失败与复验：公开测试首轮缺少确认广播等待，次轮CLI不支持动态Node导入；只修测试脚本，等待同步并用download.saveAs/独立runner核查。最终流程及响应式/断网均通过，0页面运行错误，保留失败原日志。当前无已知未解决规则/数据或关键流程阻断。

未测/限制：原生Safari/Firefox/真人辅助技术、两台实体设备/独立校园网络、长时间运行、免费服务休眠与重部署行为、Render账户地域/计费/构建提交、实体制造和课堂效果。免费房间文件临时，休眠、重启、更新可能清空；首连可能约一分钟，界面明确重连和保存本机副本/导出。不能断网同步房间，没有账号永久云存档；没有自动死活裁判。按双方确认计分、认输不编造分数。

迁移要求：没有数据库、题库或规则迁移；原网址用户先保存后应用0.20.3，不清浏览器数据。本机进度、草稿、反馈不上传，匿名房间仅同步所需棋局/昵称/连接状态。后续继承本版完整归档与公共配置，不能用旧T01或历史全量替代；T21/T22冻结内容未变。发布旁有完整/轻量ZIP、逐文件清单、CRC/SHA、干净复验、远端文件校验；不含node_modules、私有房间文件或凭据。

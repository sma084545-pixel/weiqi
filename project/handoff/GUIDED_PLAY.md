---
taskId: GUIDED_PLAY
baseVersion: EXTREME_AI 0.25.2-pages.1
resultVersion: 0.26.2-pages.1
rulesetId: GO-CLUB-AREA-1
schemaVersion: 1
status: local-complete-public-verification-pending
---

# 辅助下棋交接

本轮在唯一最新0.25.2基线副本实施；没有改sources/或旧交付。新增独立`guided-play / #/play/guided`，学习路线课程6之后与首页可进入。原12课、正式30题、6终局、37进阶场景、教具材料及四档AI保留。

## 修改范围

- 新增`src/features/guided-play/`：设置、分级提示、事实反馈、标记、可替换分析接口、状态控制、本地/现有KataGo对手、独立存储与报告。
- 接入现有`learning-hub/registry.ts`和`LearningHub.tsx`，补充离线页对KataGo依赖的说明；没有改导航体系或课程编号。
- 新增附加`schemas/guided-session.schema.json`、开发固定预期、53项测试、浏览器验证与本轮文档。
- 版本0.26.2。`package.json`只新增测试脚本并把既有引擎构建放在check开头，保证干净源码可校验；旧依赖审计版本白名单加0.26，锁与依赖字节不变。
- `scripts/sync-github-pages.py`沿用发布配置保护，补充新模式入口与说明；三个现有服务地址不变，不新建或升级Render资源。
- 真实本地离线演练修复`server/http.ts`原有静态MIME缺项（`.md`与`.webmanifest`），不改房间协议、权限或对弈处理；新增实际HTTP测试。规则、Board与其余1,743受保护文件字节不变。
- 0.26.0/0.26.1为本轮先前公开构建，不作最终完整包；最终0.26.2另有缓存版本与完整复验。

## 实际检查

见`docs/guided-play/ACCEPTANCE.md`与`checks/`。已通过51新增测试、592总单元测试、198原浏览器回归、实际分级提示与完整对局报告路径、360/768/1280、触屏模拟与键盘、实际断网恢复、1,743受保护文件比较。

原生本机每尺寸60次分析，9路中位3.13ms/P95 3.87ms，13路中位4.90ms/P95 7.14ms；这是本机样本，不是通用性能保证。

公开网站、归档重新解压、最终提交及下载校验在发布阶段继续记录；未完成之前不以此交接标题宣称全链路完成。

## 迁移与边界

无公共内容schema或现有存档迁移；独立`GuidedPlaySession`与`GuidedProgress`均为schemaVersion1，使用原IndexedDB/存储适配器。清进度不删棋局或归档。重试保留原局并保留原始合法历史。刷新暂停对手，旧请求不能落到新棋局。

默认本地机器人可离线，有限局部策略不代表棋力等级；可选现有KataGo是真实对手，即时教学仍本机计算。没有实时胜率/目差、通用眼识别、自动死活或LLM教师。教师、真人课堂、实机手机、原生Safari/Firefox与屏幕阅读器未测，不能称为已审核。

升级须先保存或导出备份，通过现有更新按钮应用，不清站点数据。发布顺序是检查→最后build:pages→核对三个服务配置→同步；禁止用通用build覆盖公开配置后直接发布。回滚到0.25.2时新辅助记录暂不可见，原对弈记录可继续读；先完整备份，勿删除新记录。

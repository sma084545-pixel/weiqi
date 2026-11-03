---
taskId: EXTREME_AI
baseVersion: AI_PLAY 0.24.2-pages.1
resultVersion: 0.25.0-predeploy
rulesetId: GO-CLUB-AREA-1
schemaVersion: 1
status: implementation-in-progress-real-model-tested
---

# 极致模式增量交接

源码位于work/extreme-ai-20261103/mainline/go-club，从SHA已核对的0.24.2完整归档解压。sources未动，LATEST仍为0.24.2。当前开发分支不作为已上线声明。

已实现第四档极致、独立服务选择、固定模型身份校验、错误时原局保留、同模型赛后复盘与旧三档存档兼容。模型固定为官方当日最强有把握评级的kata1-tf3-b11c768-s11003M-d5973M-7gres。四尺寸原生真实测试通过，峰值内存约1.6GiB；不是Render实测。52项AI单测与类型检查通过，容器/浏览器和完整回归证据仍在补齐，不提前列通过。

修改文件：src/core/analysis/{ai-contract,contract}.ts；src/features/ai-game/{config.ts,AiGame.tsx,client.ts,useAiOpponent.ts}；src/features/katago-review/useKataGoReview.ts；server/analysis/{ai,http,index}.ts；schemas/ai-session.schema.json；新增Dockerfile.extreme、强模型manifest/获取脚本/配置、独立Render Blueprint、集中前端配置与构建标记、测试/真实HTTP及容量工具。最终逐文件清单在完成验证后生成。

未改落子内核、Board、正式题库/终局/材料及其revision、依赖和锁文件。原存储键、schema1保留，difficulty enum只增extreme；旧三档可直接读，新记录回滚到旧程序时安全拒绝而不静默降级。回滚前导出新AI记录。

不得在预算授权前应用付费Blueprint。独立1CPU/2GB是候选最低档，公开价25美元/月，待实际容器验证后确认。原weiqi-katago、weiqi-rooms与正式网页未改变。实际Render地址、正式原网站联调与最终归档待授权及部署后完成；不冒称已上线。

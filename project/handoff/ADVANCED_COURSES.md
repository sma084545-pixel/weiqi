# ADVANCED_COURSES 交接

- taskId: ADVANCED_COURSES
- baseVersion: KATAGO_REVIEW 0.22.0-pages.1
- resultVersion: 0.23.0-pages.1
- rulesetId: GO-CLUB-AREA-1
- schemaVersion: 1
- status: live-verified; final archive proof accompanies release as ARCHIVE_CHECK.json

本轮只续接学习路线7–12。现有课程1–6的ID、编号与完整数据对象相同；没有从旧工程覆盖主线。work/advanced-course-20261024/mainline/go-club为本轮工作副本，0.22.0已封存基线不改，sources/只读。

新增37个互动训练场景（6/8/7/6/6/4），另有一盘可完整结束的13路引导棋。本地规则教学机器人不调用局中KataGo，不冒称棋力等级。采用明确新起点及共同T01内核；标准棋盘5/9/13/19不扩为7路。战略反馈限定目标和条件，未知合法手不直接判错，humanReviewed保持null。

## 修改文件与兼容

src/features/advanced-courses/、content/advanced-courses/bundle.json、schemas/advanced-course.schema.json、scripts/build-advanced-*与validate-advanced、测试、浏览器旅程、docs/advanced-courses/为主要新增。learning-hub阶段/注册/导航/进度续接12课；原StoragePort/IndexedDB继续使用。Board及contract只增可选文字标记，不改落子/气/提子/重复/计分算法。T10静态判题仅将参数类型收窄为其实际使用的answer，原Puzzle调用兼容。package/version、README、CHANGELOG、术语/课程/接口/需求矩阵、来源与发布工具同步。

新学习标记与作答只放advancedLessons的lesson-id@revision记录，旧stageMarks只由UI继续写原6课。场景revision及课程revision不沿用旧完成；旧0.22.0读取原字段仍可用。引导棋用独立单键会话包装共同GameState、临时死子注释、确认和观察点；不覆盖LOCAL-T08-FULL-GAME，导出仍为共同GameState。T16备份恢复/选择清除无需新数据库版本。

## 实际测试与未测

486单测（新增57）、851正式题库断言、37场景实际UI、176原浏览器、22联机、360/768/1280、键盘/触屏/减少动画以及禁用网络刷新已通过。具体命令/日志/修正见docs/advanced-courses/ACCEPTANCE.md与checks/。1100个受保护文件哈希一致，旧6课完整数据对象相同。实际Chrome155.0.8059.86，触屏为模拟，不是物理手机或人类教学验证。

正式网站37场景、13路完整确认、实际断网及0.22→0.23缓存升级已通过，checks/public-browser-journey.json及upgrade-result.json为真实证据。最终ZIP的CRC/SHA/干净解压命令记录单独随归档附ARCHIVE_CHECK.json；缺失时不得把本交接当作归档已验证。KataGo和rooms部署配置/后台源码不变，无新增费用或服务。无复杂通用死活/战略AI、进阶材料编辑器、新纸卡PPT或中级课程；这些是后续扩展，不是坏链接入口。

## 迁移与下一轮输入

无需修改GO-CLUB-AREA-1、正式content schema1、冻结30题/6终局/revision。原本机数据不清空；旧缓存先保存再通过原应用更新入口应用新版本。新增课程编辑或修订须提高相应revision、重建bundle、重跑结构/合法变化/独立预期/交互，并保留本机revision边界。下一轮使用本轮最终完整归档、handoff、docs/advanced-courses与共同schema/规则；不从0.22.0重开替代项目。

## 实际发布

原网站https://sma084545-pixel.github.io/weiqi/，学习路线#/route，课程7入口#/route/STAGE-07。首次发布提交f67a9baaa3c0222b70ff2e635dbc7ec0300b670f，main分支，原Pages流程。后续只补充验收、归档与交接记录；最终提交以Release标签/外附PACKAGE_INFO为准。rooms/KataGo未重部署、未购买任何资源。本轮真实测试与旧0.22证据分开，不把模拟UI回归冒充真实引擎调用。

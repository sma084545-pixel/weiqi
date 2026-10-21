---
schemaVersion: 1
id: T20-ACCEPTANCE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T20验收与内容核对表

版本0.2.0-t20.1；2026-09-07。审核者：本助手，非人类教师审核。数字材料范围完成，实体试印/使用未开展。

|检查|状态|证据|
|---|---|---|
|主卡A5双面、详细补充、小游戏A6双面、计分、路线齐全|通过|8独立页；pdf/与source/同名SVG；card-manifest.json|
|正交/斜邻、共享气、提子前后、先提后有气|通过|01与02正面9幅完整坐标图；engine-checks.json中对应固定测试|
|一气是打吃，不是已被提走|通过|01正面文本，白C3仅D3一气|
|先提后查自杀，不误禁黑A5|通过|黑A5提白B5/A4，原引擎返回合法，落点所在块2气|
|劫与长重复、初始布局、只比较棋子、停手例外|通过|02双面及教师说明；立即回提SUPERKO；两停恢复后仍SUPERKO|
|终局确认、争议恢复、原盘/历史保留|通过|01背、02背；引擎恢复测试核对历史、轮次、停手归零|
|面积计分、贴目0、提子不再加分|通过|03正；手算9+1对9+1+0；5中立；共25点；原引擎固定算例复核|
|计分证据边界|通过|图上及教师说明明确教学假设，未把一眼形证明为活棋或自然终局；basis=teaching-assumption|
|小游戏首提即止、两停无胜者、结束重开|通过|04双面；原引擎两种结束状态检查|
|六阶段与STAGE-01–06对应，自选勾选|通过|03背；每阶段两空勾选框；可跳过/重访/直接下棋|
|完整9路先于深学死活，无等级考核|通过|阶段03在阶段05之前；无强制计时/榜单/证书|
|术语与眼的边界|通过|卡片liberty/capture/atari/eye/territory/area scoring；02背保留两空点非两眼、双活例外|
|独立数据身份与坐标兼容|通过|9份Position均schemaVersion1/rulesetId固定，RULE-DEMO命名；validateSetup原引擎验证；稀疏B/W、row/col|
|正式题库和上游资料不改动|通过|input-manifest.json：134份附件基线文件逐字节一致；只增加材料目录和T20交接|
|A5/A6/A4真实几何及字体嵌入|通过|print-checks.json：59项页面/身份/字体/几何检查；A5 148×210，A6 105×148|
|正文可读、不拥挤或裁切|通过（数字）|正文10–12pt；text-geometry.json；8独立页逐页看图；补充页底部拥挤与坐标遮挡已修复|
|双面配对/翻纸方向|通过（数字）|A4横6页各两同面、短边翻；A4竖2页各四同面、长边翻；print-checks配对ID数量；逐页拼版看图|
|灰度可辨，标记不混棋子|通过（数字）|card-gray-1/2.png；实心黑子、空心大白子、小环气、三角目标、×中立形状不同|
|来源与二维码|通过|PRINT-AND-TEACHER.md记录两个实际读取BGA页面和一个读取失败页面；不使用假二维码|
|印刷尺寸误差、双面实体套准、裁切和耐用性|未测|未连接/操作打印机；按打印说明先印1–2页，尺量148×210并核对脚注和翻面|
|人类教师/学生理解与真实活动反馈|未测|未招募或实施；应由实际使用者记录，不生成虚构评价|
|原T00网页、触摸、真实投影验收|未测（继承）|handoff/T00.md及T01.md原有缺口；本任务不改变网页或宣称弥补|

## 实际执行命令

在本次副本中，以go-club为当前目录（工具日志原调用使用同等完整相对路径）：

```sh
/Users/maxiao/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node materials/rule-cards/source/verify-demos.mjs
python3 materials/rule-cards/source/build_cards.py
python3 materials/rule-cards/source/verify-print.py
pdftoppm -r 95 -png materials/rule-cards/pdf/all-independent-cards.pdf materials/rule-cards/validation/card
pdftoppm -r 60 -png materials/rule-cards/pdf/PRINT-A4-landscape-short-edge.pdf materials/rule-cards/validation/a4
pdftoppm -r 60 -png materials/rule-cards/pdf/PRINT-A4-portrait-long-edge-mini.pdf materials/rule-cards/validation/mini
python3 materials/rule-cards/source/make-contact.py
```

计分图短码最终移至棋盘外侧后，重新构建、运行59项打印验证，并对独立PDF第5页和A4第5页分别用110/60 dpi重渲染；其余页布局未再改动。早期渲染为110 dpi，最终其余独立页95 dpi；PDF矢量与实际纸面字号不受预览dpi影响。最后逐页查看8独立页及8拼版页的联系表，另外查看修正后的计分独立页；灰度联系表覆盖8独立页。

字体检查最初尝试pdffonts时环境无此可执行程序，改用pypdf检查各页字体描述符中嵌入FontFile2；成功。一次依赖探测发现捆绑Python缺fitz；生成/读取采用当前python3的reportlab+pypdf，渲染用pdftoppm，不需要fitz。初稿补充卡内容接触页脚、边缘石遮住坐标、计分短码碰到棋子，均在交付前修复。以上不是未解决失败。

本次构建是材料生成程序；项目src、schemas、依赖及原引擎均未改，不重复执行或冒称执行pnpm check。9组固定引擎检查不是通用正确性证明。最终未解决失败：无；保留未测项如表。

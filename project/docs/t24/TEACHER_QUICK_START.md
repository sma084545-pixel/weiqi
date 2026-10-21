---
schemaVersion: 1
id: T24-TEACHER-QUICK-START
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 教师快速开始

1. 解压完整 ZIP，先打开 materials/facilitator-kit/output/T23_facilitator_manual.pdf 第 2–4 页；选择第 5–10 页中的一次 45 分钟活动。人数未知时按手册公式配棋盘，两人一盘；活动时间可按现场调整。
2. 程序启动见根 README。用本机 HTTP 服务打开，先进入“教师视图 → 离线与本机数据”，等“已可离线”，再关闭网络并刷新演练。首次安装仍需取得依赖；已附生产构建无需重新构建。避免在共享设备输入姓名或联系方式。
3. 零基础成员从“我第一次接触围棋”进入气实验室；有经验成员可直接对弈或挑战题。路线是建议，不是参与门槛。只有教师设备时投影并让同伴轮流解释，实体棋盘替代个人设备。
4. 一次练习可依次使用气预测、提子步骤、自由摆棋、吃子小游戏。小游戏首提即胜，与完整围棋不同。完整 9 路默认 0 贴目，是教学选择；两停后由双方确认死子与中立点，有争议恢复原盘对弈。
5. 挑战题的未知合法手不自动判错。死活结论只在题目给定条件下成立；两个受保护独立真眼是基础活形，没有两眼不自动等于死亡。讨论参考不是唯一观点。
6. 收尾可跳过反馈，也可由不同成员连续填写空表。教师只汇总实际记录；0 条数据没有评价。导出前查看并删减自由文本，记录本人、同伴、AI 和参考资料的贡献。保存和备份只在本机进行。

无屏替代：手册第 13 页替代表；气环代高亮、纸卡背代提示、实体分步提子代动画；T23_03_prepare_close.pdf 是准备/收尾一页清单，T23_04_voluntary_feedback.pdf 是空反馈表。规则卡用 materials/rule-cards/pdf/，棋盘用 materials/pair-boards/output/boards/；100% 实际尺寸打印，先校准，再批量。磁吸、耐用性与双面套准仍待实物试验。

实际程序入口（先启动应用，再拼接 hash）：

| 用途 | 入口 |
|---|---|
| 学习与自选路线 | #/home、#/route |
| 数气/提子 | #/learn/liberties、#/learn/captures |
| 摆棋/双人吃子/完整棋 | #/board/experiment、#/play/partner、#/play/full-game |
| 挑战/死活/合作/围地 | #/challenges、#/learn/life、#/challenges/together、#/learn/territory |
| 出题/文件交换/离线 | #/teacher/editor、#/teacher/file-exchange、#/teacher/offline-data |
| 可跳过反馈/教师记录 | #/feedback、#/teacher/evidence |

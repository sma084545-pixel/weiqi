# T23 主持工具包

schemaVersion=1；id=T23-FACILITATOR-README；revision=1；rulesetId=GO-CLUB-AREA-1。

版本 0.17.0-plus-t23.1，基于 MERGE_C 0.17.0-merge-c.1，程序仍0.17.0。

output/ 含20页手册、6份独立一页流程、8份一页支持材料（DOCX/Markdown/PDF），及完整5路棋盘SVG/PDF。A4原尺寸100%打印；正文11pt Noto Sans SC；字体来自已集成微课 assets/fonts/，许可随原材料保留。PDF嵌入字体；在Word打开源文件前安装该字体或替换后重新检查。

先读手册第2–4页，再选第5–10页任一次活动。三种水平路径均可选，无屏替代表第13页。纸卡/微课文件与页码见第16–19页及 source/resource-map.json。未声称物品已制作或活动已开展。

再生成：Python需python-docx、lxml、reportlab、pypdf、pdf2image；依次运行 source/author_content.py、source/build_kit.py、source/build_board.py。source/render_all.py 是本次环境渲染入口，记录真实绝对运行路径；换电脑使用文档渲染器时调整运行路径和字体配置，再逐页检查。source/verify_kit.py 运行时间、资源、身份、几何、空表及基线检查；源包和基线位置见 input-manifest.json。

validation/ 包含实际渲染命令、页面图片、自动校验和限制。delivery/ 是分发归档，打包时排除该目录避免循环包含。没有正式题/程序/依赖迁移；不要用旧材料支线程序覆盖主线。

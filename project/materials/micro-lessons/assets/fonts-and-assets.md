---
schemaVersion: 1
id: T22-ASSET-NOTES
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 字体与素材

Noto Sans SC Regular来自Google Fonts公开可变字体的wght=400静态实例，使用SIL Open Font License 1.1，完整授权见fonts/OFL.txt。可安装、嵌入和分发；PPTX未嵌入字体，PDF嵌入子集。备用字体可选Noto Sans CJK SC/思源黑体，替换后需重新检查换行。制作环境采用本目录字体和局部Fontconfig，不改共享字体或依赖。

棋盘、棋子、三角、气环、落子数字均为原生PPT形状，尺寸、颜色和位置可修改；无AI图像、照片或不可编辑棋形截图。网格由row/col坐标生成，实际5×5和9×9全部边界可见。冻结原件位于frozen/；其稳定ID/revision和SHA256见source-index.json。变化后的图形另用局部派生key引用源ID与分支，不修改源题目。

# T14 可访问性与响应式检查

浏览器自动检查使用 Chromium 151.0.7922.34：

- 360×800：触屏上下文、`prefers-reduced-motion:reduce`，键盘聚焦棋盘交点并按 Enter 放子；页面无横向溢出。
- 768×950、1280×950：教师编辑器、字段、棋盘、工具和检查区可读，无横向溢出。
- 所有关键工具有文字标签；棋盘继承 T02 的可读坐标、方向键、Enter/Space、可见焦点和边角命中区。
- 必填项使用原生控件与文字说明；错误列表给代码、中文原因和字段路径。状态区使用 `role=status` 与 `aria-live=polite`。
- 标记不只依赖颜色；目标有三角形。减少动画和强制颜色规则沿用共享样式。

已人工查看 `output/playwright/t14/360-editor.png`、`768-editor.png`、`1280-editor.png`，未见裁切、重叠或横向溢出。Safari、Firefox、实体手机/平板/投影、VoiceOver、TalkBack、JAWS 和真实课堂操作未测。

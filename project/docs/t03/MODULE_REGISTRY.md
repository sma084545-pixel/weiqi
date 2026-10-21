---
schemaVersion: 1
id: DOC-T03-MODULE-REGISTRY
revision: 5
rulesetId: GO-CLUB-AREA-1
---

# 模块注册接口

运行类型在`src/features/learning-hub/types.ts`，注册实现和当前清单在`registry.ts`。

```ts
interface ModuleRegistration {
  id: string
  route: `#/${string}`
  label: string
  requiredContentIds: readonly string[]
  availability: 'available' | 'planned'
  returnRoute: `#/${string}`
  trackVisit: boolean
}
```

`id`稳定且全局唯一；`route`是静态站点可用的hash地址；`requiredContentIds`列模块启动前必须存在的内容；`returnRoute`必须指向已安装的恢复页面；`trackVisit`只决定是否进入轻量本机进度。注册器拒绝重复id或route。

`createModuleRegistry(definitions, contentIds)`先检查注册冲突，再以实际内容ID集合解析模块。`resolve(route)`只有在模块标为available且必需内容齐全时返回成功；其余结构化原因是`not-found`、`not-installed`或`missing-content`，并总是附可用fallbackRoute。界面不能把planned项目渲染成可用启动链接。

当前可用模块：学习入口、学习路线、六个阶段简介、T02互动棋盘练习、T04气实验室、T05提子实验室、T06自由实验棋盘、T07同屏双人吃子小游戏、T08完整小棋盘对弈和教师视图。完整对弈稳定地址为`#/play/full-game`、模块ID为`full-game`，当前不依赖正式T09内容。气/提子实验室依赖各自DEMO内容；自由实验棋盘与两种对弈不依赖正式内容ID。开发演示不冒充正式题库。互动题目保留planned注册信息，直接输入其地址会看到恢复页面。

T09–T15接入步骤：

1. 在注册表新增或更新稳定模块定义，不改写首页组件。
2. 把真实内容ID加入运行时内容目录，并让requiredContentIds只列实际必需项。
3. 只有模块代码和必需内容同时可用时才设为available。
4. 保持returnRoute指向已安装页面，并为直接地址、缺内容和返回动作增加测试。
5. 不复用未安装模块的route，也不改变既有稳定id来表示新修订。

当前使用hash路由以支持纯静态托管，不增加路由依赖。若后续更换路由器，必须保持注册字段、稳定地址或提供明示迁移，并继续让旧收藏地址得到可恢复说明。

# 围棋 CAS｜Play Go · Learn Go · Create for Go

这是围棋社 CAS 项目的公开静态发布包。打开本仓库的 GitHub Pages 即可使用，无需账号、后端或外部 API。

当前发布代码版本为 `0.16.0`，基于已冻结的正式内容版本 `0.15.1`：规则为 `GO-CLUB-AREA-1`，内容模型为 `schemaVersion=1`，包含 30 道正式题、6 个终局示例与 T20 规则卡材料。T16 的离线运行与本机保存改动已通过其针对性测试和生产构建；完整的人类围棋教师审核、真实课堂、实体打印与跨浏览器复核仍未完成。

本仓库根目录是可直接由 GitHub Pages 提供的静态站点。`source/` 目录另附同一版本的完整开发源代码归档（不含依赖安装目录和自动生成的测试输出），可用于本地继续开发。为符合 GitHub 网页上传的单文件限制，源码归档已拆成多个 ZIP 分卷；下载 `source/` 中的全部同名分卷后合并即可。

## 本地运行源码

将 `source/go-club-cas-0.16.0-source-github.z01`、`.z02` 和 `.zip` 放在同一文件夹后，先运行下列命令合并为普通 ZIP，再解压 `go-club-cas-0.16.0-source-restored.zip`：

```sh
zip -s 0 go-club-cas-0.16.0-source-github.zip --out go-club-cas-0.16.0-source-restored.zip
```

随后在解压出的项目目录运行：

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm preview
```

项目为教学用途，不宣称已由本项目证明能够提高智力、治疗压力或提高学业成绩。正式内容冻结清单和验证边界在源码的 `handoff/CONTENT_FREEZE.json`、`handoff/FREEZE_B.md` 与 `docs/freeze-b/ACCEPTANCE.md`。

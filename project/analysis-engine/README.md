# 固定的 KataGo CPU 引擎

本目录只提供真实引擎、模型获取、配置、许可证和引擎层检查。HTTP、站点发布和 Render 实测由项目部署层负责。本机检查不是云端性能承诺。

## 固定来源与模型

- 引擎：官方 KataGo **v1.18.1**，commit `92ee95c0a4b25fec214da00951ab69e97e207729`，**Eigen CPU** 后端；不用 CUDA/TensorRT/GPU，也不用 `-march=native` 或 AVX2 构建。
- 官方 v1.18.2 是 CUDA 专项优化，其他后端由官方发布说明指向 v1.18.1。
- 小模型：官方归档 `g170-b6c96-s175395328-d26788732`，6 residual blocks / 96 channels，1,027,911 参数；下载约 3.65 MiB，模型版本 8。
- 这是较旧的有限算力模型，效果不能等同于最新大型网络；64 visits 也不能包装成精确的某级/段棋力。它输出的是搜索估计，不是可靠终局裁判。
- 官方归档 README 明确支持多棋盘尺寸、变贴目和领先估计；另一些新 tiny 模型只训练了19路，因此没有用于本站5/9/13/19的统一默认模型。
- 引擎、模型、Eigen 的完整 URL、SHA-256、许可证与限制见 `engine-manifest.json`。模型权重不进 Git；在构建阶段下载并校验，运行时不下载、不重复启动。

## 容器集成

应用 Docker 构建阶段安装 CMake、C++ 编译器、zlib 开发包、curl，执行：

```sh
sh analysis-engine/build-engine.sh /opt/katago
sh analysis-engine/fetch-model.sh /opt/katago/model.bin.gz
```

最终运行镜像保留 `/opt/katago/` 和本目录配置/许可证；所需系统运行库为 `libstdc++6` 与 `zlib1g`。HTTP 服务只启动一套常驻引擎：

```sh
/opt/katago/katago analysis -config /app/analysis-engine/analysis.cfg -model /opt/katago/model.bin.gz -quit-without-waiting
```

`Dockerfile.engine` 是可独立使用的引擎检查镜像：

```sh
docker build -f analysis-engine/Dockerfile.engine -t weiqi-katago-engine .
printf '%s\n' '{"id":"ready","action":"query_version"}' | docker run --rm -i weiqi-katago-engine
```

上例的 `-quit-without-waiting` 在 stdin 关闭时不等待未完搜索；提交实际分析的烟雾检查应保持 stdin 打开，直到收到最终应答，或覆盖 entrypoint 不传该选项。Docker build/run **未在此没有 Docker 的本机执行**，必须另保存实际 Render Linux 构建/运行证据。

构建只要求2个编译任务（可设 `KATAGO_BUILD_JOBS=1..4`），运行固定1个分析任务、1个搜索线程、1个 Eigen 线程、batch1、神经缓存2^12、默认64 visits和15秒搜索上限，不输出 ownership（该项会增内存）。不加载人类 SL 模型。HTTP 层仍必须限制请求体、全局队列、速率、超时、取消及访问来源；不能把引擎配置开放给访客。

## 与本站规则的映射

不能用 `chinese` 简写，因为其简单劫和让子补偿与本站不同。请求必须传入：

```json
{"ko":"POSITIONAL","scoring":"AREA","suicide":false,"tax":"NONE","hasButton":false,"whiteHandicapBonus":"0","friendlyPassOk":true}
```

并显式传 `komi`。KataGo 支持[-400,400]内整数/半整数贴目；不支持的贴目必须说明并拒绝分析，不能静默四舍五入。本站合法着法与终局仍以唯一 Go Club 引擎、双方死子确认与面积分为准；此服务不替代终局判定。

`initialStones` 是真实初始摆子；`moves` 是当前有效路径上的真实 place/pass 序列；`initialPlayer` 是起点轮次。只有摆好的局面时传空 moves，明确此前历史未知；不能编造落子顺序。resign/确认/恢复对弈等管理动作不是坐标，不能伪装成引擎落子。

设置 `reportAnalysisWinratesAs = BLACK`，故 rootInfo 和 moveInfos 的 winrate 均为黑方视角，scoreLead 正值表示预计黑方领先。换成白走不会切换数值视角。

如果引擎报告规则被替换或不支持，HTTP 层必须停止该结果，不把近似规则冒称本站规则。状态就绪应在真实 `query_version`/`query_models` 或一条已完成的低量搜索之后确认。

## stdin/stdout 协议与取消

每行一个 JSON；按唯一 id 匹配异步输出。stderr 必须独立持续读取。`isDuringSearch:false` 是搜索结束标记。取消：

```json
{"id":"unique-cancel-id","action":"terminate","terminateId":"original-analysis-id"}
```

取消确认只是收件回执，不代表原搜索已停；收到原请求的最终应答（可含 `noResults:true`）后才能安全释放槽位。若未按时停止，结束并重启进程、失败通知所有待处理项。不能把终止后的部分结果误当完整响应给已取消调用者。

## 已执行的真实本机检查

平台：macOS Darwin27.0.0 arm64，Apple Clang21.0.0，任务目录安装 CMake3.31.6，Eigen3.4.0，源码编译通用 CPU。libzip 缺失只禁用自训练数据写入，不影响 analysis。没有安装全局依赖。

`evidence/native-arm64/`：12次真实64visit查询，5/9/13/19各检查空盘、有效历史、初始摆子加停手；无规则警告。初始化0.1428秒，单次0.4706–0.5897秒，50ms采样引擎峰值RSS56,082,432 bytes（53.48MiB），不含HTTP进程、可能漏过极短峰值。取消测试原最终应答在0.0013秒返回。它不能推断Render速度或总服务内存。

`evidence/native-perspective/`：双方轮次都执行独立确定性1visit搜索；BLACK/WHITE配置的胜率互补（1e-6容差）、领先数反号（1e-5容差），当前轮次保持不变。

复现（不是伪造测试输出）：

```sh
python3 analysis-engine/benchmark.py --engine /path/to/katago --model /path/to/model.bin.gz --output /tmp/real-katago-benchmark
python3 analysis-engine/perspective-check.py --engine /path/to/katago --model /path/to/model.bin.gz --output /tmp/real-katago-perspective
```

## 官方依据（访问2026-10-23）

- https://github.com/lightvector/KataGo/releases/tag/v1.18.1
- https://github.com/lightvector/KataGo/releases/tag/v1.18.2
- https://github.com/lightvector/KataGo/blob/v1.18.1/Compiling.md
- https://github.com/lightvector/KataGo/blob/v1.18.1/docs/Analysis_Engine.md
- https://github.com/lightvector/KataGo/blob/v1.18.1/docs/GTP_Extensions.md
- https://github.com/lightvector/KataGo/blob/v1.18.1/TrainingHistory.md
- https://katagoarchive.org/g170/neuralnets/README.txt
- https://katagoarchive.org/g170/neuralnets/index.html
- https://katagoarchive.org/g170/LICENSE.txt

KataGo 的 MIT许可、模型CC0声明、Eigen许可及上游模型说明保留在 `licenses/`；build脚本还把官方内嵌第三方源码/许可、sha2.cpp内嵌声明和CONTRIBUTORS复制到镜像。系统包的许可证随 Debian 运行镜像保留。

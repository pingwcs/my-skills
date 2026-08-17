# 附录：Electron Notes 代码环境

本附录描述 `examples/electron-notes/` 的最终状态。所有命令都从该目录执行；版本、脚本和制品名称来自 `package.json`、`package-lock.json` 与本机实测，不是初始化模板的计划值。

## 1. 已验证基线与版本依据

| 层 | 固定或已验证版本 | 依据与职责 |
|---|---:|---|
| Node.js | `22.21.1` | 本次 Windows 完整验收所用版本。Vite 8 要求 Node.js `20.19+` 或 `22.12+`，因此选择 Node 22 LTS 线并记录实际补丁版本。[Vite 入门指南](https://vite.dev/guide/) |
| npm | `10.9.4` | 随上述 Node 环境实际使用；`package-lock.json` 为 lockfile v3，安装统一使用 `npm ci`。[npm ci](https://docs.npmjs.com/cli/v10/commands/npm-ci) |
| Electron | `43.4.0` | `package.json` 与锁文件精确固定；提供主进程、renderer、Chromium 与 Node runtime。[Electron Quick Start](https://www.electronjs.org/docs/latest/tutorial/quick-start) |
| Electron Forge | `7.11.2` | CLI、Vite plugin、Squirrel maker、ZIP maker 四个包统一固定；负责开发启动、bundle、package 与 distributable。[Forge CLI](https://www.electronforge.io/cli) |
| TypeScript | `5.9.3` | 精确固定；以严格模式检查 main、preload、renderer 与配置文件。 |
| Vite | `8.2.1` | 精确固定；由 Forge Vite plugin 分别构建 main、preload 和 `main_window` renderer。[Forge Vite plugin](https://www.electronforge.io/config/plugins/vite) |
| ESLint | `9.39.2` | 精确固定；使用 flat config。`@eslint/js` 同为 `9.39.2`，`typescript-eslint` 为 `8.54.0`。 |

`package.json` 没有 `engines` 或 `packageManager` 字段，所以仓库目前不会自动拒绝其他 Node/npm 版本。要复现实次结果，应先确认：

```powershell
node --version
# v22.21.1

npm --version
# 10.9.4
```

Electron 自带的 Node runtime 与用于执行 Forge/npm 的系统 Node 是两套运行时；不要用 `node --version` 推断 Electron 内置 Node 的版本。

## 2. 工程结构

以下树只列入源码、配置、验证入口和构建后的关键路径；`node_modules/`、`.vite/` 与 `out/` 都是可重建目录，不提交版本库。

```text
examples/electron-notes/
├── package.json                 # 精确依赖与统一 npm scripts
├── package-lock.json            # lockfile v3，锁定完整依赖图与 integrity
├── forge.config.ts              # asar、应用标识、maker 与 Vite plugin 入口
├── tsconfig.json                # ES2022、NodeNext、strict 类型检查
├── eslint.config.mjs            # JS/TS 推荐规则；忽略 .vite 与 out
├── vite.main.config.ts          # 主进程 bundle 配置入口
├── vite.preload.config.ts       # preload bundle 配置入口
├── vite.renderer.config.ts      # renderer bundle 配置入口
├── index.html                   # renderer HTML 入口；CSP 由 session 响应头注入
├── scripts/
│   ├── security-check.mjs       # 10 项静态安全基线断言
│   └── artifact-check.mjs       # Windows package/make 六项制品断言
├── src/
│   ├── main.ts                  # 生命周期、窗口、IPC、菜单、导入导出
│   ├── preload.ts               # contextBridge 暴露窄范围 API
│   ├── renderer.ts              # UI 状态、事件与 API 调用
│   ├── contracts.ts             # 跨进程 channel、DTO 与 API 类型
│   ├── global.d.ts              # window.desktop 类型声明
│   ├── note-store.ts            # userData 下的 JSON 持久化
│   ├── security.ts              # URL、sender、导航、权限与 CSP 策略
│   └── styles.css               # renderer 样式
├── .vite/                       # start/package/make 生成的 bundle
└── out/
    ├── Electron Notes-win32-x64/
    │   ├── Electron Notes.exe
    │   └── resources/app.asar
    └── make/squirrel.windows/x64/
        ├── Electron Notes-1.0.0 Setup.exe
        ├── ElectronNotes-1.0.0-full.nupkg
        └── RELEASES
```

### 依赖职责

| 依赖 | 职责 |
|---|---|
| `electron` | 运行桌面应用，并提供 `app`、`BrowserWindow`、IPC、session、dialog 与 Menu API。 |
| `@electron-forge/cli` | 实现 `start`、`package` 和 `make` 生命周期。 |
| `@electron-forge/plugin-vite` | 将三个 Vite 配置接入 Forge，并注入 renderer 开发服务器 URL/名称常量。该 plugin 的官方文档仍标为 experimental，升级时必须重新做启动与制品回归。 |
| `@electron-forge/maker-squirrel` | Windows 上生成 Setup、NuGet package 与 `RELEASES`。[Squirrel maker](https://www.electronforge.io/config/makers/squirrel.windows) |
| `@electron-forge/maker-zip` | 仅在 macOS 目标生成 ZIP；当前配置没有 Linux maker。[ZIP maker](https://www.electronforge.io/config/makers/zip) |
| `typescript`、`@types/node` | 编译期类型检查；不负责运行测试。 |
| `eslint`、`@eslint/js`、`typescript-eslint` | JS/TS 静态分析。 |
| `vite` | bundle main、preload 与 renderer；由 Forge plugin 调用。 |

工程没有格式化器脚本、自动化测试框架或独立 `test` script。`npm run verify` 的客观范围是 lint、类型检查和静态安全断言，不能表述为单元测试或端到端测试通过。

## 3. Windows 从零运行

### 3.1 安装

1. 从 [Node.js 官方下载页](https://nodejs.org/en/download) 安装 Node 22，并在新 PowerShell 中确认上述版本。
2. 获取仓库后进入工程目录：

```powershell
cd examples/electron-notes
npm ci
```

预期：严格按锁文件重建 `node_modules/`。本次实测安装 561 个 package、审计 562 个 package；npm 同时显示若干传递依赖 deprecated 警告和完整开发依赖图的 26 个 audit findings。安装退出码仍为 0。

不要直接运行 `npm audit fix --force`：本次 npm 给出的建议会安装 Forge 6.4.2，属于破坏性降级，并会改变锁文件。应先在独立升级分支评估 Forge/传递依赖更新，再重跑本附录的全套验收。

### 3.2 启动最小示例

```powershell
npm start
```

预期：Forge 启动 Vite 开发环境并打开标题为 “Electron Notes” 的桌面窗口；状态栏显示 Windows 平台和本地笔记仓库已连接。关闭窗口即可结束。开发数据写入 Electron 的 `userData/notes/notes.json`，不是仓库目录。

若终端显示 Vite native config loader 警告，参见 6.4 节；当前是兼容性预警，不等同于 bundle 失败。

### 3.3 检查与构建

```powershell
npm run verify
```

预期：ESLint 和 `tsc --noEmit` 无错误；随后输出 10 行 `PASS`，覆盖 context isolation、禁用 Node integration、renderer sandbox、IPC sender、导航、新窗口、权限、生产 CSP、无静态 CSP 漂移以及 verify script 自检。

```powershell
npm run package
```

预期：Forge/Vite 构建三个 target，并生成 `out/Electron Notes-win32-x64/`；关键文件是 `Electron Notes.exe`、`resources/app.asar` 与 `resources.pak`。`package` 产生可运行目录，不产生安装器。[Forge build lifecycle](https://www.electronforge.io/core-concepts/build-lifecycle)

```powershell
npm run make
```

预期：先重新 package，再由 Squirrel maker 生成三个 Windows distributable。Setup 较大，Forge 输出 “Making a squirrel distributable” 后仍需等待命令完全返回；不要并行执行制品检查。

```powershell
npm run artifact:check
```

预期六项全部为 `PASS`：三个 package 文件和 Setup executable、full NuGet package、Squirrel release metadata。本次 Windows x64 实测通过，生成的 Setup 约 133 MiB，具体大小会随 runtime 和资源变化，脚本只要求文件存在且非空。

完整的可复制顺序是：

```powershell
npm ci
npm run verify
npm run package
npm run make
npm run artifact:check
```

## 4. 环境变量、端口、外部服务与凭据

应用本身不读取 `.env`，没有外部 API、数据库、登录凭据或固定业务端口。不要创建包含真实密钥的 `.env`。

开发时的 renderer URL 和端口由 Forge Vite plugin 动态提供，并通过 `MAIN_WINDOW_VITE_DEV_SERVER_URL` 注入 main bundle；源码没有固定端口。若端口冲突，先关闭遗留的 `npm start`/Electron 进程，再重新启动，不要把随机端口硬编码进 CSP。生产构建使用本地 `file:` URL，不监听端口。

网络仅在 `npm ci` 下载 npm package 与 Electron binary、以及首次 maker 获取或使用工具时需要。代理环境应通过 npm 的标准配置处理，例如：

```powershell
npm config get registry
npm config get proxy
npm config get https-proxy
```

只在组织明确提供代理时设置 `proxy`/`https-proxy`；凭据放在用户级配置或 CI secret，不写入仓库。Electron binary 下载问题可参考 [Electron 安装故障排查](https://www.electronjs.org/docs/latest/tutorial/installation#troubleshooting)。

`VITE_CONFIG_NATIVE_IGNORE_WARNING=true` 只会隐藏 6.4 节的预警，不修复配置兼容性，正常排障不建议设置。

## 5. 平台差异

| 项目 | Windows | macOS | Linux |
|---|---|---|---|
| 本教程完整验收 | Windows 11、x64 已实测 | 未实测 | 未实测 |
| `npm start` / `verify` | 配置支持 | 配置支持；菜单包含 `appMenu`，关闭全部窗口不会退出 | 配置支持；关闭全部窗口退出 |
| `npm run package` | 生成 `win32-x64` 目录 | 必须在 macOS 上生成并验收对应 bundle | 可生成平台 package，但当前未配置发行 maker |
| `npm run make` | Squirrel maker，已实测 | ZIP maker，通常应在 macOS 主机执行 | 当前 makers 列表没有 Linux target，因此不能宣称可交付 Linux 安装包 |
| `artifact:check` | 路径和文件名专用于 Windows | 不适用 | 不适用 |
| 签名/公证 | 未配置 Authenticode | 未配置 code signing/notarization | 未配置签名与发行仓库 |

Forge 官方说明通常应在目标平台构建对应制品，尤其是原生依赖与签名场景；发布流水线应使用独立 Windows/macOS runner，而不是把跨平台成功当作默认能力。[Forge makers](https://www.electronforge.io/config/makers)

## 6. 常见问题定位

### 6.1 安装或 Electron binary 下载失败

先区分 registry package 下载与 Electron binary 下载：

```powershell
npm config get registry
npm cache verify
npm ci --verbose
```

检查企业代理、TLS 拦截和防火墙日志。不要通过永久关闭 TLS 校验解决证书问题；应安装组织 CA 或修正代理配置。下载中断后重跑 `npm ci`，它会清理并重建依赖目录。

### 6.2 Node/npm 或锁文件不匹配

若 Vite 报 Node engine 不满足，切换到已验证的 Node `22.21.1`。若 `npm ci` 报 `package.json` 与 lock 不一致，说明依赖清单被修改但锁文件未同步；附录使用者不应以 `npm install` 掩盖漂移，应回到匹配的 commit。只有依赖升级任务才允许有意更新锁文件。

### 6.3 启动白屏

按以下顺序缩小范围：

1. 查看启动终端是否有 main/preload build error。
2. 用应用的“视图 → 切换开发者工具”检查 renderer console 与 Network。
3. 确认 `.vite/renderer/main_window/index.html` 存在。
4. 检查 preload 是否成功暴露 `window.desktop`；若缺失，查看 preload path 和 preload console。
5. 仅生产 package 白屏时，检查 `.vite/build/main.js`、`.vite/build/preload.js` 和 `resources/app.asar`，并核对 `MAIN_WINDOW_VITE_NAME` 对应 `main_window`。

不要先放宽 `nodeIntegration`、sandbox 或导航策略来“验证”白屏，这会改变安全边界。

### 6.4 CSP 或 Vite native loader 警告

CSP 错误先看 console 中被阻止的 directive。开发态由 `security.ts` 只额外允许当前 Vite origin、对应 WebSocket 和 inline style；生产态收紧为 self-only connect，并禁止 object、base、frame ancestor 与 form action。修改资源来源时，应精确增加所需 origin 并重跑 `npm run security:check`，不要加入宽泛的 `*` 或生产态 `unsafe-eval`。[Electron security checklist](https://www.electronjs.org/docs/latest/tutorial/security)

本次 `package` 与 `make` 都出现三条 Vite 警告：`vite.main.config.ts`、`vite.preload.config.ts`、`vite.renderer.config.ts` 使用 ESM syntax，但最近的 `package.json` 未声明 `"type": "module"`；这些特性不受计划成为未来默认值的 `configLoader: 'native'` 支持。当前 Vite 8.2.1 构建成功，因此这是未来兼容性债务，不是当前失败。后续应在专门变更中评估配置扩展名/模块类型，并回归 Forge 对 TS config 的加载；不应只用 `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` 隐藏它。[Vite config loading](https://vite.dev/config/#config-loading)

### 6.5 package 或 make 失败

- `package` 失败：先跑 `npm run verify`，再检查三个 Vite config、Forge entry 与文件占用。
- Squirrel 卡在最后阶段：等待 `npm run make` 完全返回；Setup 生成比 `.nupkg` 晚。本次若在 Forge 仍运行时提前执行检查，会暂时得到 Setup/`RELEASES` FAIL，完成后六项 PASS。
- 只有 package 没有安装器：这是命令语义，不是丢失；运行 `npm run make`。
- maker 不适用于当前 OS：检查 `forge.config.ts` 的 platform 限制；Windows 只配 Squirrel，macOS 只配 ZIP，Linux 未配置。
- 安装器无法建立信任：本教程未签名。生产发布必须配置证书、签名、macOS notarization、可信下载与更新渠道。[Electron code signing](https://www.electronjs.org/docs/latest/tutorial/code-signing)

### 6.6 audit findings

本次 `npm ci` 的完整依赖图报告 `26 vulnerabilities (3 low, 22 high, 1 critical)`；`npm audit` 将发现定位在 Forge 构建链的传递依赖，包括 `extract-zip`、`tar` 与 `tmp` 路径。另一方面，`npm audit --omit=dev` 报告 0 vulnerabilities，因为本工程所有直接依赖当前都在 `devDependencies`。这两个结果只描述 npm 的依赖分类与已知 advisory，不能推出构建机“安全”或 findings “与发布无关”：构建工具会处理下载包、归档与临时文件，应限制不可信输入、使用隔离 CI，并跟踪上游修复。

## 7. 教程环境与生产环境的边界

本工程保留了 context isolation、禁用 Node integration、renderer sandbox、窄范围 preload API、IPC sender 验证、导航/新窗口/权限拒绝、生产 CSP、asar、持久化原子替换和基础制品检查。这些是可演进的工程基线。

它仍不是可直接发布的生产方案：

- 没有单元、集成、端到端、安装/卸载和升级迁移自动化测试；
- 没有崩溃报告、结构化日志、性能与发布可观测性；
- 没有 Windows 签名、macOS 签名与 notarization、Linux maker；
- 没有自动更新、发布渠道、回滚、SBOM、依赖批准或漏洞响应 SLA；
- JSON 单文件存储适合教程数据量，不包含多进程锁、schema migration、备份恢复与磁盘配额策略；
- import/export 只展示本地文件集成，生产需要更完整的 schema version、大小限制、审计与恶意输入测试；
- Forge Vite plugin 仍有 experimental 标记，且当前存在 native config loader 兼容性预警；升级 Electron、Forge 或 Vite 时必须执行完整回归；
- 26 个开发工具链 audit findings 尚未修复，发布前需要逐项分析可达性、上游版本和缓解措施，不能以 `--force` 自动降级代替评估。

生产验收至少应在干净、隔离且与目标 OS 匹配的 CI runner 上执行 `npm ci → verify → package → make → artifact check`，再追加签名验证、安装/启动/卸载、升级与回滚测试。

## 8. 本附录的实测记录

2026-08-18 在 Windows x64、Node `v22.21.1`、npm `10.9.4` 上执行：

| 命令 | 结果 |
|---|---|
| `npm ci` | PASS；安装 561、审计 562 个 package；报告 26 个完整开发依赖图 findings |
| `npm audit --omit=dev` | PASS；0 vulnerabilities |
| `npm run verify` | PASS；lint、typecheck、10 项 security check 全通过 |
| `npm run package` | PASS；生成 Windows x64 package；记录三条 Vite native loader 预警 |
| `npm run make` | PASS；生成 Squirrel 三项 distributable；记录同类三条预警 |
| `npm run artifact:check` | PASS；六项制品检查全部通过 |

构建产物与依赖目录未纳入提交；本表是本次执行证据摘要，不替代 CI 日志和正式发布证明。

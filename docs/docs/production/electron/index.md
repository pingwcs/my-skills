# Electron 工程实践教程

这是一套面向前端开发工程师的 Electron 入门到交付教程。课程不是 API 汇编：你会持续演进同一个本地笔记应用 **Electron Notes**，最终走通窗口、Web UI、安全 IPC、本地持久化、系统集成、安全调试和 Windows 发布制品的完整链路。

## 适合谁

你应当已经能使用 HTML、CSS、TypeScript、DOM Event 和 `npm` 脚本，并理解 Promise。课程会借用前端经验解释 renderer，但不会假定你了解 Node.js 文件系统、Electron 多进程模型或桌面发布流程。

## 结课后你能做到什么

完成正文、动手任务和综合验收后，你能够：

- 从 main process、preload script、renderer process 三层设计 Electron 应用，而不是把它当成“能调用 Node.js 的网页”；
- 创建生命周期清楚、首帧稳定且保留安全默认值的 `BrowserWindow`；
- 通过类型化的窄范围 API 和运行时校验跨越 IPC 信任边界；
- 将用户数据保存到 `userData`，处理损坏输入、并发写入和失败不发布；
- 用 application menu 与原生 dialog 接入操作系统，同时让 renderer 无法指定任意文件路径；
- 建立 CSP、导航、权限、IPC sender 等安全策略，并按进程边界排障；
- 区分 `package`、`make`、签名、公证和发布，检查 Windows Squirrel 制品并说明跨平台缺口。

## 范围与非目标

课程覆盖单窗口、本地优先笔记应用的工程闭环，以及把它做成可检查制品所需的核心边界。贯穿 demo 使用 Electron Forge、Vite 和 TypeScript，不引入前端框架，以便把注意力留给 Electron 自身。

课程不承诺产出可直接公开发布的商业产品，也不教授 React/Vue、云同步、登录、多人协作、SQLite 全文检索、自动更新实现或完整 CI/CD。示例未配置代码签名、公证、Linux maker、publisher、崩溃上报和自动化 UI 测试；这些属于课程明确保留的生产缺口，而不是已经完成的能力。

## 学习地图与节奏

```mermaid
flowchart LR
  C1["01 进程模型"] --> C2["02 窗口与 UI"]
  C2 --> C3["03 preload 与 IPC"]
  C3 --> C4["04 本地持久化"]
  C4 --> C5["05 系统菜单与对话框"]
  C5 --> C6["06 安全与调试"]
  C6 --> C7["07 打包与发布"]
  C7 --> A["附录：复现代码环境"]
```

建议按顺序学习，因为每章都依赖前一章建立的职责边界。可采用 7～10 天节奏：第 1～3 章各 2～3 小时，第 4～6 章各 3～4 小时，第 7 章与综合验收共 4～6 小时。若只想先建立最小心智模型，可先完成第 1 章；不要跳过第 3 章直接给 renderer 开放 Node.js。

## 前置环境

- Windows、macOS 或 Linux 图形桌面；本课程完整实测基线是 Windows 11 x64。
- Node.js `22.21.1` 与 npm `10.9.4` 是本次复现版本；Vite 8 要求 Node.js `20.19+` 或 `22.12+`。
- Git、PowerShell 或等价终端，以及可打开 Chromium DevTools 的桌面会话。
- 安装依赖和 Electron binary 时需要访问 npm registry；运行应用本身不依赖外部服务或凭据。

依赖的精确版本、平台差异与排障步骤见[代码环境附录](appendix/code-environment.md)。

## 代码环境与贯穿 demo

代码入口是 [`examples/electron-notes`](../../../../examples/electron-notes/)。它不是每章各自复制的玩具项目，而是课程最终状态的统一工程：

```text
examples/electron-notes/
├── package.json            # 统一命令与精确依赖
├── forge.config.ts         # package、maker 与 Vite 入口
├── index.html              # renderer 页面骨架
├── scripts/                # 安全配置与制品检查
└── src/
    ├── main.ts             # 生命周期、IPC、菜单与对话框
    ├── preload.ts          # 窄范围 contextBridge API
    ├── renderer.ts         # 页面状态与交互
    ├── note-store.ts       # 本地 JSON 仓库
    ├── security.ts         # URL、权限、CSP 与 sender 策略
    └── contracts.ts        # 跨边界类型与固定 channel
```

章节讲述同一个 demo 的增量演进；仓库中的代码则代表结课时的最终状态。因此，阅读早期章节时看到最终工程已经具备持久化或菜单是正常的。每章都明确指出该阶段应关注的能力与刻意简化项。

## 章节导航

| 章节 | 工程目标 | 主要实践 | 进入前 |
|---|---|---|---|
| [第 1 章：Electron 心智模型与最小闭环](chapters/01-mental-model.md) | 解释启动路径与三个执行层的职责 | 启动窗口，沿 main → preload → renderer 追踪平台文字 | 熟悉前端基础 |
| [第 2 章：BrowserWindow 生命周期与笔记界面](chapters/02-window-and-ui.md) | 建立稳定首帧和可操作的桌面 UI | 新建、选择、编辑内存笔记并验证焦点与最小尺寸 | 第 1 章 |
| [第 3 章：用类型化 IPC 跨越进程边界](chapters/03-preload-and-ipc.md) | 把权威状态移到 main，建立窄 bridge | 实现 list/create/select/update，故障注入并检查 renderer 权限 | 第 1～2 章 |
| [第 4 章：把笔记安全地持久化到本地 JSON](chapters/04-local-persistence.md) | 让保存结果与磁盘提交一致 | 写队列、临时文件替换、损坏文件实验和重启验收 | 第 1～3 章 |
| [第 5 章：系统菜单与文件对话框](chapters/05-native-integration.md) | 在不泄露路径权限的前提下集成 OS | 菜单新建、导入/导出、取消与非法 JSON 验收 | 第 1～4 章 |
| [第 6 章：安全边界与排障路径](chapters/06-security-debugging.md) | 将安全清单变成代码和可重复检查 | CSP、导航/窗口/权限拒绝、sender guard 与分进程调试 | 第 1～5 章 |
| [第 7 章：可维护的发布制品](chapters/07-package-release.md) | 从源码生成并检查可分发制品 | package、make、artifact check、签名与更新边界设计 | 第 1～6 章 |
| [附录：Electron Notes 代码环境](appendix/code-environment.md) | 从干净环境复现最终工程 | 安装、验证、构建、制品检查与平台排障 | 完成或查阅全部章节 |

跨章术语统一使用[术语表](glossary.md)中的中英文名称。

## 能力覆盖矩阵

| 结课能力 | 对应章节 | 实践证据 | 客观验收 |
|---|---|---|---|
| 启动并解释桌面应用 | 01、02 | 追踪启动路径；操作双栏笔记 UI | 窗口与平台文字出现；焦点、最小尺寸和关闭行为符合平台 |
| 设计桌面能力边界 | 03 | 四个具名 IPC 用例；非法 payload 实验 | `verify`/`package` 通过；renderer 无 `require`、`process` 或通用 `send` |
| 管理本地数据 | 04 | 写队列、临时文件替换、损坏 JSON 实验 | 重启后保留最终文本；非法文件未被默认数据覆盖 |
| 集成操作系统 | 05 | application menu、open/save dialog、导入导出 | 菜单可操作；有效导入刷新；取消或非法导入不改变数据 |
| 建立安全与调试基线 | 06 | 安全检查、导航/窗口故障实验、分进程排障 | 10 项安全检查通过；非应用导航与新窗口被拒绝 |
| 生成可检查发布制品 | 07 | package、Squirrel make、制品结构检查 | Windows packaged app 可启动；六项 artifact check 通过 |
| 复现最终工程 | 附录 | 干净安装到 make 的完整命令链 | 命令退出码为 0，且结果与平台限制一致 |

## 从零快速开始

在仓库根目录执行：

```powershell
cd examples/electron-notes
node --version
npm --version
npm ci
npm run verify
npm start
```

预期 `npm run verify` 依次完成 ESLint、`tsc --noEmit` 和 10 项安全配置检查；它不包含单元测试或端到端测试。`npm start` 应打开 “Electron Notes” 窗口，状态区显示当前平台和本地笔记仓库已连接。关闭窗口后，再按第 1 章开始学习。

如果安装、启动或 CSP 出错，不要先关闭 sandbox 或打开 Node integration；按[附录的常见问题定位](appendix/code-environment.md#6-常见问题定位)逐层排查。

## 结课综合验收

在专用测试数据上完成，不要覆盖真实用户文件：

1. 从干净检出进入 `examples/electron-notes`，执行 `npm ci` 与 `npm run verify`。
2. 执行 `npm start`，新建笔记并输入唯一标题和正文；切换笔记后内容不串写。
3. 完全退出再启动，确认内容仍在；通过菜单导出 JSON，再导入一份有效 JSON。
4. 导入一份语法错误或重复 ID 的 JSON，确认原数据不变；取消 dialog 不显示伪成功。
5. 在 DevTools 确认 `require`、`process` 和通用 `window.desktop.send` 均不存在；`window.open('about:blank')` 不创建窗口。
6. 执行 `npm run package`；在 Windows 再执行 `npm run make` 与 `npm run artifact:check`。
7. 直接启动 packaged executable，复查主界面、菜单和重启持久化。
8. 用自己的话说明 main、preload、renderer 的职责，IPC 的两层校验，以及 package、make、签名和 publish 的区别。

只有静态命令、真实窗口交互和制品检查都满足时，才算形成结课能力闭环。

## 已验证结果与平台限制

2026-08-18 已在 Windows 11 x64、Node.js `22.21.1`、npm `10.9.4` 上验证 `npm ci`、`verify`、`package`、`make` 和 `artifact:check`；Windows 界面与交互也已验收。构建使用 Electron `43.4.0`、Forge `7.11.2`、TypeScript `5.9.3` 和 Vite `8.2.1`。

- macOS：配置了 ZIP maker，但本次未在 macOS 验证，也未配置签名或 notarization。
- Linux：开发启动与 package 路径可进一步验证，但当前没有 Linux maker，不能宣称可交付安装包。
- Windows：Squirrel 制品已本地生成和检查，但没有 Authenticode 签名，不适合作为正式公开发布物。
- 自动化范围：没有单元、集成、端到端、安装/卸载或升级测试；`verify` 是静态质量与安全配置入口。
- 依赖风险：完整开发依赖图仍报告 audit findings；课程记录了风险，不以 `npm audit fix --force` 自动降级工具链。

## 继续学习

完成课程后，优先沿官方资料扩展真实项目：

- [Electron Process Model](https://www.electronjs.org/docs/latest/tutorial/process-model)
- [Electron Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron IPC tutorial](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Electron Forge build lifecycle](https://www.electronforge.io/core-concepts/build-lifecycle)
- [Electron application distribution](https://www.electronjs.org/docs/latest/tutorial/application-distribution)
- [Electron updating applications](https://www.electronjs.org/docs/latest/tutorial/updates)

下一步建议先把 JSON 仓库升级为带 schema version 和 migration 的 SQLite 存储，再建立跨平台 CI、自动化 UI smoke、签名/公证和分阶段更新。每新增一项高权限能力，都应继续遵守“renderer 表达用例、preload 暴露窄接口、main 验证来源与输入”的边界。

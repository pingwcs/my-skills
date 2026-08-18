# Electron 教程术语表

本表只收录跨章节反复出现且容易混淆的概念。代码标识符、单个 API 和只在一章使用的发布名词不在这里重复堆列。

| 统一名称 | 精确定义 | 边界与易混点 | 首次出现 |
|---|---|---|---|
| 主进程（main process） | Electron 应用的 Node.js 入口，负责应用生命周期、原生窗口、高权限系统能力和本教程的权威业务状态。 | 一个应用通常只有一个 main process。它不直接操作页面 DOM，也不等于传统 Web 应用的远程服务器。 | [第 1 章](chapters/01-mental-model.md) |
| 渲染进程（renderer process） | `BrowserWindow` 中运行网页内容的 Chromium 进程，负责 DOM、样式和交互状态。 | 每个页面可对应独立 renderer。关闭 Node integration 后，它不是 Node.js 环境；页面快照也不是业务权威仓库。 | [第 1 章](chapters/01-mental-model.md) |
| 预加载脚本（preload script） | 在网页内容之前、renderer process 内的特殊环境中执行，用于把被允许的能力适配成页面 API。 | preload 不是第三种操作系统进程，也不是第二个 main process。它不应暴露整个 Electron 或 `ipcRenderer`。 | [第 1 章](chapters/01-mental-model.md) |
| `BrowserWindow` | main process 创建和控制的原生窗口对象，其 Web 内容由 renderer process 承载。 | 原生窗口生命周期与页面业务状态不同；`ready-to-show` 表示首帧可展示，不表示数据或业务已经 ready。 | [第 1 章](chapters/01-mental-model.md) |
| 上下文隔离（context isolation） | 让 preload 与页面运行在不同 JavaScript context 的安全机制，跨 context 能力需显式桥接。 | 它限制 JavaScript 对象世界的共享，不是操作系统 sandbox，也不能替代 IPC 输入校验。 | [第 1 章](chapters/01-mental-model.md) |
| Node 集成（Node integration） | Electron 是否把 Node.js 能力直接提供给 renderer 页面。本教程始终使用 `nodeIntegration: false`。 | 关闭它不会自动让所有 bridge 安全；若 preload 暴露任意文件能力，页面仍可获得过宽权限。 | [第 1 章](chapters/01-mental-model.md) |
| 渲染进程沙箱（renderer sandbox） | Chromium sandbox 对 renderer process 可直接访问的系统资源施加限制。本教程显式使用 `sandbox: true`。 | 它与 context isolation、Node integration 解决不同层次的问题，三者需要组合，不能互相替代。 | [第 1 章](chapters/01-mental-model.md) |
| 上下文桥（context bridge） | 通过 `contextBridge.exposeInMainWorld()` 把有限数据和函数暴露给隔离页面的机制。 | bridge 是权限适配层，不是 IPC 本身；暴露通用 `send(channel, data)` 会破坏最小权限。 | [第 1 章](chapters/01-mental-model.md) |
| 进程间通信（inter-process communication, IPC） | main 与 renderer 之间传递消息的机制；本教程主要使用 `invoke` / `handle` 请求—响应模式。 | TypeScript 类型不验证运行时消息。main 必须同时验证 sender/frame 和实际 payload；IPC 也不是远程网络协议。 | [第 3 章](chapters/03-preload-and-ipc.md) |
| 权威状态（authoritative state） | 当多个组件持有同一业务数据时，最终决定读写结果的唯一来源。本教程从第 3 章起由 main 中的仓库承担。 | renderer 可以保留用于绘制的快照，但不能形成第二个独立可写仓库；冲突时以 main 返回结果为准。 | [第 3 章](chapters/03-preload-and-ipc.md) |
| 用户数据目录（`userData`） | Electron 为当前用户和应用提供的持久化配置目录，本教程在其 `notes/notes.json` 保存笔记。 | 它不是源码目录、安装目录或缓存的同义词。课程数据只占其子目录，排障时不要删除整个 `userData`。 | [第 4 章](chapters/04-local-persistence.md) |
| 原子替换（atomic replacement） | 先在目标同目录完整写临时文件，再用 `rename` 替换目标的提交模式，用于降低留下半份 JSON 的风险。 | 它不是完整 durability 保证；本教程没有 `fsync`、文件锁、备份轮换或多进程事务。 | [第 4 章](chapters/04-local-persistence.md) |
| 应用菜单（application menu） | 由 main process 安装、按平台约定呈现的全局菜单，可包含业务命令和系统标准 role。 | 它不是页面内菜单或状态仓库。macOS 位于系统菜单栏；Windows/Linux 通常位于窗口顶部。 | [第 5 章](chapters/05-native-integration.md) |
| 菜单 role（menu role） | Electron 对撤销、复制、退出等标准平台动作的声明式标识，由系统决定行为、标签和快捷键。 | role 适合标准动作；新建、导入等业务命令使用自定义 click。同一项设置 role 时不能再依赖自定义 click。 | [第 5 章](chapters/05-native-integration.md) |
| 内容安全策略（Content Security Policy, CSP） | 浏览器对脚本、样式、连接等资源来源施加限制的响应策略，本教程按开发/生产环境分别生成。 | CSP 是纵深防御，不会修复 XSS，也不替代导航、权限或 IPC 校验；开发 HMR 例外不能带入生产。 | [第 6 章](chapters/06-security-debugging.md) |
| 应用来源允许列表（application source allowlist） | main 用规范化 URL/origin 和文件路径判断当前页面或 IPC sender 是否属于应用自身来源的规则。 | 不是字符串前缀匹配；开发态校验精确 Vite origin，生产态校验 renderer root 内的 `file:` URL。 | [第 6 章](chapters/06-security-debugging.md) |
| 打包（package） | Forge 把源码、renderer bundle 和 Electron runtime 组合成可独立启动的应用目录。 | package 不生成安装器、不上传远端，也不等于发布；它首先回答应用能否脱离 dev server 运行。 | [第 7 章](chapters/07-package-release.md) |
| 制作分发制品（make） | Forge 基于 packaged application 调用 maker，生成平台安装或分发文件。 | make 会先执行 package，但 package 成功不保证 maker、安装或更新 feed 成功。 | [第 7 章](chapters/07-package-release.md) |
| 发布（publish） | Forge 在配置 publisher 和凭据后，将 make 制品上传到远端发布目标的阶段。 | 本 demo 没有 publisher 或 `publish` script。上传不是签名、测试或发布审批的替代品。 | [第 7 章](chapters/07-package-release.md) |
| ASAR 归档（ASAR archive） | Electron 用于把应用 JavaScript、HTML、CSS 等资源收纳进 `app.asar` 的归档格式。 | ASAR 是封装而非加密、签名或秘密存储；用户可以读取或解包其内容。 | [第 7 章](chapters/07-package-release.md) |
| 代码签名（code signing） | 使用平台证书证明制品发布身份，并让操作系统检测签名后的二进制是否被修改。 | 签名不证明应用无漏洞，也不等于 macOS notarization。签名后修改制品会使签名失效。 | [第 7 章](chapters/07-package-release.md) |
| 公证（notarization） | Apple 对已签名 macOS 应用执行自动检查并记录结果的 Developer ID 分发步骤。 | 仅适用于 macOS 发布链；ZIP、签名和公证是不同步骤。本 demo 未配置或验证公证。 | [第 7 章](chapters/07-package-release.md) |

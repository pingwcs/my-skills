import { app, BrowserWindow, dialog, ipcMain, Menu, type MenuItemConstructorOptions } from 'electron';
import path from 'node:path';
import { appChannels, notesChannels, type MenuCommand, type Note, type NoteUpdate } from './contracts.js';
import { NoteStore } from './note-store.js';
import {
  assertTrustedSender,
  installSessionSecurity,
  installWebContentsSecurity,
  type ApplicationSource,
} from './security.js';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

const initialNotes: Note[] = [
  {
    id: 'welcome',
    title: '欢迎来到 Electron Notes',
    body: '笔记数据现在由主进程保存在 userData 目录。\n\n试着修改标题或正文，再创建一篇笔记；重启应用后，内容仍然存在。',
    updatedAt: Date.now(),
  },
  {
    id: 'learning',
    title: '我的 Electron 学习清单',
    body: '• 理解 BrowserWindow 生命周期\n• 区分 main 与 renderer 的职责\n• 使用窄范围、类型化 IPC',
    updatedAt: Date.now() - 30 * 60 * 1000,
  },
];

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} 必须是对象`);
  }
  return value as Record<string, unknown>;
}

function requireBoundedString(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== 'string') throw new Error(`${label} 必须是字符串`);
  if (value.length > maxLength) throw new Error(`${label}不能超过 ${maxLength} 个字符`);
  return value;
}

function requireId(value: unknown): string {
  const id = requireBoundedString(value, '笔记 ID', 128);
  if (id.length === 0) throw new Error('笔记 ID 不能为空');
  return id;
}

function parseUpdate(value: unknown): NoteUpdate {
  const input = requireRecord(value, '更新参数');
  return {
    id: requireId(input.id),
    title: requireBoundedString(input.title, '标题', 80),
    body: requireBoundedString(input.body, '正文', 100_000),
  };
}

function registerNotesHandlers(storeReady: Promise<NoteStore>, source: ApplicationSource): void {
  ipcMain.handle(notesChannels.list, async (event) => {
    assertTrustedSender(event, source);
    return (await storeReady).list();
  });
  ipcMain.handle(notesChannels.create, async (event) => {
    assertTrustedSender(event, source);
    return (await storeReady).create();
  });
  ipcMain.handle(notesChannels.select, async (event, input: unknown) => {
    assertTrustedSender(event, source);
    return (await storeReady).select(requireId(input));
  });
  ipcMain.handle(notesChannels.update, async (event, input: unknown) => {
    assertTrustedSender(event, source);
    const update = parseUpdate(input);
    return (await storeReady).update(update);
  });
}

function sendMenuCommand(command: MenuCommand, window = BrowserWindow.getFocusedWindow()): void {
  if (window && !window.isDestroyed()) window.webContents.send(appChannels.menuCommand, command);
}

async function importNotes(storeReady: Promise<NoteStore>): Promise<void> {
  const window = BrowserWindow.getFocusedWindow();
  if (!window) return;
  try {
    const result = await dialog.showOpenDialog(window, {
      title: '导入笔记',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePaths[0]) return;
    const count = await (await storeReady).importFrom(result.filePaths[0]);
    sendMenuCommand({ type: 'refresh', message: `已导入 ${count} 篇笔记` }, window);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    sendMenuCommand({ type: 'status', message: `导入失败：${reason}（现有数据未更改）` }, window);
  }
}

async function exportNotes(storeReady: Promise<NoteStore>): Promise<void> {
  const window = BrowserWindow.getFocusedWindow();
  if (!window) return;
  try {
    const result = await dialog.showSaveDialog(window, {
      title: '导出笔记',
      defaultPath: 'electron-notes.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return;
    const count = await (await storeReady).exportTo(result.filePath);
    sendMenuCommand({ type: 'status', message: `已导出 ${count} 篇笔记` }, window);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    sendMenuCommand({ type: 'status', message: `导出失败：${reason}` }, window);
  }
}

function installApplicationMenu(storeReady: Promise<NoteStore>): void {
  const fileMenu: MenuItemConstructorOptions = {
    label: '文件',
    submenu: [
      { label: '新建笔记', accelerator: 'CmdOrCtrl+N', click: () => sendMenuCommand({ type: 'new' }) },
      { type: 'separator' },
      { label: '导入 JSON…', accelerator: 'CmdOrCtrl+O', click: () => void importNotes(storeReady) },
      { label: '导出 JSON…', accelerator: 'CmdOrCtrl+Shift+S', click: () => void exportNotes(storeReady) },
      ...(process.platform === 'darwin' ? [] : [{ type: 'separator' as const }, { role: 'quit' as const }]),
    ],
  };
  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' as const }] : []),
    fileMenu,
    { role: 'editMenu' },
    {
      label: '视图',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'toggleDevTools' },
      ],
    },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow(): void {
  const window = new BrowserWindow({
    title: 'Electron Notes',
    width: 1180,
    height: 760,
    minWidth: 820,
    minHeight: 600,
    show: false,
    backgroundColor: '#f4f1e8',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once('ready-to-show', () => window.show());

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
}

const applicationSource: ApplicationSource = {
  devOrigin: MAIN_WINDOW_VITE_DEV_SERVER_URL
    ? new URL(MAIN_WINDOW_VITE_DEV_SERVER_URL).origin
    : undefined,
  rendererRoot: path.resolve(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}`),
};
installWebContentsSecurity(applicationSource);

void app.whenReady().then(() => {
  installSessionSecurity(applicationSource);
  const store = new NoteStore(
    path.join(app.getPath('userData'), 'notes', 'notes.json'),
    initialNotes,
  );
  const storeReady = store.initialize().then(() => store);
  void storeReady.catch(() => undefined);
  registerNotesHandlers(storeReady, applicationSource);
  installApplicationMenu(storeReady);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

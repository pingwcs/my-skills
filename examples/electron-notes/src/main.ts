import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { notesChannels, type Note, type NoteUpdate } from './contracts.js';
import { NoteStore } from './note-store.js';

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

function registerNotesHandlers(storeReady: Promise<NoteStore>): void {
  ipcMain.handle(notesChannels.list, async () => (await storeReady).list());
  ipcMain.handle(notesChannels.create, async () => (await storeReady).create());
  ipcMain.handle(notesChannels.select, async (_event, input: unknown) =>
    (await storeReady).select(requireId(input)),
  );
  ipcMain.handle(notesChannels.update, async (_event, input: unknown) => {
    const update = parseUpdate(input);
    return (await storeReady).update(update);
  });
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

void app.whenReady().then(() => {
  const store = new NoteStore(
    path.join(app.getPath('userData'), 'notes', 'notes.json'),
    initialNotes,
  );
  const storeReady = store.initialize().then(() => store);
  void storeReady.catch(() => undefined);
  registerNotesHandlers(storeReady);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

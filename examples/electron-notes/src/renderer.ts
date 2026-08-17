import './styles.css';

interface Note {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
}

interface NotesStore {
  list(): Note[];
  create(): Note;
  update(id: string, patch: Pick<Note, 'title' | 'body'>): Note | undefined;
}

const notes: Note[] = [
  {
    id: 'welcome',
    title: '欢迎来到 Electron Notes',
    body: '这是一个运行在 Electron 渲染进程中的界面。\n\n试着修改标题或正文，再创建一篇笔记。当前数据只保存在内存中，重启应用后会恢复初始内容。',
    updatedAt: Date.now(),
  },
  {
    id: 'learning',
    title: '我的 Electron 学习清单',
    body: '• 理解 BrowserWindow 生命周期\n• 区分 main 与 renderer 的职责\n• 下一章：通过 IPC 保存笔记',
    updatedAt: Date.now() - 30 * 60 * 1000,
  },
];

const store: NotesStore = {
  list: () => notes,
  create: () => {
    const note = { id: crypto.randomUUID(), title: '', body: '', updatedAt: Date.now() };
    notes.unshift(note);
    return note;
  },
  update: (id, patch) => {
    const note = notes.find((candidate) => candidate.id === id);
    if (!note) return undefined;
    Object.assign(note, patch, { updatedAt: Date.now() });
    return note;
  },
};

const get = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`找不到必要的界面元素：${selector}`);
  return element;
};

const status = document.querySelector<HTMLParagraphElement>('#status');
if (status) status.textContent = `运行平台：${window.desktop.platform}`;

const list = get<HTMLElement>('#note-list');
const listEmpty = get<HTMLElement>('#list-empty');
const emptyState = get<HTMLElement>('#empty-state');
const editor = get<HTMLFormElement>('#editor');
const titleInput = get<HTMLInputElement>('#note-title');
const bodyInput = get<HTMLTextAreaElement>('#note-body');
const editedAt = get<HTMLElement>('#edited-at');
const noteCount = get<HTMLElement>('#note-count');
let selectedId: string | null = notes[0]?.id ?? null;

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(timestamp);
}

function noteLabel(note: Note): string {
  return note.title.trim() || '无标题笔记';
}

function renderList(): void {
  list.replaceChildren(
    ...store.list().map((note) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'note-card';
      button.dataset.noteId = note.id;
      button.setAttribute('aria-current', String(note.id === selectedId));

      const title = document.createElement('strong');
      title.textContent = noteLabel(note);
      const preview = document.createElement('span');
      preview.textContent = note.body.trim().replace(/\s+/g, ' ') || '空白笔记';
      const time = document.createElement('time');
      time.textContent = formatTime(note.updatedAt);
      button.append(title, preview, time);
      return button;
    }),
  );
  noteCount.textContent = `${notes.length} 篇笔记`;
  listEmpty.hidden = notes.length > 0;
}

function renderEditor(): void {
  const selected = notes.find((note) => note.id === selectedId);
  emptyState.hidden = Boolean(selected);
  editor.hidden = !selected;
  if (!selected) return;
  titleInput.value = selected.title;
  bodyInput.value = selected.body;
  editedAt.textContent = `更新于 ${formatTime(selected.updatedAt)}`;
}

function selectNote(id: string): void {
  selectedId = id;
  renderList();
  renderEditor();
  titleInput.focus();
}

function createNote(): void {
  const note = store.create();
  selectNote(note.id);
}

function updateSelected(): void {
  if (!selectedId) return;
  store.update(selectedId, { title: titleInput.value, body: bodyInput.value });
  renderList();
  const selected = notes.find((note) => note.id === selectedId);
  if (selected) editedAt.textContent = `更新于 ${formatTime(selected.updatedAt)}`;
}

list.addEventListener('click', (event) => {
  const card = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-note-id]');
  if (card?.dataset.noteId) selectNote(card.dataset.noteId);
});
get<HTMLButtonElement>('#new-note').addEventListener('click', createNote);
get<HTMLButtonElement>('#empty-new-note').addEventListener('click', createNote);
titleInput.addEventListener('input', updateSelected);
bodyInput.addEventListener('input', updateSelected);

renderList();
renderEditor();

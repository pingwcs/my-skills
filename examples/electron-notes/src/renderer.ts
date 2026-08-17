import './styles.css';
import type { Note } from './contracts.js';

const get = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`找不到必要的界面元素：${selector}`);
  return element;
};

const status = get<HTMLParagraphElement>('#status');
const list = get<HTMLElement>('#note-list');
const listEmpty = get<HTMLElement>('#list-empty');
const emptyState = get<HTMLElement>('#empty-state');
const editor = get<HTMLFormElement>('#editor');
const titleInput = get<HTMLInputElement>('#note-title');
const bodyInput = get<HTMLTextAreaElement>('#note-body');
const editedAt = get<HTMLElement>('#edited-at');
const noteCount = get<HTMLElement>('#note-count');

let notes: Note[] = [];
let selectedId: string | null = null;
let updateQueue = Promise.resolve();

function showReady(): void {
  status.textContent = `运行平台：${window.desktop.platform} · 本地笔记仓库已连接`;
}

function showError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  status.textContent = `操作失败：${message}`;
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(timestamp);
}

function noteLabel(note: Note): string {
  return note.title.trim() || '无标题笔记';
}

function replaceNote(updated: Note): void {
  const index = notes.findIndex((note) => note.id === updated.id);
  if (index >= 0) notes[index] = updated;
}

function renderList(): void {
  list.replaceChildren(
    ...notes.map((note) => {
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

async function selectNote(id: string): Promise<void> {
  try {
    const selected = await window.desktop.notes.select(id);
    replaceNote(selected);
    selectedId = selected.id;
    renderList();
    renderEditor();
    titleInput.focus();
    showReady();
  } catch (error) {
    showError(error);
  }
}

async function createNote(): Promise<void> {
  try {
    const note = await window.desktop.notes.create();
    notes.unshift(note);
    await selectNote(note.id);
  } catch (error) {
    showError(error);
  }
}

function updateSelected(): void {
  if (!selectedId) return;
  const input = { id: selectedId, title: titleInput.value, body: bodyInput.value };
  updateQueue = updateQueue
    .then(async () => {
      const updated = await window.desktop.notes.update(input);
      replaceNote(updated);
      renderList();
      if (selectedId === updated.id) {
        editedAt.textContent = `更新于 ${formatTime(updated.updatedAt)}`;
      }
      showReady();
    })
    .catch(showError);
}

list.addEventListener('click', (event) => {
  const card = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-note-id]');
  if (card?.dataset.noteId) void selectNote(card.dataset.noteId);
});
get<HTMLButtonElement>('#new-note').addEventListener('click', () => void createNote());
get<HTMLButtonElement>('#empty-new-note').addEventListener('click', () => void createNote());
titleInput.addEventListener('input', updateSelected);
bodyInput.addEventListener('input', updateSelected);

async function initialize(): Promise<void> {
  status.textContent = '正在从主进程读取笔记…';
  try {
    notes = await window.desktop.notes.list();
    selectedId = notes[0]?.id ?? null;
    renderList();
    renderEditor();
    showReady();
  } catch (error) {
    renderList();
    renderEditor();
    showError(error);
  }
}

window.desktop.app.onMenuCommand((command) => {
  if (command.type === 'new') {
    void createNote();
    return;
  }
  if (command.type === 'status') {
    status.textContent = command.message;
    return;
  }
  void (async () => {
    try {
      notes = await window.desktop.notes.list();
      selectedId = notes.some((note) => note.id === selectedId) ? selectedId : (notes[0]?.id ?? null);
      renderList();
      renderEditor();
      status.textContent = command.message;
    } catch (error) {
      showError(error);
    }
  })();
});

void initialize();

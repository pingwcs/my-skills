import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Note, NoteUpdate } from './contracts.js';

const cloneNote = (note: Note): Note => ({ ...note });

function requirePersistedNote(value: unknown, index: number): Note {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`第 ${index + 1} 项必须是对象`);
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== 'string' || candidate.id.length === 0 || candidate.id.length > 128) {
    throw new Error(`第 ${index + 1} 项的 id 无效`);
  }
  if (typeof candidate.title !== 'string' || candidate.title.length > 80) {
    throw new Error(`第 ${index + 1} 项的 title 无效`);
  }
  if (typeof candidate.body !== 'string' || candidate.body.length > 100_000) {
    throw new Error(`第 ${index + 1} 项的 body 无效`);
  }
  if (typeof candidate.updatedAt !== 'number' || !Number.isFinite(candidate.updatedAt)) {
    throw new Error(`第 ${index + 1} 项的 updatedAt 无效`);
  }
  return {
    id: candidate.id,
    title: candidate.title,
    body: candidate.body,
    updatedAt: candidate.updatedAt,
  };
}

function parseNotes(text: string): Note[] {
  const value: unknown = JSON.parse(text);
  if (!Array.isArray(value)) throw new Error('根节点必须是数组');
  const notes = value.map(requirePersistedNote);
  if (new Set(notes.map((note) => note.id)).size !== notes.length) {
    throw new Error('笔记 id 必须唯一');
  }
  return notes;
}

export class NoteStore {
  private notes: Note[] = [];
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly filePath: string,
    private readonly initialNotes: Note[],
  ) {}

  async initialize(): Promise<void> {
    let text: string;
    try {
      text = await readFile(this.filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.notes = this.initialNotes.map(cloneNote);
        await this.persist(this.notes);
        return;
      }
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `无法读取笔记文件 ${this.filePath}：${reason}。原文件未被覆盖，请修复或备份后移走它。`,
      );
    }
    try {
      this.notes = parseNotes(text);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `无法解析笔记文件 ${this.filePath}：${reason}。原文件未被覆盖，请修复或备份后移走它。`,
      );
    }
  }

  async list(): Promise<Note[]> {
    await this.writeQueue;
    return this.notes.map(cloneNote);
  }

  async select(id: string): Promise<Note> {
    await this.writeQueue;
    return cloneNote(this.find(this.notes, id));
  }

  create(): Promise<Note> {
    return this.mutate((draft) => {
      const note: Note = { id: crypto.randomUUID(), title: '', body: '', updatedAt: Date.now() };
      draft.unshift(note);
      return note;
    });
  }

  update(update: NoteUpdate): Promise<Note> {
    return this.mutate((draft) => {
      const note = this.find(draft, update.id);
      Object.assign(note, { title: update.title, body: update.body, updatedAt: Date.now() });
      return note;
    });
  }

  async importFrom(filePath: string): Promise<number> {
    const imported = parseNotes(await readFile(filePath, 'utf8'));
    const pending = this.writeQueue.then(async () => {
      await this.persist(imported);
      this.notes = imported.map(cloneNote);
    });
    this.writeQueue = pending.catch(() => undefined);
    await pending;
    return imported.length;
  }

  async exportTo(filePath: string): Promise<number> {
    const snapshot = await this.list();
    await this.writeNotes(filePath, snapshot);
    return snapshot.length;
  }

  private find(notes: Note[], id: string): Note {
    const note = notes.find((candidate) => candidate.id === id);
    if (!note) throw new Error('找不到要操作的笔记');
    return note;
  }

  private mutate(operation: (draft: Note[]) => Note): Promise<Note> {
    let result!: Note;
    const pending = this.writeQueue.then(async () => {
      const draft = this.notes.map(cloneNote);
      result = operation(draft);
      await this.persist(draft);
      this.notes = draft;
    });
    this.writeQueue = pending.catch(() => undefined);
    return pending.then(() => cloneNote(result));
  }

  private async persist(notes: Note[]): Promise<void> {
    await this.writeNotes(this.filePath, notes);
  }

  private async writeNotes(filePath: string, notes: Note[]): Promise<void> {
    const directory = path.dirname(filePath);
    const temporaryPath = `${filePath}.${process.pid}.tmp`;
    await mkdir(directory, { recursive: true });
    try {
      await writeFile(temporaryPath, `${JSON.stringify(notes, null, 2)}\n`, 'utf8');
      await rename(temporaryPath, filePath);
    } catch (error) {
      await rm(temporaryPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }
}

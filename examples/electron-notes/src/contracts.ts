export interface Note {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
}

export interface NoteUpdate {
  id: string;
  title: string;
  body: string;
}

export interface NotesAPI {
  list(): Promise<Note[]>;
  create(): Promise<Note>;
  select(id: string): Promise<Note>;
  update(input: NoteUpdate): Promise<Note>;
}

export type MenuCommand =
  | { type: 'new' }
  | { type: 'refresh'; message: string }
  | { type: 'status'; message: string };

export interface AppAPI {
  onMenuCommand(listener: (command: MenuCommand) => void): () => void;
}

export const notesChannels = {
  list: 'notes:list',
  create: 'notes:create',
  select: 'notes:select',
  update: 'notes:update',
} as const;

export const appChannels = {
  menuCommand: 'app:menu-command',
} as const;

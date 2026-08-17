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

export const notesChannels = {
  list: 'notes:list',
  create: 'notes:create',
  select: 'notes:select',
  update: 'notes:update',
} as const;

import { contextBridge, ipcRenderer } from 'electron';
import { notesChannels, type Note, type NoteUpdate, type NotesAPI } from './contracts.js';

const notesAPI: NotesAPI = {
  list: () => ipcRenderer.invoke(notesChannels.list) as Promise<Note[]>,
  create: () => ipcRenderer.invoke(notesChannels.create) as Promise<Note>,
  select: (id) => ipcRenderer.invoke(notesChannels.select, id) as Promise<Note>,
  update: (input: NoteUpdate) => ipcRenderer.invoke(notesChannels.update, input) as Promise<Note>,
};

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  notes: notesAPI,
});

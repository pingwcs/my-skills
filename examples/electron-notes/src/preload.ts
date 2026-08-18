import { contextBridge, ipcRenderer } from 'electron';
import {
  appChannels,
  notesChannels,
  type AppAPI,
  type MenuCommand,
  type Note,
  type NoteUpdate,
  type NotesAPI,
} from './contracts.js';

const notesAPI: NotesAPI = {
  list: () => ipcRenderer.invoke(notesChannels.list) as Promise<Note[]>,
  create: () => ipcRenderer.invoke(notesChannels.create) as Promise<Note>,
  select: (id) => ipcRenderer.invoke(notesChannels.select, id) as Promise<Note>,
  update: (input: NoteUpdate) => ipcRenderer.invoke(notesChannels.update, input) as Promise<Note>,
};

const appAPI: AppAPI = {
  onMenuCommand: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, command: MenuCommand) => listener(command);
    ipcRenderer.on(appChannels.menuCommand, handler);
    return () => ipcRenderer.removeListener(appChannels.menuCommand, handler);
  },
};

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  notes: notesAPI,
  app: appAPI,
});

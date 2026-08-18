export {};

import type { AppAPI, NotesAPI } from './contracts.js';

declare global {
  interface Window {
    desktop: { platform: NodeJS.Platform; notes: NotesAPI; app: AppAPI };
  }
}

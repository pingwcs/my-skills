export {};

import type { NotesAPI } from './contracts.js';

declare global {
  interface Window {
    desktop: { platform: NodeJS.Platform; notes: NotesAPI };
  }
}

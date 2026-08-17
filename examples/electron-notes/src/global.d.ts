export {};

declare global {
  interface Window {
    desktop: { platform: NodeJS.Platform };
  }
}

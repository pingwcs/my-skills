import { app, session, type IpcMainInvokeEvent, type WebContents } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ApplicationSource {
  devOrigin?: string;
  rendererRoot: string;
}

function isPathInside(candidate: string, root: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function isAllowedApplicationURL(rawURL: string, source: ApplicationSource): boolean {
  try {
    const url = new URL(rawURL);
    if (source.devOrigin) return url.origin === source.devOrigin;
    if (url.protocol !== 'file:') return false;
    return isPathInside(fileURLToPath(url), source.rendererRoot);
  } catch {
    return false;
  }
}

export function assertTrustedSender(event: IpcMainInvokeEvent, source: ApplicationSource): void {
  const frame = event.senderFrame;
  if (!frame || frame !== event.sender.mainFrame || !isAllowedApplicationURL(frame.url, source)) {
    throw new Error('拒绝来自非应用页面或子 frame 的 IPC 请求');
  }
}

function contentSecurityPolicy(source: ApplicationSource): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'none'",
  ];

  if (source.devOrigin) {
    const devURL = new URL(source.devOrigin);
    const websocketOrigin = `${devURL.protocol === 'https:' ? 'wss:' : 'ws:'}//${devURL.host}`;
    directives.push(`connect-src 'self' ${source.devOrigin} ${websocketOrigin}`);
    directives[2] = "style-src 'self' 'unsafe-inline'";
  } else {
    directives.push("connect-src 'self'");
  }
  return directives.join('; ');
}

export function installSessionSecurity(source: ApplicationSource): void {
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false);
  });
  const policy = contentSecurityPolicy(source);
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [policy],
      },
    });
  });
}

export function installWebContentsSecurity(source: ApplicationSource): void {
  app.on('web-contents-created', (_event, contents: WebContents) => {
    contents.on('will-navigate', (event, navigationURL) => {
      if (!isAllowedApplicationURL(navigationURL, source)) event.preventDefault();
    });
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  });
}

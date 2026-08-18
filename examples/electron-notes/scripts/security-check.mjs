import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { URL } from 'node:url';

const [main, security, html, manifest] = await Promise.all([
  readFile(new URL('../src/main.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/security.ts', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../package.json', import.meta.url), 'utf8'),
]);

const requirements = [
  ['context isolation', main.includes('contextIsolation: true')],
  ['Node integration disabled', main.includes('nodeIntegration: false')],
  ['renderer sandbox', main.includes('sandbox: true')],
  ['IPC sender validation', main.includes('assertTrustedSender(event, source)')],
  ['navigation policy', security.includes("contents.on('will-navigate'")],
  ['new-window denial', security.includes("action: 'deny'")],
  ['permission denial', security.includes('setPermissionRequestHandler') && security.includes('callback(false)')],
  ['production CSP', security.includes("object-src 'none'") && security.includes("connect-src 'self'")],
  ['no static CSP drift', !html.includes('http-equiv="Content-Security-Policy"')],
  ['verify includes security check', JSON.parse(manifest).scripts.verify.includes('security:check')],
];

const failures = requirements.filter(([, passed]) => !passed);
for (const [name, passed] of requirements) {
  process.stdout.write(`${passed ? 'PASS' : 'FAIL'} ${name}\n`);
}
if (failures.length > 0) {
  process.exitCode = 1;
  process.stderr.write(
    `Security configuration check failed: ${failures.map(([name]) => name).join(', ')}\n`,
  );
}

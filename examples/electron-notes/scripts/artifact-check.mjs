import { access, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const out = path.resolve('out');

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function filesBelow(root) {
  const files = [];
  if (!(await exists(root))) return files;
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await filesBelow(target)));
    else files.push(target);
  }
  return files;
}

const packagedRoot = path.join(out, 'Electron Notes-win32-x64');
const packagedRequirements = [
  path.join(packagedRoot, 'Electron Notes.exe'),
  path.join(packagedRoot, 'resources', 'app.asar'),
  path.join(packagedRoot, 'resources.pak'),
];

const madeFiles = await filesBelow(path.join(out, 'make'));
const makeRequirements = [
  ['Setup executable', (file) => /Electron Notes-.* Setup\.exe$/i.test(file)],
  ['full NuGet package', (file) => /ElectronNotes-.*-full\.nupkg$/i.test(file)],
  ['Squirrel release metadata', (file) => path.basename(file) === 'RELEASES'],
];

const failures = [];
for (const target of packagedRequirements) {
  const passed = await exists(target);
  process.stdout.write(`${passed ? 'PASS' : 'FAIL'} package ${path.relative(out, target)}\n`);
  if (!passed) failures.push(target);
}

for (const [label, predicate] of makeRequirements) {
  const target = madeFiles.find(predicate);
  const passed = Boolean(target && (await stat(target)).size > 0);
  process.stdout.write(`${passed ? 'PASS' : 'FAIL'} make ${label}${target ? `: ${path.relative(out, target)}` : ''}\n`);
  if (!passed) failures.push(label);
}

if (failures.length > 0) {
  process.exitCode = 1;
  process.stderr.write('Artifact check failed. Run npm run make on Windows, then retry.\n');
}

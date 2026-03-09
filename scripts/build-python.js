const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';
const command = isWin ? 'powershell.exe' : 'bash';
const args = isWin
  ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'scripts', 'build-python.ps1')]
  : [path.join(root, 'scripts', 'build-python.sh')];

const result = spawnSync(command, args, {
  cwd: root,
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

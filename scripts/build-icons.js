const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');

function resolvePythonExecutable() {
  const venvPath =
    process.platform === 'win32'
      ? path.join(root, '.venv', 'Scripts', 'python.exe')
      : path.join(root, '.venv', 'bin', 'python');

  if (fs.existsSync(venvPath)) {
    return venvPath;
  }

  if (process.env.PYTHON_BIN) {
    return process.env.PYTHON_BIN;
  }

  return process.platform === 'win32' ? 'python' : 'python3';
}

const pythonExe = resolvePythonExecutable();
const result = spawnSync(pythonExe, [path.join(root, 'scripts', 'build-icons.py')], {
  cwd: root,
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

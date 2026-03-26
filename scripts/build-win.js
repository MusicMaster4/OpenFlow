const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

if (process.platform !== 'win32') {
  console.error('This build script must be run on Windows.');
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');
const packageJson = require(path.join(projectRoot, 'package.json'));
const productName = packageJson.productName || packageJson.name || 'OpenFlow';
const electronBuilderCli = path.join(projectRoot, 'node_modules', 'electron-builder', 'cli.js');
const distDir = path.join(projectRoot, 'dist');
const unpackedDir = path.join(distDir, 'win-unpacked');
const executablePath = path.join(unpackedDir, `${productName}.exe`);
const iconPath = path.join(projectRoot, 'src', 'assets', 'openflow.ico');
const vendoredRceditPath = path.join(
  projectRoot,
  'node_modules',
  'electron-winstaller',
  'vendor',
  'rcedit.exe',
);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

function resolveRceditPath() {
  if (fs.existsSync(vendoredRceditPath)) {
    return vendoredRceditPath;
  }

  const cacheRoot = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'electron-builder', 'Cache', 'winCodeSign')
    : null;

  if (!cacheRoot || !fs.existsSync(cacheRoot)) {
    return null;
  }

  const matches = [];
  const stack = [cacheRoot];
  while (stack.length > 0) {
    const currentDir = stack.pop();
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name.toLowerCase().startsWith('rcedit') && entry.name.endsWith('.exe')) {
        matches.push({
          fullPath,
          mtimeMs: fs.statSync(fullPath).mtimeMs,
        });
      }
    }
  }

  matches.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return matches[0]?.fullPath || null;
}

async function main() {
  fs.rmSync(distDir, { recursive: true, force: true });

  run(process.execPath, [path.join(projectRoot, 'scripts', 'build-icons.js')]);
  run(process.execPath, [path.join(projectRoot, 'scripts', 'build-python.js')]);

  run(process.execPath, [
    electronBuilderCli,
    '--win',
    'dir',
    '--publish',
    'never',
    '--config.win.signAndEditExecutable=false',
  ]);

  if (!fs.existsSync(executablePath)) {
    console.error(`Expected executable not found: ${executablePath}`);
    process.exit(1);
  }

  const rceditPath = resolveRceditPath();
  if (!rceditPath) {
    console.error('Unable to locate rcedit.exe to stamp the Windows executable icon.');
    process.exit(1);
  }

  run(rceditPath, [
    executablePath,
    '--set-version-string',
    'FileDescription',
    productName,
    '--set-version-string',
    'ProductName',
    productName,
    '--set-icon',
    iconPath,
  ]);

  run(process.execPath, [
    electronBuilderCli,
    '--win',
    'nsis',
    '--prepackaged',
    unpackedDir,
    '--publish',
    'never',
    '--config.win.signAndEditExecutable=false',
  ]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

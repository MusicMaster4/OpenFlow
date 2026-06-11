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
const publishConfig = Array.isArray(packageJson.build?.publish)
  ? packageJson.build.publish.find((entry) => entry && entry.provider === 'github')
  : null;
const electronBuilderCli = path.join(projectRoot, 'node_modules', 'electron-builder', 'cli.js');
const distDir = path.join(projectRoot, 'dist');
const unpackedDir = path.join(distDir, 'win-unpacked');
const appUpdateConfigPath = path.join(unpackedDir, 'resources', 'app-update.yml');
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

function writeAppUpdateConfig() {
  if (!publishConfig?.owner || !publishConfig?.repo) {
    throw new Error('Missing GitHub publish owner/repo in package.json build.publish.');
  }

  fs.mkdirSync(path.dirname(appUpdateConfigPath), { recursive: true });
  fs.writeFileSync(
    appUpdateConfigPath,
    [
      'provider: github',
      `owner: ${publishConfig.owner}`,
      `repo: ${publishConfig.repo}`,
      `updaterCacheDirName: ${packageJson.name}-updater`,
      '',
    ].join('\n'),
  );
}

function hasPaddedPatchVersion(version) {
  const match = String(version || '').match(/^[0-9]+\.[0-9]+\.([0-9]{3})$/);
  return Boolean(match && match[1].startsWith('0'));
}

const requestedPublish = process.env.OPENFLOW_PUBLISH === 'always';
if (requestedPublish && hasPaddedPatchVersion(packageJson.version)) {
  console.error(
    `Refusing Electron Builder auto-publish for ${packageJson.version}. ` +
      'It can normalize padded versions and create a duplicate GitHub release.',
  );
  console.error('Use the release-main workflow or upload the generated Windows artifacts manually.');
  process.exit(1);
}

const publishMode = requestedPublish ? 'always' : 'never';

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

  writeAppUpdateConfig();

  run(process.execPath, [
    electronBuilderCli,
    '--win',
    'nsis',
    '--prepackaged',
    unpackedDir,
    '--publish',
    publishMode,
    '--config.win.signAndEditExecutable=false',
  ]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

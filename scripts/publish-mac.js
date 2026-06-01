const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const packageJson = require(path.join(projectRoot, 'package.json'));
const arch = process.argv[2];
const supportedArchs = new Set(['x64', 'arm64']);

if (!supportedArchs.has(arch)) {
  console.error('Usage: node scripts/publish-mac.js <x64|arm64>');
  process.exit(1);
}

if (process.platform !== 'darwin') {
  console.error('This publish script must be run on macOS.');
  process.exit(1);
}

const distDir = path.join(projectRoot, 'dist');
const genericMetadataPath = path.join(distDir, 'latest-mac.yml');
const archMetadataPath = path.join(distDir, `latest-${arch}-mac.yml`);
const releaseTag = `v${packageJson.version}`;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runAllowFailure(command, args) {
  return spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
  }).status ?? 1;
}

function renameUpdateMetadata() {
  if (fs.existsSync(genericMetadataPath)) {
    fs.renameSync(genericMetadataPath, archMetadataPath);
  }

  if (!fs.existsSync(archMetadataPath)) {
    console.error(`Expected macOS update metadata not found: ${archMetadataPath}`);
    process.exit(1);
  }
}

function getReleaseAssets() {
  const allowedExtensions = new Set(['.dmg', '.zip', '.yml', '.blockmap']);
  return fs.readdirSync(distDir)
    .filter((name) => allowedExtensions.has(path.extname(name).toLowerCase()))
    .map((name) => path.join(distDir, name))
    .sort();
}

renameUpdateMetadata();

if (!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) {
  console.error('Set GH_TOKEN with repo scope before publishing macOS artifacts.');
  process.exit(1);
}

if (runAllowFailure('gh', ['release', 'view', releaseTag]) !== 0) {
  runAllowFailure('gh', [
    'release',
    'create',
    releaseTag,
    '--draft',
    '--title',
    `OpenFlow ${packageJson.version}`,
    '--notes',
    `Draft release generated for ${releaseTag}.`,
  ]);
  run('gh', ['release', 'view', releaseTag]);
}

const assets = getReleaseAssets();
if (assets.length === 0) {
  console.error('No macOS release assets found in dist/.');
  process.exit(1);
}

run('gh', ['release', 'upload', releaseTag, ...assets, '--clobber']);

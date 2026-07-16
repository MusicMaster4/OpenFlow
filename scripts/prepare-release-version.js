const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d{3})$/;
const TAG_PATTERN = /^v(\d+)\.(\d+)\.(\d+)$/;

function parseVersion(value, pattern = VERSION_PATTERN) {
  const match = String(value || '').match(pattern);
  if (!match) {
    return null;
  }
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function compareVersions(left, right) {
  return left.major - right.major || left.minor - right.minor || left.patch - right.patch;
}

function formatVersion(version) {
  return `${version.major}.${version.minor}.${String(version.patch).padStart(3, '0')}`;
}

function incrementVersion(version) {
  if (version.patch < 999) {
    return { ...version, patch: version.patch + 1 };
  }
  return { major: version.major, minor: version.minor + 1, patch: 0 };
}

function findHighestVersion(values, pattern) {
  let highest = null;
  for (const value of values) {
    const parsed = parseVersion(value, pattern);
    if (parsed && (!highest || compareVersions(parsed, highest) > 0)) {
      highest = parsed;
    }
  }
  return highest;
}

function chooseReleaseVersion({ packageVersion, lockVersion, tagNames }) {
  const highestTag = findHighestVersion(tagNames, TAG_PATTERN) || { major: 0, minor: 0, patch: 0 };
  const nextTaggedVersion = incrementVersion(highestTag);
  const trackedVersions = [packageVersion, lockVersion]
    .map((value) => parseVersion(value))
    .filter(Boolean)
    .map(formatVersion);
  const highestTrackedVersion = findHighestVersion(trackedVersions, VERSION_PATTERN);

  // Preserve an already prepared unused version. Otherwise recover stale or mismatched
  // files by advancing beyond every padded or normalized release tag in the repository.
  const releaseVersion =
    highestTrackedVersion && compareVersions(highestTrackedVersion, highestTag) > 0
      ? highestTrackedVersion
      : nextTaggedVersion;
  return formatVersion(releaseVersion);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function updateVersionFiles(repoRoot, version) {
  const packagePath = path.join(repoRoot, 'package.json');
  const lockPath = path.join(repoRoot, 'package-lock.json');
  const readmePath = path.join(repoRoot, 'README.md');
  const packageJson = readJson(packagePath);
  const lockJson = readJson(lockPath);

  packageJson.version = version;
  lockJson.version = version;
  if (lockJson.packages && lockJson.packages['']) {
    lockJson.packages[''].version = version;
  }
  writeJson(packagePath, packageJson);
  writeJson(lockPath, lockJson);

  if (fs.existsSync(readmePath)) {
    const readme = fs.readFileSync(readmePath, 'utf8');
    const updatedReadme = readme.replace(
      /^Current version: `[^`]+`$/m,
      `Current version: \`${version}\``,
    );
    if (updatedReadme === readme && !readme.includes(`Current version: \`${version}\``)) {
      throw new Error('README.md does not contain the expected current-version line.');
    }
    fs.writeFileSync(readmePath, updatedReadme);
  }
}

function getGitTags(repoRoot) {
  return execFileSync('git', ['tag', '--list'], { cwd: repoRoot, encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean);
}

function prepareReleaseVersion({ repoRoot = path.resolve(__dirname, '..'), write = false } = {}) {
  const packageJson = readJson(path.join(repoRoot, 'package.json'));
  const lockJson = readJson(path.join(repoRoot, 'package-lock.json'));
  const version = chooseReleaseVersion({
    packageVersion: packageJson.version,
    lockVersion: lockJson.version,
    tagNames: getGitTags(repoRoot),
  });
  if (write) {
    updateVersionFiles(repoRoot, version);
  }
  return { version, tag: `v${version}` };
}

if (require.main === module) {
  const result = prepareReleaseVersion({ write: process.argv.includes('--write') });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

module.exports = {
  chooseReleaseVersion,
  compareVersions,
  formatVersion,
  incrementVersion,
  parseVersion,
  prepareReleaseVersion,
  updateVersionFiles,
};

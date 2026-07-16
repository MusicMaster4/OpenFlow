const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chooseReleaseVersion, updateVersionFiles } = require('./prepare-release-version');

function choose(packageVersion, lockVersion, tagNames) {
  return chooseReleaseVersion({ packageVersion, lockVersion, tagNames });
}

assert.strictEqual(choose('1.3.045', '1.3.045', ['v1.3.048']), '1.3.049');
assert.strictEqual(choose('1.3.049', '1.3.049', ['v1.3.048']), '1.3.049');
assert.strictEqual(choose('1.3.049', '1.3.048', ['v1.3.048']), '1.3.049');
assert.strictEqual(choose('invalid', '1.3.045', ['v1.3.048']), '1.3.049');
assert.strictEqual(choose('1.3.049', '1.3.049', ['v1.3.049']), '1.3.050');
assert.strictEqual(choose('1.3.049', '1.3.049', ['v1.3.49']), '1.3.050');
assert.strictEqual(choose('1.3.999', '1.3.999', ['v1.3.999']), '1.4.000');
assert.strictEqual(choose('2.0.001', '2.0.001', ['v1.9.999']), '2.0.001');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openflow-release-version-'));
try {
  fs.writeFileSync(
    path.join(tempRoot, 'package.json'),
    `${JSON.stringify({ name: 'openflow', version: '1.3.045' }, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(tempRoot, 'package-lock.json'),
    `${JSON.stringify({ version: '1.3.044', packages: { '': { version: '1.3.043' } } }, null, 2)}\n`,
  );
  fs.writeFileSync(path.join(tempRoot, 'README.md'), 'Current version: `1.3.042`\n');

  updateVersionFiles(tempRoot, '1.3.049');

  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(tempRoot, 'package.json'))).version, '1.3.049');
  const updatedLock = JSON.parse(fs.readFileSync(path.join(tempRoot, 'package-lock.json')));
  assert.strictEqual(updatedLock.version, '1.3.049');
  assert.strictEqual(updatedLock.packages[''].version, '1.3.049');
  assert.strictEqual(fs.readFileSync(path.join(tempRoot, 'README.md'), 'utf8'), 'Current version: `1.3.049`\n');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

console.log(
  'release-version-ok: stale, advanced, normalized-tag, mismatch, rollover, and file-sync cases passed',
);

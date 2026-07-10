'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const mainPath = path.join(__dirname, '..', 'src', 'main', 'main.js');
const source = fs.readFileSync(mainPath, 'utf8');

function getFunctionSource(name) {
  const marker = `async function ${name}(`;
  const start = source.indexOf(marker);
  assert.notStrictEqual(start, -1, `${name} was not found in main.js`);

  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }

  throw new Error(`Could not parse ${name} from main.js`);
}

const refreshSource = getFunctionSource('refreshOpenRouterModels');
const catchMatch = refreshSource.match(/catch\s*\(error\)\s*{([\s\S]*?)\n\s*}/);

assert(catchMatch, 'refreshOpenRouterModels must handle fetch failures');
assert(
  /openRouterModelsStatus\s*:\s*'error'/.test(catchMatch[1]),
  'OpenRouter failures must remain visible in the cloud-model settings',
);
assert(
  /openRouterModelsError\s*:/.test(catchMatch[1]),
  'OpenRouter failures must be stored in openRouterModelsError',
);
assert(
  !/(^|\n)\s*error\s*:/.test(catchMatch[1]),
  'An optional OpenRouter lookup must not overwrite the dictation engine error',
);

console.log('PASS: OpenRouter startup fetch failures are isolated from the dictation engine state.');

/**
 * Forces Jest to load the vendored TestSequencer shim so that npm install
 * does not need to mutate node_modules (macOS provenance blocks that in CI).
 */
const Module = require('module');
const path = require('path');

const sequencerEntry = path.resolve(__dirname, './jest-test-sequencer.js');
const sequencerPackage = path.resolve(__dirname, './jest-test-sequencer.package.json');

const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function patchedResolve(request, parent, ...rest) {
  if (request === '@jest/test-sequencer') {
    return sequencerEntry;
  }

  if (request === '@jest/test-sequencer/package.json') {
    return sequencerPackage;
  }

  return originalResolveFilename.call(this, request, parent, ...rest);
};

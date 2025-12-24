'use strict';

/**
 * Copies the latest build artifacts from dist/ into chattio/downloads/
 * so the marketing site can link to real installers.
 */

const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../dist');
const downloadsDir = path.resolve(__dirname, '../chattio/downloads');

if (!fs.existsSync(distDir)) {
  console.error(`dist directory not found at ${distDir}`);
  process.exit(1);
}

fs.mkdirSync(downloadsDir, { recursive: true });

const fileMap = [
  {
    pattern: /Chattio-[\d.]+-arm64\.dmg$/i,
    target: 'Chattio-mac-arm64.dmg',
  },
  {
    pattern: /Chattio-[\d.]+-arm64-mac\.zip$/i,
    target: 'Chattio-mac-arm64.zip',
  },
  {
    pattern: /Chattio\.exe$/i,
    target: 'Chattio.exe',
  },
];

const distFiles = fs.readdirSync(distDir);
let copied = 0;

fileMap.forEach(({ pattern, target }) => {
  const sourceName = distFiles.find((filename) => pattern.test(filename));
  if (!sourceName) {
    return;
  }
  const sourcePath = path.join(distDir, sourceName);
  const targetPath = path.join(downloadsDir, target);
  fs.copyFileSync(sourcePath, targetPath);
  console.log(`Copied ${sourceName} -> ${path.relative(process.cwd(), targetPath)}`);
  copied += 1;
});

if (copied === 0) {
  console.warn('No matching artifacts found to copy.');
}

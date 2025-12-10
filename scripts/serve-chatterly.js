'use strict';

/**
 * Minimal static file server for Playwright e2e tests.
 *
 * Usage: node scripts/serve-chatterly.js [port] [root]
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const port = parseInt(process.argv[2], 10) || 4173;
const rootDir = path.resolve(process.argv[3] || path.join(__dirname, '../chatterly'));

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

function sanitizePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const safeSuffix = path.normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, '');
  return path.join(rootDir, safeSuffix);
}

const server = http.createServer((req, res) => {
  const filePath = sanitizePath(req.url === '/' ? '/index.html' : req.url);

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    if (stats.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      fs.stat(indexPath, (indexErr, indexStats) => {
        if (indexErr || !indexStats.isFile()) {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('Directory access is forbidden');
          return;
        }
        streamFile(indexPath, res);
      });
    } else {
      streamFile(filePath, res);
    }
  });
});

function streamFile(filePath, res) {
  const stream = fs.createReadStream(filePath);
  stream.on('open', () => {
    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
  });
  stream.on('error', () => {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Error reading file');
  });
  stream.pipe(res);
}

server.listen(port, '127.0.0.1', () => {
  console.log(`Serving ${rootDir} at http://127.0.0.1:${port}`);
});

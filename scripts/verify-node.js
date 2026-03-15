#!/usr/bin/env node
/**
 * Verify Node.js is connected and ready for ZoomCart.
 * Run: node scripts/verify-node.js
 */
const { execSync } = require('child_process');
const requiredNode = 18;
const version = process.version.slice(1);
const major = parseInt(version.split('.')[0], 10);

console.log('Node.js:', process.version);
let npmVersion = 'not found';
try {
  npmVersion = execSync('npm -v', { encoding: 'utf8' }).trim();
} catch (_) {
  console.log('npm:   (not in PATH - add Node.js to your system PATH)');
}
if (npmVersion !== 'not found') console.log('npm:   ', npmVersion);

if (major < requiredNode) {
  console.error(`\nNode.js ${requiredNode}+ is recommended. You have ${process.version}.`);
  console.error('Install from https://nodejs.org (LTS).');
  process.exit(1);
}

if (npmVersion === 'not found') {
  console.log('\nNode works but npm was not found. Add Node.js to PATH, then run: npm install && npm start');
} else {
  console.log('\nNode.js is connected. Run: npm install && npm start');
}
process.exit(0);

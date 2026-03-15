'use strict';

const os = require('os');
const { spawn } = require('child_process');

/**
 * Get this machine's LAN IPv4 (not 127.0.0.1).
 * Forces Expo to advertise the LAN URL so physical devices connect correctly.
 */
function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

const lanIp = getLanIp();
if (lanIp) {
  process.env.REACT_NATIVE_PACKAGER_HOSTNAME = lanIp;
  console.log('[ZoomCart] Using LAN URL: exp://' + lanIp + ':8081');
  console.log('[ZoomCart] Connect Expo Go by scanning the QR code below (do not use "Recent" if it showed 127.0.0.1).\n');
} else {
  console.warn('[ZoomCart] Could not detect LAN IP; Expo may still use 127.0.0.1. Use the QR code from this session to connect.\n');
}

const child = spawn('npx', ['expo', 'start', '--lan'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
  cwd: require('path').resolve(__dirname, '..'),
});
child.on('exit', (code) => process.exit(code != null ? code : 0));

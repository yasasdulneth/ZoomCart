const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;

function assetPath(filename) {
  const p = path.join(projectRoot, 'assets', filename);
  return fs.existsSync(p) ? p : null;
}

const iconPath = assetPath('icon.png');
const splashPath = assetPath('splash.png');
const adaptiveIconPath = assetPath('adaptive-icon.png');
const faviconPath = assetPath('favicon.png');

function parseDotEnvFile(dotenvPath) {
  try {
    if (!fs.existsSync(dotenvPath)) return {};
    const raw = fs.readFileSync(dotenvPath, 'utf8');
    const lines = raw.split(/\r?\n/);
    const out = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx < 0) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      // strip surrounding quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      out[key] = value;
    }

    return out;
  } catch (e) {
    // Avoid hard-crashing config evaluation; surface a readable message.
    // eslint-disable-next-line no-console
    console.error('[app.config.js] Failed to parse .env for Firebase config:', e);
    return {};
  }
}

const env = parseDotEnvFile(path.join(projectRoot, '.env'));

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: 'ZoomCart',
  slug: 'zoomcart',
  version: '1.0.0',
  sdkVersion: '54.0.0',
  orientation: 'portrait',
  // Allow Light / Dark / System from ThemeContext (Appearance.setColorScheme).
  userInterfaceStyle: 'automatic',
  assetBundlePatterns: ['**/*'],
  extra: {
    api: {
      baseUrl: env.EXPO_PUBLIC_API_BASE_URL ?? '',
    },
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.zoomcart.app',
  },
  android: {
    package: 'com.zoomcart.app',
    backgroundColor: '#0A0A0F',
  },
  web: {},
  plugins: [
    'expo-localization',
    'expo-font',
    'expo-audio',
    'expo-asset',
    'expo-router',
    ['expo-camera', { cameraPermission: 'ZoomCart needs camera access to scan product barcodes.' }],
    [
      'expo-image-picker',
      {
        photosPermission: 'ZoomCart needs access to your photo library to set your profile picture.',
      },
    ],
    [
      '@stripe/stripe-react-native',
      {
        merchantIdentifier: 'com.zoomcart.app',
        enableGooglePay: false
      }
    ],
  ],
  scheme: 'zoomcart',
};

if (iconPath) config.icon = iconPath;
if (splashPath) {
  config.splash = { image: splashPath, resizeMode: 'contain', backgroundColor: '#0A0A0F' };
}
if (adaptiveIconPath) {
  config.android.adaptiveIcon = { foregroundImage: adaptiveIconPath, backgroundColor: '#0A0A0F' };
}
if (faviconPath) config.web.favicon = faviconPath;

module.exports = config;

// Learn more https://docs.expo.dev/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// react-i18next (ESM under dist/es) expects peer `i18next`; Metro sometimes fails to resolve it from nested files.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  i18next: path.resolve(__dirname, 'node_modules/i18next'),
};

module.exports = config;

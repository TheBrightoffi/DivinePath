const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Add additional watch folders
config.watchFolders = [
  ...(config.watchFolders || []),
  'node_modules'
];

// Configure resolver to handle reanimated
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native-reanimated': require.resolve('react-native-reanimated'),
};

module.exports = withNativeWind(config, { input: './global.css' });
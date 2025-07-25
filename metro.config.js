const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Reduce development output and warnings
config.reporter = {
  ...config.reporter,
  update: () => {}, // Suppress update messages
};

// Optimize for development
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  },
};

// Suppress development warnings
config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, 'jsx', 'js', 'ts', 'tsx'],
};

// Reduce console output in development
if (process.env.NODE_ENV === 'development') {
  config.reporter = {
    ...config.reporter,
    update: () => {},
  };
}

module.exports = config; 
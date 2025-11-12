// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  // Override settings for Supabase Edge Functions (Deno runtime)
  {
    files: ['supabase/functions/**/*.ts', 'supabase/functions/**/*.tsx', 'supabase/functions/**/*.js'],
    languageOptions: {
      globals: {
        Deno: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        fetch: 'readonly',
      },
    },
    rules: {
      // URL imports like "https://deno.land/..." are valid in Deno but not resolvable by Node import resolver
      'import/no-unresolved': 'off',
    },
  },
]);

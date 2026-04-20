module.exports = {
  env: {
    browser: true,
    node: true,
    es2022: true,
    serviceworker: true,
  },
  globals: {
    process: 'readonly',
    global: 'readonly',
    importScripts: 'readonly',
  },
  parser: '@typescript-eslint/parser',
  plugins: ['react', 'react-hooks', '@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    'no-unused-vars': 'warn',
    'no-undef': 'error',
    // you can tighten these later
  },
  overrides: [
    {
      files: ['public/**/*.js', 'android/**/*.js'],
      env: { serviceworker: true },
      globals: { importScripts: 'readonly' },
      rules: { 'no-undef': 'off' },
    },
  ],
  settings: { react: { version: 'detect' } },
};
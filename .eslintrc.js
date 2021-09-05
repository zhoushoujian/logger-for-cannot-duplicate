const path = require('path');

module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: ['@shuyun-ep-team/eslint-config/base', '@shuyun-ep-team/eslint-config/prettier'],
  globals: {},
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    project: './tsconfig.json',
    createDefaultProgram: true,
  },
  rules: {
    'prefer-rest-params': 0,
    'global-require': 0,
    'no-useless-call': 0,
    'no-console': 0,
    '@typescript-eslint/no-unused-vars': 0,
  },
  plugins: [],
};

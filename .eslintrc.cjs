/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  root: true,
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier/skip-formatting',
  ],
  parserOptions: { ecmaVersion: 'latest' },
  env: {
    node: true,
    'vue/setup-compiler-macros': true,
  },
  rules: {
    'vue/multi-word-component-names': 'warn',
    'brace-style': [
      'error',
      '1tbs', // K&R / "one true brace style" - opening braces on same line
      { allowSingleLine: true },
    ],
    'object-curly-newline': [
      'error',
      {
        ObjectExpression: {
          multiline: true,
          minProperties: 2, // More reasonable threshold
        },
        ObjectPattern: {
          multiline: true,
          minProperties: 3,
        },
      },
    ],
  },
}

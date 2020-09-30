module.exports = {
  env: {
    es6: true,
    node: true
  },
  extends: ['standard-with-typescript'],
  plugins: ['@typescript-eslint'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json'
  },
  rules: {
    // Make TypeScript ESLint less strict.
    '@typescript-eslint/member-delimiter-style': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/strict-boolean-expressions': 'off',
    '@typescript-eslint/restrict-plus-operands': 'off',
    // '@typescript-eslint/no-floating-promises': 'off',
    // '@typescript-eslint/triple-slash-reference': 'off',
    '@typescript-eslint/restrict-template-expressions': 'off',
    // '@typescript-eslint/prefer-optional-chain': 'off',
    // '@typescript-eslint/prefer-nullish-coalescing': 'off',
    // Allow no-multi-str.
    'no-multi-str': 'off'
  }
}

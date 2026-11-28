module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  plugins: ['import'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'error',
    eqeqeq: ['error', 'always'],
    'prefer-const': 'error',
    'no-var': 'error',
    'no-nested-ternary': 'error',
    'no-magic-numbers': [
      'error',
      {
        ignore: [0, 1, -1, 2],
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true,
      },
    ],
    'max-lines': ['error', { max: 200 }],
    'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],
    complexity: ['error', 10],
    'max-depth': ['error', 3],
    'max-params': ['error', 4],
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'never',
      },
    ],
  },
  overrides: [
    {
      files: ['src/constants/**/*.js', 'src/state/initialState.js'],
      rules: {
        'no-magic-numbers': 'off',
      },
    },
  ],
};

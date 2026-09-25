import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    rules: {
      // Underscore-prefixed means "required by a signature but deliberately unused".
      // Express error middleware, for instance, is only recognised as such when it
      // declares all four parameters. Mirrors tsconfig's noUnusedParameters.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  // API: Node environment.
  {
    files: ['apps/api/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // E2E: Playwright runs in Node. Its fixtures must destructure their dependencies,
  // so a fixture with none is written `async ({}, use)` - an empty pattern by design.
  {
    files: ['e2e/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'no-empty-pattern': 'off',
    },
  },

  // Web: browser environment plus the rules of hooks.
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: reactHooks.configs.recommended.rules,
  },

  // Tests may lean on non-null assertions and loose typing for fixtures.
  {
    files: ['**/*.test.{ts,tsx}', '**/test/**'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // Must stay last: turns off stylistic rules that Prettier owns.
  prettier,
);

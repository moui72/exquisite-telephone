// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.svelte-kit/**',
      '**/build/**',
      '.claude/**',
      '.project/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // TypeScript (with the DOM lib) already catches undefined globals
      // more accurately than ESLint can without duplicating tsconfig's
      // "lib" settings here.
      'no-undef': 'off',
      // Svelte `$:` reactive blocks read module-scoped `let`s across
      // re-invocations; ESLint's single-pass control-flow analysis can't
      // see those later reads and flags legitimate reactive assignments as
      // dead (e.g. WritingDrawing.svelte's wasDecorating/previousTurnKey).
      // Newly added to eslint:recommended in @eslint/js v10.
      'no-useless-assignment': 'off',
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  prettier,
  ...svelte.configs['flat/prettier'],
);

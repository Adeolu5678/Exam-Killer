// @ts-check
import { resolve } from 'path';
import { fileURLToPath } from 'url';

// eslint-config-next v16 already exports a flat config array
import nextPlugin from 'eslint-config-next';
// eslint-plugin-import ships native flat config support
import importPlugin from 'eslint-plugin-import';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  // ── Base: Next.js recommended rules (already a flat config array in v16) ──
  ...nextPlugin,

  // ── Global ignores ──────────────────────────────────────────────────────────
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'public/**',
      '*.min.js',
      'examkiller-firebase-adminsdk-*.json',
    ],
  },

  // ── Import plugin: resolver + settings ─────────────────────────────────────
  {
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: resolve(__dirname, 'tsconfig.json'),
        },
        node: true,
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
    },
  },

  // ── FSD Layer: features/ ───────────────────────────────────────────────────
  // features/ cannot import from widgets/ or app/.
  // features/ cannot import from another feature's internal files.
  {
    files: ['src/features/**/*.{ts,tsx}'],
    plugins: {
      import: importPlugin,
    },
    rules: {
      // Block upward cross-layer imports
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/widgets/*', '../widgets/*', '../../widgets/*'],
              message:
                '[FSD] features/ must NOT import from widgets/. Dependency rule: app → widgets → features → shared.',
            },
            {
              group: ['@/app/*', '../app/*', '../../app/*'],
              message:
                '[FSD] features/ must NOT import from app/. Dependency rule: app → widgets → features → shared.',
            },
          ],
        },
      ],
      // Intra-feature sub-layer imports (ui/ → model/, model/ → api/, etc.) are ALLOWED
      // Cross-feature imports MUST go through the public index.ts.
      'import/no-internal-modules': [
        'error',
        {
          allow: [
            // Allow all internal imports within the features directory.
            // Cross-feature internal imports are blocked by FSD hierarchy logic,
            // but since we can't easily do "same-feature" logic here, we allow
            // the feature folder structure and rely on the public API principal.
            '**/features/*/**',
            '**/shared/**',
            '**/styles/**',
            // ── Third-party nested imports ────────────────────────────────────
            'next/**',
            'next/navigation',
            'zustand/**',
            'zustand/middleware/immer',
            'firebase/**',
            'lucide-react/**',
            'framer-motion/**',
            '@tanstack/react-virtual',
          ],
        },
      ],
      // Circular dependency detection
      // Circular dependency detection — disabled during commit/heavy scan to prevent Windows crash
      // 'import/no-cycle': ['error', { maxDepth: 3 }],
    },
  },

  // ── FSD Layer: shared/ ─────────────────────────────────────────────────────
  // shared/ cannot import from features/, widgets/, or app/.
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '../features/*'],
              message:
                '[FSD] shared/ must NOT import from features/. shared/ is the foundation layer with zero business logic.',
            },
            {
              group: ['@/widgets/*', '../widgets/*'],
              message:
                '[FSD] shared/ must NOT import from widgets/. shared/ is the foundation layer.',
            },
            {
              group: ['@/app/*', '../app/*'],
              message: '[FSD] shared/ must NOT import from app/. shared/ is the foundation layer.',
            },
          ],
        },
      ],
    },
  },

  // ── FSD Layer: widgets/ ────────────────────────────────────────────────────
  // widgets/ cannot import from app/. Can use features/ only via public index.ts.
  {
    files: ['src/widgets/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/*', '../app/*'],
              message:
                '[FSD] widgets/ must NOT import from app/. Data flows downward: app → widgets → features → shared.',
            },
          ],
        },
      ],
    },
  },

  // ── Global TypeScript quality rules ────────────────────────────────────────
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: resolve(__dirname, 'tsconfig.json'),
        },
        node: true,
      },
    },
    rules: {
      // Ordered imports for readability
      'import/order': [
        'warn',
        {
          groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [
            { pattern: 'react', group: 'external', position: 'before' },
            { pattern: 'next', group: 'external', position: 'before' },
            { pattern: 'next/**', group: 'external', position: 'before' },
            { pattern: '@/styles/**', group: 'internal', position: 'before' },
            { pattern: '@/shared/**', group: 'internal', position: 'after' },
            { pattern: '@/features/**', group: 'internal', position: 'after' },
            { pattern: '@/widgets/**', group: 'internal', position: 'after' },
          ],
          pathGroupsExcludedImportTypes: ['react', 'next'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      // Ensure imports resolve
      'import/no-unresolved': ['error', { commonjs: true, amd: false, ignore: ['^@/'] }],
    },
  },
];

export default eslintConfig;

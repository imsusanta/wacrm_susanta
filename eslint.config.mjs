import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-require-imports': 'error',
      'react/no-unescaped-entities': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      'react-compiler/react-compiler': 'off',
      '@next/next/no-img-element': 'warn',
      'prefer-const': 'warn',
    },
  },
  // Layer boundary enforcement: Core must never depend on the modules,
  // app, components, or hooks layers. Industry capabilities are consumed
  // through the port in `src/core/modules` (dependency inversion).
  {
    files: ['src/core/**/*.ts', 'src/core/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/modules',
                '@/modules/*',
                '@/app',
                '@/app/*',
                '@/components',
                '@/components/*',
                '@/hooks',
                '@/hooks/*',
                '@/lib/travel',
                '@/lib/travel/*',
              ],
              message:
                'Core must not depend on modules/app/components/hooks or concrete travel services. Consume industry capabilities via the port in @/core/modules.',
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Vendored minified opus-recorder encoder worker (served statically).
    'public/opus/**',
    // Local diagnostic scratch scripts
    'scratch/**',
    // Generated coverage reports (vitest --coverage)
    'coverage/**',
    // Internal agent worktrees
    '.claude/**',
    // Generated local Supabase stack scratch files (see .gitignore).
    'supabase/.temp/**',
  ]),
]);

export default eslintConfig;

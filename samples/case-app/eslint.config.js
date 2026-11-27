import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Kicking off async data loading from an effect (and flipping a loading
      // flag) is the canonical pattern these data-driven views use — it mirrors
      // the shape React's own data-fetching docs demonstrate. The advisory
      // cascading-render rule doesn't fit here, so treat it as a warning.
      'react-hooks/set-state-in-effect': 'warn',
      // The auth/cases providers co-locate their hook with the provider
      // component; the fast-refresh nicety doesn't warrant splitting them.
      'react-refresh/only-export-components': 'warn',
    },
  },
])

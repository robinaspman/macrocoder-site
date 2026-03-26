import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

function rulesToWarn(rules = {}) {
  return Object.fromEntries(Object.keys(rules).map((name) => [name, 'warn']))
}

const tsRecommendedRules = Object.assign(
  {},
  ...tseslint.configs.recommended.map((config) => config.rules || {}),
)

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.worker,
        ...globals.serviceworker,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...rulesToWarn(js.configs.recommended.rules),
      ...rulesToWarn(tsRecommendedRules),
      ...rulesToWarn(reactHooks.configs.flat.recommended.rules),
      ...rulesToWarn(reactRefresh.configs.vite.rules),

      // Keep these explicitly non-blocking until codebase cleanup is completed.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'no-control-regex': 'warn',
      'no-useless-escape': 'warn',
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },
])

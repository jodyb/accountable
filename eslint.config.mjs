import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // api-types.ts is generated from the backend's OpenAPI schema.
  { ignores: ['**/dist/', 'frontend/src/lib/api-types.ts', 'test-results/', 'playwright-report/'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, jsxA11y.flatConfigs.recommended],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['e2e/**/*.ts', 'scripts/**/*.mjs', '*.config.{ts,mjs}', 'frontend/*.config.ts'],
    languageOptions: { globals: globals.node },
  },
  { rules: { complexity: ['error', 15] } },
  prettier,
)

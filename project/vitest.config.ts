import {defineConfig} from 'vitest/config';
export default defineConfig({test:{maxWorkers:4,include:['tests/**/*.test.ts','tests/**/*.test.tsx'],exclude:['tests/browser/**']}});

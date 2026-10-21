import {defineConfig} from '@playwright/test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export default defineConfig({
  testDir: path.join(root, 'tests/browser'),
  outputDir: path.join(root, 'output/playwright/freeze-b-results'),
  reporter: [['list']],
  use: {baseURL:'http://127.0.0.1:4188', browserName:'chromium'},
  webServer: {
    command:'./node_modules/.bin/vite preview --host 127.0.0.1 --port 4188 --strictPort',
    cwd:root, url:'http://127.0.0.1:4188', reuseExistingServer:false,
  },
});

import {defineConfig} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
// Each run owns an isolated store; never reuse user rooms or accumulate the 100-room service cap.
const dataFile=join(mkdtempSync(join(tmpdir(),'go-club-online-browser-')),'rooms.json');
export default defineConfig({testDir:'tests/browser',testMatch:/online(?:-tools)?\.spec\.ts/,outputDir:'output/playwright/online-results',reporter:'list',timeout:60000,use:{baseURL:'http://127.0.0.1:4195',browserName:'chromium'},webServer:{command:'node dist-server/server.mjs',env:{HOST:'127.0.0.1',PORT:'4195',GO_CLUB_DATA_FILE:dataFile},url:'http://127.0.0.1:4195/api/online/health',reuseExistingServer:false}});

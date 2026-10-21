import {defineConfig} from '@playwright/test';
import base from './playwright.online.config';
export default defineConfig({...base,grepInvert:/bad\/full room/,outputDir:'output/playwright/online-webkit-results',use:{...base.use,browserName:'webkit',baseURL:'http://127.0.0.1:4196'},webServer:{command:'node dist-server/server.mjs',env:{HOST:'127.0.0.1',PORT:'4196',GO_CLUB_DATA_FILE:'/private/tmp/go-club-online-webkit-test/rooms.json'},url:'http://127.0.0.1:4196/api/online/health',reuseExistingServer:false}});

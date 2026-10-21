import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,testMatch:'history.spec.ts',grepInvert:/offline refresh/,outputDir:'output/playwright/history-webkit-results',reporter:'list',use:{...base.use,browserName:'webkit'}});

import {defineConfig} from '@playwright/test';
import base from './playwright.katago.config';
// The analysis endpoint is unchanged; retain historical evidence and write this release's results separately.
export default defineConfig({...base,outputDir:'output/playwright/ai-analysis-regression',reporter:[['list'],['json',{outputFile:'docs/ai-play/checks/analysis-ui-regression.json'}]]});

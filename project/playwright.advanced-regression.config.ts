import {defineConfig} from '@playwright/test';
import base from './playwright.katago.config';
// Preserve the 0.22.0 historical KataGo evidence; this run is only a current UI regression.
export default defineConfig({...base,outputDir:'output/playwright/advanced-analysis-results',reporter:[['list'],['json',{outputFile:'docs/advanced-courses/checks/analysis-ui-regression.json'}]]});

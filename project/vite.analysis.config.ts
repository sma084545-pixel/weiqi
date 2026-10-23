import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({ssr:{noExternal:true},build:{target:'node22',ssr:resolve(import.meta.dirname,'server/analysis/index.ts'),outDir:'dist-analysis',emptyOutDir:true,minify:false,rolldownOptions:{output:{entryFileNames:'analysis.mjs'}}}});

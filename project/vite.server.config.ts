import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({ssr:{noExternal:true},build:{target:'node22',ssr:resolve(import.meta.dirname,'server/index.ts'),outDir:'dist-server',emptyOutDir:true,minify:false,rolldownOptions:{output:{entryFileNames:'server.mjs',banner:"import { createRequire as __onlineCreateRequire } from 'node:module'; const require = __onlineCreateRequire(import.meta.url);"}}}});

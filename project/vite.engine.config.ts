import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({build:{outDir:'dist-engine',emptyOutDir:true,lib:{entry:resolve(import.meta.dirname,'src/core/rules/index.ts'),formats:['es'],fileName:()=> 'go-club-rules.mjs'},sourcemap:true,minify:false}});

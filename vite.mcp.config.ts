import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: true,
    minify: false,
    outDir: 'dist-mcp',
    rollupOptions: {
      output: {
        entryFileNames: 'videobrain-mcp.mjs',
        format: 'es',
      },
    },
    sourcemap: false,
    ssr: 'server/mcpStdio.ts',
    target: 'node22',
  },
  ssr: {
    noExternal: true,
  },
});

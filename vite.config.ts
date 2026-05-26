import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, writeFileSync, readFileSync } from 'fs';

const isFirefox = process.env.MODE === 'firefox';
const isChrome = process.env.MODE === 'chrome';
const outDir = isFirefox ? 'dist-firefox' : isChrome ? 'dist-chrome' : 'dist';

export default defineConfig(({ mode }) => {
  const firefox = mode === 'firefox';
  const dev = mode === 'development';

  return {
    plugins: [
      react(),
      {
        name: 'copy-manifest-and-assets',
        closeBundle() {
          // Copy appropriate manifest
          const manifestSrc = firefox
            ? 'manifests/manifest.firefox.json'
            : 'manifests/manifest.chrome.json';
          const dest = outDir;
          if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
          copyFileSync(manifestSrc, `${dest}/manifest.json`);

          // Copy static assets
          ['icons', 'fonts'].forEach((dir) => {
            if (existsSync(`public/${dir}`)) {
              copyDirSync(`public/${dir}`, `${dest}/${dir}`);
            }
          });

          console.warn(`[SSS] Built for ${firefox ? 'Firefox' : 'Chrome/Edge'} → ${dest}/`);
        }
      }
    ],
    define: {
      __FIREFOX__: JSON.stringify(firefox),
      __DEV__: JSON.stringify(dev),
      __VERSION__: JSON.stringify('1.0.0')
    },
    build: {
      outDir,
      emptyOutDir: true,
      sourcemap: dev ? 'inline' : false,
      minify: !dev,
      target: 'es2022',
      rollupOptions: {
        input: {
          background: resolve(__dirname, 'src/background/index.ts'),
          content: resolve(__dirname, 'src/content/index.ts'),
          popup: resolve(__dirname, 'src/popup/popup.html'),
          options: resolve(__dirname, 'src/options/options.html'),
        },
        output: {
          entryFileNames: '[name]/index.js',
          chunkFileNames: 'shared/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        }
      }
    },
    resolve: {
      alias: { '@': resolve(__dirname, 'src') }
    }
  };
});

function copyDirSync(src: string, dest: string) {
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  const { readdirSync, statSync } = require('fs') as typeof import('fs');
  for (const entry of readdirSync(src)) {
    const s = `${src}/${entry}`, d = `${dest}/${entry}`;
    if (statSync(s).isDirectory()) copyDirSync(s, d);
    else copyFileSync(s, d);
  }
}

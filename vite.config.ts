import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';

function copyDirSync(src: string, dest: string) {
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const s = `${src}/${entry}`, d = `${dest}/${entry}`;
    if (statSync(s).isDirectory()) copyDirSync(s, d);
    else copyFileSync(s, d);
  }
}

export default defineConfig(({ mode }) => {
  const firefox = mode === 'firefox';
  const dev = mode === 'development';
  const outDir = firefox ? 'dist-firefox' : mode === 'chrome' ? 'dist-chrome' : 'dist';

  return {
    plugins: [
      react(),
      {
        name: 'sss-copy-manifest',
        closeBundle() {
          if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
          const manifestSrc = firefox
            ? 'manifests/manifest.firefox.json'
            : 'manifests/manifest.chrome.json';
          copyFileSync(manifestSrc, `${outDir}/manifest.json`);
          if (existsSync('public/icons')) copyDirSync('public/icons', `${outDir}/icons`);
          console.warn(`[SSS] built for ${firefox ? 'Firefox' : 'Chrome/Edge'} → ${outDir}/`);
        },
      },
    ],
    define: {
      __FIREFOX__: JSON.stringify(firefox),
      __DEV__: JSON.stringify(dev),
      __VERSION__: JSON.stringify('1.0.0'),
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
        },
      },
    },
    resolve: {
      alias: { '@': resolve(__dirname, 'src') },
    },
  };
});

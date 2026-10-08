import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Version aus manifest.json – dieselbe, die HA für die Integration anzeigt
const manifest: unknown = JSON.parse(
  readFileSync(
    path.resolve(import.meta.dirname, '../custom_components/pulse/manifest.json'),
    'utf8'
  )
);
const version = String(Reflect.get(Object(manifest), 'version') ?? '');

// Ein ES-Modul, das HA als Panel lädt – direkt in die Integration gebaut
export default defineConfig({
  define: {
    __PULSE_VERSION__: JSON.stringify(version),
  },
  build: {
    outDir: path.resolve(import.meta.dirname, '../custom_components/pulse/www'),
    emptyOutDir: true,
    sourcemap: false,
    lib: {
      entry: { 'pulse-panel': path.resolve(import.meta.dirname, 'src/pulse-panel.ts') },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
  test: {
    environment: 'node',
  },
});

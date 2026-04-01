import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@utils': path.resolve(__dirname, './utils'),
      '@components': path.resolve(__dirname, './components'),
      '@styles': path.resolve(__dirname, './styles'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      '@supabase/supabase-js', 
      'react', 
      'react-dom',
      'jspdf',
    ],
    esbuildOptions: {
      target: 'es2020',
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});

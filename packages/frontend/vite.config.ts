import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    // Bundle analyzer (only in build mode)
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Enable code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
          'query-vendor': ['@tanstack/react-query'],
          'chart-vendor': ['recharts'],
          // Route-based chunks
          'auth-pages': [
            './src/pages/auth/LoginPage',
            './src/pages/auth/RegisterPage',
            './src/pages/auth/ForgotPasswordPage',
            './src/pages/auth/ResetPasswordPage',
          ],
          'dashboard-pages': [
            './src/pages/dashboard/DashboardPage',
            './src/pages/dashboard/ParentDashboardPage',
          ],
          'test-pages': [
            './src/pages/test/TestBrowserPage',
            './src/pages/test/TestTakingPage',
            './src/pages/test/TestResultPage',
          ],
          'parent-pages': [
            './src/pages/parent/ProgressPage',
            './src/pages/parent/ControlsPage',
            './src/pages/parent/ActivityLogPage',
          ],
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
    // Source maps for production debugging
    sourcemap: false,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@reduxjs/toolkit',
      'react-redux',
      '@tanstack/react-query',
      'axios',
    ],
  },
});

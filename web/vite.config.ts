import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  // Local API server URL for proxying
  const apiTarget = env.VITE_LOCAL_API_URL || 'http://localhost:3000'
  
  const base = {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@/components': path.resolve(__dirname, './src/components'),
        '@/pages': path.resolve(__dirname, './src/pages'),
        '@/utils': path.resolve(__dirname, './src/utils'),
        '@/config': path.resolve(__dirname, './src/config'),
        '@/types': path.resolve(__dirname, './src/types'),
      },
    },
    build: {
      sourcemap: true,
      // Use esbuild minifier (default). Terser is optional and not installed on Render by default.
      minify: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            motion: ['framer-motion'],
            utils: ['date-fns'],
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'framer-motion'],
    },
    // esbuild options (applies to build minification as well)
    esbuild: {
      drop: ['console', 'debugger'],
    },
  }

  // Only configure HTTPS/proxy for the dev server (not during `vite build` on Render).
  if (command === 'serve') {
    // HTTPS configuration for local development (Secure cookies)
    // Use mkcert to generate local certs:
    //   mkcert -install
    //   cd web && mkcert localhost 127.0.0.1
    const certPath = path.resolve(__dirname, 'localhost.pem')
    const keyPath = path.resolve(__dirname, 'localhost-key.pem')

    const httpsConfig =
      fs.existsSync(certPath) && fs.existsSync(keyPath)
        ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
        : undefined

    return {
      ...base,
      server: {
        host: '0.0.0.0',
        port: 5173,
        https: httpsConfig,
        proxy: {
          '/api': {
            target: apiTarget,
            changeOrigin: true,
            secure: false,
          },
          '/ws': {
            target: apiTarget.replace('http', 'ws'),
            ws: true,
            changeOrigin: true,
            secure: false,
          },
        },
      },
    }
  }

  return base
})

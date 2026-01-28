import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  // Local API server URL for proxying
  const apiTarget = env.VITE_LOCAL_API_URL || 'http://localhost:3000'
  
  // HTTPS configuration for local development (Secure cookies)
  // Use mkcert to generate local certs: npx mkcert-cli localhost 127.0.0.1
  // This creates localhost.pem and localhost-key.pem in the project root
  const httpsConfig = (() => {
    const certPath = path.resolve(__dirname, 'localhost.pem')
    const keyPath = path.resolve(__dirname, 'localhost-key.pem')
    
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      console.log('🔒 HTTPS enabled with local certificates')
      return {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      }
    }
    
    // If no certs found, show instructions
    console.log('⚠️  No local HTTPS certificates found.')
    console.log('   To enable HTTPS for Secure cookie testing:')
    console.log('   1. npm install -g mkcert')
    console.log('   2. mkcert -install')
    console.log('   3. cd web && mkcert localhost 127.0.0.1')
    console.log('   4. Restart vite dev server')
    console.log('')
    return false
  })()
  
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      // Enable HTTPS if certificates are available
      https: httpsConfig || undefined,
      // Proxy API and WebSocket requests to local backend
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false, // Allow self-signed certs on backend
        },
        '/ws': {
          target: apiTarget.replace('http', 'ws'),
          ws: true,
          changeOrigin: true,
          secure: false,
        },
      },
    },
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
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            motion: ['framer-motion'],
            utils: ['lodash', 'date-fns'],
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
  }
})

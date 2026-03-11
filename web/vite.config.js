import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        cssCodeSplit: true,
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks: {
                    react: ['react', 'react-dom', 'react-router-dom'],
                    maps: ['leaflet', 'react-leaflet'],
                    charts: ['recharts'],
                    motion: ['framer-motion'],
                    icons: ['lucide-react'],
                },
            },
        },
    },
    server: {
        port: 4000,
        strictPort: true,
        allowedHosts: [
            'dea67358be9f.ngrok-free.app',
            '.ngrok-free.app', // Allow all ngrok free subdomains
        ],
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:4001',
                changeOrigin: true,
            },
        },
    },
})

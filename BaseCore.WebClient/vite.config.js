import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        proxy: {
            '/api/auth': {
                target: 'http://localhost:5002',
                changeOrigin: true,
                secure: false,
            },
            '/api/users': {
                target: 'http://localhost:5002',
                changeOrigin: true,
                secure: false,
            },
            '/api/roles': {
                target: 'http://localhost:5002',
                changeOrigin: true,
                secure: false,
            },
            '/api': {
                target: 'http://localhost:5001',
                changeOrigin: true,
                secure: false,
                configure: (proxy, options) => {
                    proxy.on('error', (err, req, res) => {
                        console.log('Proxy error:', err.message);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: 'Backend not available. Make sure APIService is running on port 5001 and AuthService on port 5002' }));
                    });
                }
            }
        }
    }
})

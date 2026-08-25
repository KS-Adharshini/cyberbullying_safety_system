import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Custom middleware to prevent SPA fallback for /models/ paths
const models404Plugin = () => ({
  name: 'models-404-plugin',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url && req.url.includes('models/')) {
        // If it reaches this middleware, the static file was not found under public/models/
        res.statusCode = 404;
        res.end('Model file not found');
        return;
      }
      next();
    });
  }
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), models404Plugin()],
  server: {
    port: 5173,
    host: true,
    watch: {
      ignored: ['**/public/models/**']
    }
  }
})

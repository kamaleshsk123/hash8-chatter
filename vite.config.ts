import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  
  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(), 
      VitePWA({
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5 MB
        }
      }),
      // Custom plugin to inject env variables into the service worker dynamically
      {
        name: 'inject-sw-env',
        configureServer(server: any) {
          server.middlewares.use((req: any, res: any, next: any) => {
            if (req.url === '/firebase-messaging-sw.js') {
              const swPath = path.resolve(__dirname, "public/firebase-messaging-sw.js");
              let swContent = fs.readFileSync(swPath, "utf-8");
              
              const replacements = {
                VITE_FIREBASE_API_KEY: env.VITE_FIREBASE_API_KEY,
                VITE_FIREBASE_AUTH_DOMAIN: env.VITE_FIREBASE_AUTH_DOMAIN,
                VITE_FIREBASE_PROJECT_ID: env.VITE_FIREBASE_PROJECT_ID,
                VITE_FIREBASE_STORAGE_BUCKET: env.VITE_FIREBASE_STORAGE_BUCKET,
                VITE_FIREBASE_MESSAGING_SENDER_ID: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
                VITE_FIREBASE_APP_ID: env.VITE_FIREBASE_APP_ID,
              };

              Object.entries(replacements).forEach(([key, value]) => {
                swContent = swContent.replace(new RegExp(key, 'g'), value || '');
              });

              res.setHeader('Content-Type', 'application/javascript');
              res.end(swContent);
              return;
            }
            next();
          });
        }
      }
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

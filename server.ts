import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { createApiApp } from './server/app.ts';
import { SERVER_CONFIG, logServerError } from './server/config.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer(): Promise<void> {
  const app = createApiApp();
  const parsedPort = Number(process.env.PORT);
  const port =
    Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535
      ? parsedPort
      : SERVER_CONFIG.defaultPort;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Urban Air Quality Assistant listening on http://localhost:${port}`);
  });

  const shutdown = (signal: string): void => {
    console.log(`Received ${signal}; shutting down gracefully.`);
    server.close(() => {
      process.exit(0);
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((error) => {
  logServerError('server.startup', error);
  process.exit(1);
});

import { createServer } from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { startScheduler } from './jobs/scheduler';
import { createSocketServer } from './realtime/io';

const bootstrap = async () => {
  const app = createApp();
  const httpServer = createServer(app);
  const io = createSocketServer(httpServer);
  const scheduler = startScheduler();

  httpServer.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'velozity api listening');
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    scheduler.stop();
    io.close();
    httpServer.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
};

bootstrap().catch((err) => {
  logger.error({ err }, 'failed to start api');
  process.exit(1);
});

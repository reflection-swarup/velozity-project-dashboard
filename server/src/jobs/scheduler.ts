import cron from 'node-cron';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { flagOverdueTasks } from './overdue.job';

let running = false;

const runOverdueSweep = async () => {
  if (running) {
    logger.warn('skipping overdue sweep, previous run still in flight');
    return;
  }

  running = true;
  try {
    await flagOverdueTasks();
  } catch (err) {
    logger.error({ err }, 'overdue sweep failed');
  } finally {
    running = false;
  }
};

export const startScheduler = () => {
  if (!cron.validate(env.OVERDUE_CRON)) {
    throw new Error(`OVERDUE_CRON is not a valid cron expression: ${env.OVERDUE_CRON}`);
  }

  const task = cron.schedule(env.OVERDUE_CRON, runOverdueSweep);
  logger.info({ schedule: env.OVERDUE_CRON }, 'overdue scheduler started');

  void runOverdueSweep();

  return task;
};

import type { PrismaClient } from '@prisma/client';

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

type LogMetadata = Record<string, unknown>;

type LogEntry = {
  level: LogLevel;
  message: string;
  stack?: string;
  source: string;
  metadata?: LogMetadata;
};

export class AppLogger {
  private prisma: PrismaClient | null = null;

  initialize(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  private getServerLogDelegate() {
    return (this.prisma as any)?.serverLog;
  }

  private normalizeError(error?: Error | unknown) {
    const normalized: { stack?: string; metadata: LogMetadata } = { metadata: {} };

    if (!error) {
      return normalized;
    }

    if (error instanceof Error) {
      normalized.stack = error.stack;
      normalized.metadata.errorName = error.name;
      normalized.metadata.errorMessage = error.message;
      return normalized;
    }

    if (typeof error === 'string') {
      normalized.stack = error;
      return normalized;
    }

    normalized.metadata.errorDetails = String(error);
    return normalized;
  }

  info(message: string, source = 'general', metadata?: LogMetadata) {
    this.log({ level: 'INFO', message, source, metadata });
  }

  warn(message: string, source = 'general', metadata?: LogMetadata) {
    this.log({ level: 'WARN', message, source, metadata });
  }

  error(message: string, source = 'general', error?: Error | unknown, metadata?: LogMetadata) {
    const normalized = this.normalizeError(error);
    const errorMetadata = {
      ...(metadata || {}),
      ...normalized.metadata,
    };

    this.log({
      level: 'ERROR',
      message,
      source,
      stack: normalized.stack,
      metadata: errorMetadata,
    });
  }

  private log(entry: LogEntry) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${entry.level}] [${entry.source}] ${entry.message}`;

    if (entry.level === 'INFO') {
      console.log(logMessage, entry.metadata || '');
    } else if (entry.level === 'WARN') {
      console.warn(logMessage, entry.metadata || '');
      if (entry.stack) console.warn(entry.stack);
    } else {
      console.error(logMessage, entry.metadata || '');
      if (entry.stack) console.error(entry.stack);
    }

    if (this.prisma) {
      this.storeLogAsync(entry).catch((err) => {
        console.error(`[${timestamp}] [ERROR] [logger] Failed to store log in database:`, err);
      });
    }
  }

  private async storeLogAsync(entry: LogEntry) {
    if (!this.prisma) return;
    const serverLog = this.getServerLogDelegate();
    if (!serverLog) return;

    try {
      await serverLog.create({
        data: {
          level: entry.level as any,
          message: entry.message,
          stack: entry.stack || null,
          source: entry.source,
          metadata: entry.metadata || null,
        },
      });
    } catch {
    }
  }

  async fetchLogs(options?: {
    level?: LogLevel;
    source?: string;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }) {
    if (!this.prisma) {
      throw new Error('Logger not initialized with Prisma client');
    }

    const serverLog = this.getServerLogDelegate();
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    if (!serverLog) {
      return { logs: [], total: 0, limit, offset };
    }

    const whereClause: any = {};

    if (options?.level) {
      whereClause.level = options.level;
    }

    if (options?.source) {
      whereClause.source = options.source;
    }

    if (options?.startDate || options?.endDate) {
      whereClause.createdAt = {};
      if (options.startDate) whereClause.createdAt.gte = options.startDate;
      if (options.endDate) whereClause.createdAt.lte = options.endDate;
    }

    const [logs, total] = await Promise.all([
      serverLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      serverLog.count({ where: whereClause }),
    ]);

    return { logs, total, limit, offset };
  }

  async getStats() {
    if (!this.prisma) {
      throw new Error('Logger not initialized with Prisma client');
    }

    const serverLog = this.getServerLogDelegate();
    if (!serverLog) {
      return { totalLogs: 0, errorCount: 0, warnCount: 0, infoCount: 0, bySource: [] };
    }

    const [totalLogs, errorCount, warnCount, infoCount, sourceStats] = await Promise.all([
      serverLog.count(),
      serverLog.count({ where: { level: 'ERROR' } }),
      serverLog.count({ where: { level: 'WARN' } }),
      serverLog.count({ where: { level: 'INFO' } }),
      serverLog.groupBy({
        by: ['source'],
        _count: true,
        orderBy: { _count: { source: 'desc' } },
      }),
    ]);

    return {
      totalLogs,
      errorCount,
      warnCount,
      infoCount,
      bySource: sourceStats.map((stat: any) => ({ source: stat.source, count: stat._count })),
    };
  }

  async clearOldLogs(daysToKeep = 30) {
    if (!this.prisma) {
      throw new Error('Logger not initialized with Prisma client');
    }

    const serverLog = this.getServerLogDelegate();
    if (!serverLog) {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await serverLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return result.count;
  }
}

export function createLogger() {
  return new AppLogger();
}

type ProcessLoggingOptions = {
  sourcePrefix?: string;
  rethrowUncaught?: boolean;
};

export function initializeProcessLogging(logger: AppLogger, options?: ProcessLoggingOptions) {
  const sourcePrefix = options?.sourcePrefix || 'process';
  const processLike = (globalThis as { process?: unknown }).process as
    | { on?: (event: string, listener: (...args: unknown[]) => void) => unknown }
    | undefined;

  if (!processLike || typeof processLike.on !== 'function') {
    logger.warn(
      'Process event handlers are unavailable in this runtime; skipping process-level logging hooks',
      `${sourcePrefix}/init`
    );
    return;
  }

  processLike.on('uncaughtException', (error: unknown) => {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    logger.error('Uncaught exception', `${sourcePrefix}/uncaughtException`, normalizedError, {
      fatal: true,
    });

    if (options?.rethrowUncaught ?? true) {
      throw normalizedError;
    }
  });

  processLike.on('unhandledRejection', (reason: Error | string | unknown) => {
    logger.error(
      'Unhandled promise rejection',
      `${sourcePrefix}/unhandledRejection`,
      reason instanceof Error ? reason : new Error(String(reason)),
      { reason: String(reason) }
    );
  });

  processLike.on('warning', (warning: unknown) => {
    const normalizedWarning = warning instanceof Error ? warning : new Error(String(warning));
    logger.warn(`Process warning: ${normalizedWarning.message}`, `${sourcePrefix}/warning`, {
      warningName: normalizedWarning.name,
      warningMessage: normalizedWarning.message,
      warningStack: normalizedWarning.stack,
      code: (normalizedWarning as any).code,
    });
  });

  processLike.on('SIGTERM', () => {
    logger.info('Received SIGTERM signal, graceful shutdown initiated', `${sourcePrefix}/shutdown`);
  });

  processLike.on('SIGINT', () => {
    logger.info('Received SIGINT signal, graceful shutdown initiated', `${sourcePrefix}/shutdown`);
  });
}

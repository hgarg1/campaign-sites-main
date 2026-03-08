import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  const baseUrl = process.env.DATABASE_URL ?? '';

  // Vercel serverless functions each run in their own V8 isolate. Without
  // connection_limit=1 each isolate spawns a full connection pool, quickly
  // exhausting the Prisma Postgres connection limit and causing
  // PrismaClientInitializationError. connection_limit=1 is Prisma's explicit
  // recommendation for serverless deployments.
  const url =
    baseUrl && !baseUrl.includes('connection_limit')
      ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}connection_limit=1&pool_timeout=10&connect_timeout=15`
      : baseUrl;

  return new PrismaClient({
    datasourceUrl: url || undefined,
    log: process.env.NODE_ENV === 'development'
      ? [{ emit: 'stdout', level: 'error' }, { emit: 'stdout', level: 'warn' }]
      : [{ emit: 'stdout', level: 'error' }],
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = global.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

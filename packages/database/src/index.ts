import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  const baseUrl = process.env.DATABASE_URL ?? '';

  // connection_limit=1 is Prisma's recommended setting for serverless deployments
  // (Vercel, Lambda, etc). Without it, each function instance spawns a full pool
  // and quickly exhausts the Prisma Postgres connection limit.
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

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export { PrismaClient } from '@prisma/client';
export * from '@prisma/client';

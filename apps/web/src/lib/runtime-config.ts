export function isExternalServicesEnabled() {
  const explicit = process.env.ENABLE_EXTERNAL_SERVICES;

  if (explicit === 'true') {
    return true;
  }

  if (explicit === 'false') {
    return false;
  }

  return process.env.NODE_ENV !== 'production';
}

export function isDatabaseEnabled() {
  const explicit = process.env.ENABLE_DATABASE;

  if (explicit === 'true') {
    return true;
  }

  if (explicit === 'false') {
    return false;
  }

  return Boolean(
    process.env.DATABASE_URL ||
    process.env.PRISMA_DATABASE_URL ||
    process.env.POSTGRES_URL
  );
}

export function isRedisEnabled() {
  const explicit = process.env.ENABLE_REDIS;

  if (explicit === 'true') {
    return true;
  }

  if (explicit === 'false') {
    return false;
  }

  return Boolean(process.env.REDIS_URL);
}

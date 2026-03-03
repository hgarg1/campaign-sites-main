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
  return isExternalServicesEnabled() && process.env.ENABLE_DATABASE !== 'false';
}

export function isRedisEnabled() {
  return isExternalServicesEnabled() && process.env.ENABLE_REDIS !== 'false';
}

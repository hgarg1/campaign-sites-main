/**
 * Reader for the SystemConfig key-value store.
 *
 * Lives in its own module so both the governance engine and the proxy module
 * can use it without importing each other — governance calls into proxy for the
 * concentration check, and proxy needs config for its limits.
 */

import { prisma } from '@/lib/database';

export async function getSystemConfigValue(key: string, defaultValue: number): Promise<number> {
  const row = await prisma.systemConfig.findUnique({ where: { key } });
  if (!row) return defaultValue;
  const parsed = Number(row.value);
  return isNaN(parsed) ? defaultValue : parsed;
}

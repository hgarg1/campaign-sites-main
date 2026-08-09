/**
 * Scheduled maintenance for time-bound governance and RBAC state.
 *
 * `expireStaleProposals` and `cleanupExpiredOverrides` existed but had no caller,
 * so proposal TTLs were only enforced lazily when somebody happened to vote — a
 * proposal nobody voted on stayed PENDING_VOTES indefinitely and kept counting
 * toward the pending badge and governance stats.
 *
 * Invoked by the Vercel cron declared in vercel.json. This route lives under
 * /api, which middleware does not cover, so it authenticates itself against
 * CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { expireStaleProposals } from '@/lib/governance';
import { cleanupExpiredOverrides } from '@/lib/rbac';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // Without a configured secret the endpoint stays closed rather than open.
  if (!secret) return false;

  const header = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [expiredProposals, removedOverrides] = await Promise.all([
      expireStaleProposals(),
      cleanupExpiredOverrides(),
    ]);

    logger.info('Governance sweep completed', 'cron', {
      expiredProposals,
      removedOverrides,
    });

    return NextResponse.json({ expiredProposals, removedOverrides });
  } catch (error) {
    logger.error('Governance sweep failed', 'cron', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Sweep failed' }, { status: 500 });
  }
}

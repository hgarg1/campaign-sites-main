import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminSnapshot,
  getPaginatedJobs,
  getPaginatedOrganizations,
  getPaginatedUsers,
  getPaginatedWebsites,
} from '@/lib/admin-live';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const resource = searchParams.get('resource') || 'all';
  const forceRefresh = searchParams.get('refresh') === 'true';

  const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
  const pageSize = Math.max(parseInt(searchParams.get('pageSize') || '20', 10), 1);

  const snapshot = await getAdminSnapshot(forceRefresh);

  switch (resource) {
    case 'users': {
      const result = getPaginatedUsers(snapshot, page, pageSize, {
        role: searchParams.get('role'),
        status: searchParams.get('status'),
        search: searchParams.get('search'),
      });
      return NextResponse.json(result);
    }
    case 'organizations': {
      const result = getPaginatedOrganizations(snapshot, page, pageSize, {
        whiteLabel: searchParams.get('whiteLabel'),
        status: searchParams.get('status'),
        search: searchParams.get('search'),
      });
      return NextResponse.json(result);
    }
    case 'websites': {
      const result = getPaginatedWebsites(snapshot, page, pageSize, {
        status: searchParams.get('status'),
        organizationId: searchParams.get('organizationId'),
        search: searchParams.get('search'),
      });
      return NextResponse.json(result);
    }
    case 'jobs': {
      const result = getPaginatedJobs(snapshot, page, pageSize, {
        status: searchParams.get('status'),
        websiteId: searchParams.get('websiteId'),
      });
      return NextResponse.json(result);
    }
    default:
      return NextResponse.json(snapshot);
  }
}

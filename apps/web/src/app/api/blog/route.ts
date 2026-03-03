import { NextResponse } from 'next/server';
import { prisma } from '@campaignsites/database';
import { cacheGet, cacheSet } from '../../../lib/redis';
import { logger } from '../../../lib/logger';
import { isDatabaseEnabled } from '../../../lib/runtime-config';

export async function GET() {
  try {
    if (!isDatabaseEnabled()) {
      return NextResponse.json([]);
    }
    // Try to get from Redis cache
    const cachedPosts = await cacheGet('blog:posts:v2');
    if (cachedPosts) {
      return NextResponse.json(cachedPosts);
    }

    // Query from database
    const posts = await prisma.blogPost.findMany({
      where: {
        published: true,
      },
      orderBy: {
        publishedAt: 'desc',
      },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        author: true,
        coverImage: true,
        tags: true,
        publishedAt: true,
      },
    });

    // Cache for 1 hour
    await cacheSet('blog:posts:v2', posts, 3600);

    return NextResponse.json(posts);
  } catch (error) {
    logger.error('Failed to fetch blog posts', 'api/blog', error, {
      cacheKey: 'blog:posts:v2',
    });
    // Return empty array on error instead of crashing
    return NextResponse.json([], { status: 500 });
  }
}

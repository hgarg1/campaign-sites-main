import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@campaignsites/database';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawEmail = typeof body?.email === 'string' ? body.email : '';
    const email = rawEmail.trim().toLowerCase();

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const existing = await prisma.blogSubscriber.findUnique({
      where: { email },
      select: { id: true, active: true },
    });

    if (existing) {
      if (!existing.active) {
        await prisma.blogSubscriber.update({
          where: { email },
          data: { active: true, source: 'blog-page' },
        });
      }

      return NextResponse.json({ success: true, message: 'You are already subscribed.' });
    }

    await prisma.blogSubscriber.create({
      data: {
        email,
        active: true,
        source: 'blog-page',
      },
    });

    return NextResponse.json({ success: true, message: 'Thanks! You are subscribed.' });
  } catch (error) {
    console.error('Failed to subscribe to blog newsletter:', error);
    return NextResponse.json(
      { error: 'Could not subscribe right now. Please try again.' },
      { status: 500 }
    );
  }
}

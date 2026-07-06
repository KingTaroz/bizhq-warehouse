import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const start = Date.now();
    const count = await prisma.user.count();
    const time = Date.now() - start;
    
    return NextResponse.json({
      success: true,
      message: 'Database connected successfully!',
      userCount: count,
      timeMs: time,
      envInfo: {
        hasDbUrl: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV,
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
      stack: error.stack,
      envInfo: {
        hasDbUrl: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV,
      }
    }, { status: 500 });
  }
}

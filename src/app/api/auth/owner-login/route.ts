import { NextRequest, NextResponse } from 'next/server';
import { fleetDb } from '@/lib/server/db';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    fleetDb.loginOwner(password);
    return NextResponse.json({
      success: true,
      owner: {
        id: 'owner-admin',
        full_name: 'Fleet Owner',
        role: 'owner',
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid owner password' },
      { status: 401 }
    );
  }
}

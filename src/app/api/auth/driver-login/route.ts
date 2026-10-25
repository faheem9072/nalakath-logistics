import { NextRequest, NextResponse } from 'next/server';
import { fleetDb } from '@/lib/server/db';

export async function POST(req: NextRequest) {
  try {
    const { phone, pin } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 });
    }
    if (!pin) {
      return NextResponse.json({ error: '4-digit PIN is required' }, { status: 400 });
    }

    const driver = fleetDb.loginDriver(phone, pin);
    return NextResponse.json({
      success: true,
      driver: {
        id: driver.id,
        employee_code: driver.employee_code,
        full_name: driver.full_name,
        phone: driver.phone,
        role: 'driver',
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Login failed' },
      { status: 401 }
    );
  }
}

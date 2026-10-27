import { NextRequest, NextResponse } from 'next/server';
import { loginDriverInFirestore } from '@/lib/firebase/firestore-service';


export async function POST(req: NextRequest) {
  try {
    const { phone, pin } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 });
    }
    if (!pin) {
      return NextResponse.json({ error: 'Password / PIN is required' }, { status: 400 });
    }

    const driver = await loginDriverInFirestore(phone, pin);

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

import { NextRequest, NextResponse } from 'next/server';
import {
  generateVehicleExcel,
  generateCompanyExcel,
  generateDriverExcel,
} from '@/lib/utils/excel-builder';
import { dataRepo } from '@/lib/data-service';


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data, month = '2026-10' } = body;

    let buffer: Buffer;
    let filename = 'Report.xlsx';

    if (type === 'vehicle') {
      const regNo = data?.vehicle?.registration_number || 'Vehicle';
      const cleanReg = regNo.replace(/[^a-zA-Z0-9]/g, '_');
      filename = `${cleanReg}_Expenses_${month}.xlsx`;
      buffer = generateVehicleExcel(data, month);
    } else if (type === 'company') {
      const compName = data?.company?.name || 'Company';
      const cleanName = compName.replace(/[^a-zA-Z0-9]/g, '_');
      filename = `${cleanName}_Report_${month}.xlsx`;
      buffer = generateCompanyExcel(data, month);
    } else if (type === 'driver') {
      const driverName = data?.driver?.full_name || 'Driver';
      const cleanName = driverName.replace(/[^a-zA-Z0-9]/g, '_');
      filename = `${cleanName}_Salary_Report_${month}.xlsx`;
      buffer = generateDriverExcel(data, month);
    } else {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: unknown) {
    console.error('Excel Export Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate Excel file' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    const month = searchParams.get('month') || '2026-10';

    if (!type || !id) {
      return NextResponse.json({ error: 'Missing type or id parameter' }, { status: 400 });
    }

    let buffer: Buffer;
    let filename = 'Report.xlsx';

    if (type === 'vehicle') {
      const report = await dataRepo.getVehicleDetail(id, month);
      if (!report) {
        return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
      }
      const cleanReg = report.vehicle.registration_number.replace(/[^a-zA-Z0-9]/g, '_');
      filename = `${cleanReg}_Expenses_${month}.xlsx`;
      buffer = generateVehicleExcel(report, month);
    } else if (type === 'company') {
      const report = await dataRepo.getCompanyMonthlyReport(id, month);
      if (!report) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }
      const cleanName = report.company.name.replace(/[^a-zA-Z0-9]/g, '_');
      filename = `${cleanName}_Report_${month}.xlsx`;
      buffer = generateCompanyExcel(report, month);
    } else if (type === 'driver') {
      const report = await dataRepo.getDriverMonthlySummary(id, month === 'ALL' ? undefined : month);
      if (!report) {
        return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
      }
      const cleanName = report.driver.full_name.replace(/[^a-zA-Z0-9]/g, '_');
      filename = `${cleanName}_Salary_Report_${month}.xlsx`;
      buffer = generateDriverExcel(report, month);
    } else {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: unknown) {
    console.error('Excel Export GET Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate Excel file' },
      { status: 500 }
    );
  }
}

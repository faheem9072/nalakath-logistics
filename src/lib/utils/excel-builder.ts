import zlib from 'zlib';
import { VehicleDetailReport, DriverMonthlySummary } from '@/types/models';
import { CompanyMonthlyReport } from '@/lib/data-service';

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf: Buffer | Uint8Array): number {
  let c = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
}

interface ZipEntry {
  path: string;
  data: Buffer;
}

function createZip(entries: ZipEntry[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const uncompressedData = entry.data;
    const crc = crc32(uncompressedData);
    const compressedData = zlib.deflateRawSync(uncompressedData);
    const useDeflate = compressedData.length < uncompressedData.length;
    const method = useDeflate ? 8 : 0;
    const finalData = useDeflate ? compressedData : uncompressedData;
    const pathBuf = Buffer.from(entry.path, 'utf8');

    const localHeader = Buffer.alloc(30 + pathBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(finalData.length, 18);
    localHeader.writeUInt32LE(uncompressedData.length, 22);
    localHeader.writeUInt16LE(pathBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);
    pathBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, finalData);

    const centralHeader = Buffer.alloc(46 + pathBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(finalData.length, 20);
    centralHeader.writeUInt32LE(uncompressedData.length, 24);
    centralHeader.writeUInt16LE(pathBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    pathBuf.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);

    offset += localHeader.length + finalData.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const ch of centralHeaders) {
    centralDirSize += ch.length;
  }

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

function colName(colIndex: number): string {
  let str = '';
  let temp = colIndex;
  while (temp >= 0) {
    str = String.fromCharCode((temp % 26) + 65) + str;
    temp = Math.floor(temp / 26) - 1;
  }
  return str;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export type CellValue = string | number | null | undefined;
export interface CellConfig {
  value: CellValue;
  style?: 'title' | 'header' | 'bold' | 'data' | 'total' | 'highlight' | 'numData' | 'numBold';
}

export type RowConfig = (CellValue | CellConfig)[];

export interface SheetConfig {
  name: string;
  rows: RowConfig[];
  colWidths?: number[];
}

export function buildWorkbook(sheets: SheetConfig[]): Buffer {
  const contentTypesSheets = sheets
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join('');

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${contentTypesSheets}
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookRels = sheets
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
    )
    .join('');
  const stylesRel = `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${workbookRels}
  ${stylesRel}
</Relationships>`;

  const sheetsXml = sheets
    .map((s, i) => `<sheet name="${escapeXml(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join('');

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheetsXml}
  </sheets>
</workbook>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="11"/><name val="Segoe UI"/></font>
    <font><b/><sz val="11"/><name val="Segoe UI"/></font>
    <font><b/><sz val="14"/><name val="Segoe UI"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF2F4F7"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE2F885"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFD1D5DB"/></left>
      <right style="thin"><color rgb="FFD1D5DB"/></right>
      <top style="thin"><color rgb="FFD1D5DB"/></top>
      <bottom style="thin"><color rgb="FFD1D5DB"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="8">
    <!-- 0: default -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <!-- 1: title -->
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <!-- 2: header -->
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 3: bold cell -->
    <xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>
    <!-- 4: data cell -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
    <!-- 5: total row -->
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <!-- 6: highlight -->
    <xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <!-- 7: numData (right aligned) -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1">
      <alignment horizontal="right"/>
    </xf>
  </cellXfs>
</styleSheet>`;

  const styleMap: Record<string, number> = {
    title: 1,
    header: 2,
    bold: 3,
    data: 4,
    total: 5,
    highlight: 6,
    numData: 7,
    numBold: 5,
  };

  const entries: ZipEntry[] = [
    { path: '[Content_Types].xml', data: Buffer.from(contentTypesXml, 'utf8') },
    { path: '_rels/.rels', data: Buffer.from(rootRelsXml, 'utf8') },
    { path: 'xl/_rels/workbook.xml.rels', data: Buffer.from(workbookRelsXml, 'utf8') },
    { path: 'xl/workbook.xml', data: Buffer.from(workbookXml, 'utf8') },
    { path: 'xl/styles.xml', data: Buffer.from(stylesXml, 'utf8') },
  ];

  sheets.forEach((sheet, sheetIdx) => {
    let rowsXml = '';
    sheet.rows.forEach((row, rowIdx) => {
      const rowNum = rowIdx + 1;
      let cellsXml = '';
      row.forEach((cell, colIdx) => {
        const cellRef = `${colName(colIdx)}${rowNum}`;
        const val = typeof cell === 'object' && cell !== null && 'value' in cell ? cell.value : cell;
        const styleKey = typeof cell === 'object' && cell !== null && 'style' in cell ? cell.style : undefined;

        if (val === null || val === undefined || val === '') {
          if (styleKey && styleMap[styleKey]) {
            cellsXml += `<c r="${cellRef}" s="${styleMap[styleKey]}"/>`;
          }
          return;
        }

        const isNum = typeof val === 'number' && !isNaN(val);
        const resolvedStyle = styleKey ? styleMap[styleKey] : isNum ? 7 : 4;
        const styleAttr = resolvedStyle ? ` s="${resolvedStyle}"` : '';

        if (isNum) {
          cellsXml += `<c r="${cellRef}"${styleAttr}><v>${val}</v></c>`;
        } else {
          cellsXml += `<c r="${cellRef}" t="inlineStr"${styleAttr}><is><t>${escapeXml(String(val))}</t></is></c>`;
        }
      });
      rowsXml += `<row r="${rowNum}">${cellsXml}</row>`;
    });

    let colsXml = '';
    if (sheet.colWidths && sheet.colWidths.length > 0) {
      colsXml =
        '<cols>' +
        sheet.colWidths
          .map((w, ci) => `<col min="${ci + 1}" max="${ci + 1}" width="${w}" customWidth="1"/>`)
          .join('') +
        '</cols>';
    }

    const worksheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  ${colsXml}
  <sheetData>
    ${rowsXml}
  </sheetData>
</worksheet>`;

    entries.push({
      path: `xl/worksheets/sheet${sheetIdx + 1}.xml`,
      data: Buffer.from(worksheetXml, 'utf8'),
    });
  });

  return createZip(entries);
}

// -------------------------------------------------------------
// Excel Generators for Vehicle, Company, and Driver
// -------------------------------------------------------------

export function generateVehicleExcel(report: VehicleDetailReport, month: string): Buffer {
  const v = report.vehicle;
  const entries = report.expenses.entries || [];

  const fuelTotal = report.expenseSummary?.fuelTotal ?? report.expenses?.totals?.fuel ?? 0;
  const tollTotal = report.expenseSummary?.tollTotal ?? report.expenses?.totals?.toll ?? 0;
  const maintTotal =
    report.expenseSummary?.maintenanceTotal ?? report.expenses?.totals?.maintenance ?? 0;
  const grandTotal =
    report.expenseSummary?.totalExpense ?? report.expenses?.totals?.grandTotal ?? 0;

  const rows: RowConfig[] = [
    [{ value: `VEHICLE EXPENSE REPORT - ${v.registration_number}`, style: 'title' }],
    [{ value: `Month: ${month}`, style: 'bold' }],
    [],
    // Vehicle Details Section
    [{ value: 'VEHICLE DETAILS', style: 'header' }, '', '', '', ''],
    [{ value: 'Vehicle Registration', style: 'bold' }, v.registration_number, '', { value: 'Make & Model', style: 'bold' }, v.make_model],
    [{ value: 'Client Company', style: 'bold' }, v.company || 'Delhivery', '', { value: 'Vehicle Type', style: 'bold' }, v.vehicle_type],
    [{ value: 'Route / Location', style: 'bold' }, v.route_location || 'Ad-hoc route', '', { value: 'Current Odometer', style: 'bold' }, `${v.current_odometer.toLocaleString()} km`],
    [],
    // Expenses Summary Section
    [{ value: 'MONTHLY EXPENSE SUMMARY', style: 'header' }, '', '', '', ''],
    [{ value: 'Expense Category', style: 'header' }, { value: 'Total Amount (₹)', style: 'header' }, '', '', ''],
    [{ value: 'Total Fuel', style: 'bold' }, { value: fuelTotal, style: 'numBold' }, '', '', ''],
    [{ value: 'Total Toll', style: 'bold' }, { value: tollTotal, style: 'numBold' }, '', '', ''],
    [{ value: 'Total Maintenance', style: 'bold' }, { value: maintTotal, style: 'numBold' }, '', '', ''],
    [{ value: 'Total Expense', style: 'highlight' }, { value: grandTotal, style: 'highlight' }, '', '', ''],
    [],
    // Expenses Itemized List
    [{ value: `ITEMIZED EXPENSES LIST (${entries.length} records)`, style: 'header' }, '', '', '', ''],
    [
      { value: 'Date', style: 'header' },
      { value: 'Driver Name', style: 'header' },
      { value: 'Expense Type', style: 'header' },
      { value: 'Amount (₹)', style: 'header' },
      { value: 'Note / Remarks', style: 'header' },
    ],
  ];

  if (entries.length === 0) {
    rows.push([{ value: 'No expenses recorded for this month', style: 'data' }, '', '', '', '']);
  } else {
    for (const exp of entries) {
      const expDate = exp.date || (exp.created_at ? exp.created_at.slice(0, 10) : 'N/A');
      const driverName = exp.driver?.full_name || 'Assigned Driver';
      rows.push([
        { value: expDate, style: 'data' },
        { value: driverName, style: 'data' },
        { value: exp.expense_type, style: 'data' },
        { value: exp.amount, style: 'numData' },
        { value: exp.note || (exp.litres ? `${exp.litres} Litres` : '-'), style: 'data' },
      ]);
    }

    // Totals row at the bottom of the table
    rows.push([
      { value: 'Total', style: 'total' },
      '',
      '',
      { value: grandTotal, style: 'highlight' },
      '',
    ]);
  }

  return buildWorkbook([
    {
      name: 'Expenses',
      colWidths: [18, 24, 20, 16, 32],
      rows,
    },
  ]);
}

export function generateCompanyExcel(report: CompanyMonthlyReport, month: string): Buffer {
  const c = report.company;
  const vehicles = report.vehicles || [];

  const rows: RowConfig[] = [
    [{ value: `COMPANY PERFORMANCE REPORT - ${c.name}`, style: 'title' }],
    [{ value: `Month: ${month}`, style: 'bold' }],
    [],
    // Company Header / Totals
    [{ value: 'COMPANY PERFORMANCE TOTALS', style: 'header' }, '', '', '', '', '', '', '', '', ''],
    [{ value: 'Company Name', style: 'bold' }, c.name, '', { value: 'Vehicles Under Contract', style: 'bold' }, report.vehiclesCount],
    [{ value: 'Contact Person', style: 'bold' }, c.contact_person || 'N/A', '', { value: 'Contact Phone', style: 'bold' }, c.contact_phone || 'N/A'],
    [],
    [
      { value: 'Total Income (₹)', style: 'bold' },
      { value: report.totalIncome, style: 'numBold' },
      '',
      { value: 'Total Expenses (₹)', style: 'bold' },
      { value: report.totalExpenses, style: 'numBold' },
      '',
      { value: 'Net Profit / Loss (₹)', style: 'bold' },
      { value: report.profitOrLoss, style: 'highlight' },
    ],
    [],
    // Vehicle Breakdown Table
    [{ value: `VEHICLES UNDER CONTRACT (${vehicles.length})`, style: 'header' }, '', '', '', '', '', '', '', '', ''],
    [
      { value: 'Vehicle Number', style: 'header' },
      { value: 'Make & Model', style: 'header' },
      { value: 'Trips', style: 'header' },
      { value: 'Total KM', style: 'header' },
      { value: 'Fuel (₹)', style: 'header' },
      { value: 'Toll (₹)', style: 'header' },
      { value: 'Maintenance (₹)', style: 'header' },
      { value: 'Total Expense (₹)', style: 'header' },
      { value: 'Income (₹)', style: 'header' },
      { value: 'Profit/Loss (₹)', style: 'header' },
    ],
  ];

  let sumTrips = 0;
  let sumKm = 0;
  let sumFuel = 0;
  let sumToll = 0;
  let sumMaint = 0;
  let sumExp = 0;
  let sumInc = 0;
  let sumProfit = 0;

  if (vehicles.length === 0) {
    rows.push([{ value: 'No vehicles under this company for this period', style: 'data' }]);
  } else {
    for (const v of vehicles) {
      sumTrips += v.tripsCount || 0;
      sumKm += v.totalKm || 0;
      sumFuel += v.fuelExpense || 0;
      sumToll += v.tollExpense || 0;
      sumMaint += v.maintenanceExpense || 0;
      sumExp += v.totalExpense || 0;
      sumInc += v.income || 0;
      sumProfit += v.profitOrLoss || 0;

      rows.push([
        { value: v.vehicle.registration_number, style: 'bold' },
        { value: v.vehicle.make_model, style: 'data' },
        { value: v.tripsCount, style: 'numData' },
        { value: v.totalKm, style: 'numData' },
        { value: v.fuelExpense, style: 'numData' },
        { value: v.tollExpense, style: 'numData' },
        { value: v.maintenanceExpense, style: 'numData' },
        { value: v.totalExpense, style: 'numData' },
        { value: v.income, style: 'numData' },
        { value: v.profitOrLoss, style: v.profitOrLoss >= 0 ? 'numBold' : 'highlight' },
      ]);
    }

    // Company Summary Row matching screen figures exactly
    rows.push([
      { value: 'Company Totals', style: 'total' },
      '',
      { value: sumTrips, style: 'total' },
      { value: sumKm, style: 'total' },
      { value: sumFuel, style: 'total' },
      { value: sumToll, style: 'total' },
      { value: sumMaint, style: 'total' },
      { value: report.totalExpenses, style: 'total' },
      { value: report.totalIncome, style: 'total' },
      { value: report.profitOrLoss, style: 'highlight' },
    ]);
  }

  return buildWorkbook([
    {
      name: 'Company Performance',
      colWidths: [20, 24, 12, 14, 14, 14, 16, 18, 16, 18],
      rows,
    },
  ]);
}

export function generateDriverExcel(summary: DriverMonthlySummary, month: string): Buffer {
  const d = summary.driver;
  const vb = summary.vehiclesBreakdown || [];
  const trips = summary.tripDetails || [];

  const rows: RowConfig[] = [
    [{ value: `DRIVER MONTHLY SALARY REPORT - ${d.full_name}`, style: 'title' }],
    [{ value: `Month: ${month}`, style: 'bold' }],
    [],
    // Driver Details & Monthly Summary (Salary Basis)
    [{ value: 'DRIVER DETAILS & SALARY METRICS', style: 'header' }, '', '', '', '', '', ''],
    [{ value: 'Driver Name', style: 'bold' }, d.full_name, '', { value: 'Phone Number', style: 'bold' }, d.phone],
    [{ value: 'Employee Code', style: 'bold' }, d.employee_code || d.id, '', { value: 'Month / Period', style: 'bold' }, month],
    [],
    [
      { value: 'Trips This Month', style: 'header' },
      { value: 'Days Worked', style: 'header' },
      { value: 'Total KM Run', style: 'header' },
      '',
      '',
      '',
      '',
    ],
    [
      { value: summary.totalTripsCount, style: 'numBold' },
      { value: summary.totalDaysWorked, style: 'numBold' },
      { value: summary.totalKilometers, style: 'highlight' },
      '',
      '',
      '',
      '',
    ],
    [],
    // Vehicles Driven Table
    [{ value: `VEHICLES DRIVEN THIS MONTH (${vb.length})`, style: 'header' }, '', '', '', '', '', ''],
    [
      { value: 'Vehicle Number', style: 'header' },
      { value: 'Make & Model', style: 'header' },
      { value: 'Trips Driven', style: 'header' },
      { value: 'Total KM Run', style: 'header' },
      '',
      '',
      '',
    ],
  ];

  if (vb.length === 0) {
    rows.push([{ value: 'No vehicle activity recorded this month', style: 'data' }]);
  } else {
    for (const v of vb) {
      rows.push([
        { value: v.vehicle.registration_number, style: 'bold' },
        { value: v.vehicle.make_model, style: 'data' },
        { value: v.tripsCount, style: 'numData' },
        { value: v.totalKm, style: 'numData' },
        '',
        '',
        '',
      ]);
    }
  }

  rows.push([]);
  // Full Trip List Table
  rows.push(
    [{ value: `FULL TRIP LIST FOR SALARY CALCULATION (${trips.length} trips)`, style: 'header' }, '', '', '', '', '', ''],
    [
      { value: 'Date', style: 'header' },
      { value: 'Vehicle Number', style: 'header' },
      { value: 'Start KM', style: 'header' },
      { value: 'End KM', style: 'header' },
      { value: 'KM Run', style: 'header' },
      { value: 'Route / Destination', style: 'header' },
      { value: 'Notes / Remarks', style: 'header' },
    ]
  );

  if (trips.length === 0) {
    rows.push([{ value: 'No trips recorded for this month', style: 'data' }]);
  } else {
    for (const t of trips) {
      const destination = t.destination || t.routeName || 'Ad-hoc Route';
      rows.push([
        { value: t.dutyDate, style: 'data' },
        { value: t.vehicleRegistration, style: 'data' },
        { value: t.startOdo ?? '-', style: 'numData' },
        { value: t.endOdo ?? '-', style: 'numData' },
        { value: t.distance, style: 'numBold' },
        { value: destination, style: 'data' },
        { value: t.notes || '-', style: 'data' },
      ]);
    }

    rows.push([
      { value: 'Total KM', style: 'total' },
      '',
      '',
      '',
      { value: summary.totalKilometers, style: 'highlight' },
      '',
      '',
    ]);
  }

  return buildWorkbook([
    {
      name: 'Salary Report',
      colWidths: [16, 20, 14, 14, 14, 26, 26],
      rows,
    },
  ]);
}

import PDFDocument from 'pdfkit';
import { getBusinessTimeString, getBusinessDateString } from '../attendance/autoClockOut';

export interface FuelLogReportItem {
  id: string;
  fuelLogId: string;
  vehicleID: string;
  vehicleName: string;
  date: string;
  liters: number;
  cost: number;
}

export interface ExpenseReportItem {
  id: string;
  expenseId: string;
  vehicleID: string;
  vehicleName: string;
  tripID?: string;
  toll: number;
  other: number;
  maint: number;
  total: number;
  date?: string;
}

export interface FuelExpensePdfReportOptions {
  title?: string;
  generatedBy?: string;
  userRole?: string;
  searchQuery?: string;
  dateRangeText?: string;
}

const inr = (n: number) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;

export function generateFuelExpensePdf(
  fuelLogs: FuelLogReportItem[],
  expenses: ExpenseReportItem[],
  options: FuelExpensePdfReportOptions = {}
): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    margin: 30,
    size: 'A4',
    bufferPages: true,
    autoFirstPage: true,
  });

  const now = new Date();
  const genTimeStr = getBusinessTimeString(now);
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const genDateStr = `${day}/${month}/${year}`;

  // Palette
  const headerBg = '#0B132B';
  const amberAccent = '#F59E0B';
  const amberDark = '#D97706';
  const slateDark = '#1E293B';
  const slateMuted = '#64748B';
  const slateLight = '#94A3B8';
  const borderLight = '#E2E8F0';
  const panelBg = '#F8FAFC';
  const sectionHeaderBg = '#EEF2F6';

  const pageWidth = 535; // 595.28 - 60
  const startX = 30;
  const maxContentY = 780;

  // 1. Premium Header Banner
  doc.rect(startX, 30, pageWidth, 52).fill(headerBg);
  doc.rect(startX, 82, pageWidth, 3).fill(amberAccent);

  doc
    .fillColor(amberAccent)
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('LogiSphere AI', startX + 16, 40);

  doc
    .fillColor('#FFFFFF')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text(options.title || 'FUEL & EXPENSES AUDIT REPORT', startX + 16, 60);

  doc
    .fillColor(slateLight)
    .fontSize(8.5)
    .font('Helvetica')
    .text(
      `Generated: ${genDateStr} at ${genTimeStr}`,
      startX + 260,
      47,
      { align: 'right', width: pageWidth - 276 }
    );

  let currentY = 94;

  // 2. Metrics Summary Tiles
  const totalLiters = fuelLogs.reduce((acc, f) => acc + (Number(f.liters) || 0), 0);
  const totalFuelCost = fuelLogs.reduce((acc, f) => acc + (Number(f.cost) || 0), 0);
  const totalExpensesCost = expenses.reduce((acc, e) => acc + (Number(e.total) || 0), 0);
  const grandTotal = totalFuelCost + totalExpensesCost;

  const tileWidth = (pageWidth - 12) / 4;
  const metrics = [
    { label: 'FUEL LOGS', value: `${fuelLogs.length} Entries` },
    { label: 'TOTAL LITERS', value: `${totalLiters.toLocaleString('en-IN')} L` },
    { label: 'FUEL EXPENDITURE', value: inr(totalFuelCost), highlight: true },
    { label: 'OTHER EXPENSES', value: inr(totalExpensesCost) },
  ];

  metrics.forEach((m, idx) => {
    const x = startX + idx * (tileWidth + 4);
    doc.rect(x, currentY, tileWidth, 30).fill(panelBg).strokeColor(borderLight).stroke();
    doc.fillColor(slateMuted).fontSize(6.5).font('Helvetica-Bold').text(m.label, x + 6, currentY + 4.5);
    doc
      .fillColor(m.highlight ? amberDark : slateDark)
      .fontSize(10.5)
      .font('Helvetica-Bold')
      .text(m.value, x + 6, currentY + 15);
  });

  currentY += 38;

  // Render Subtitle / Filter notice if search or dateRange is set
  if (options.searchQuery || options.dateRangeText) {
    const filterInfo = [
      options.searchQuery ? `Search Filter: "${options.searchQuery}"` : null,
      options.dateRangeText ? `Period: ${options.dateRangeText}` : null,
    ].filter(Boolean).join('  •  ');

    doc
      .fillColor(slateMuted)
      .fontSize(8)
      .font('Helvetica-Oblique')
      .text(filterInfo, startX, currentY);
    currentY += 14;
  }

  // --- SECTION 1: FUEL LOGS ---
  const renderFuelHeader = (y: number) => {
    doc.rect(startX, y, pageWidth, 15).fill('#F1F5F9');
    doc.fillColor(slateMuted).fontSize(7).font('Helvetica-Bold');
    doc.text('#', startX + 8, y + 4, { width: 25 });
    doc.text('DATE', startX + 35, y + 4, { width: 75 });
    doc.text('VEHICLE', startX + 115, y + 4, { width: 170 });
    doc.text('LITERS', startX + 290, y + 4, { width: 80, align: 'right' });
    doc.text('TOTAL COST', startX + 380, y + 4, { width: pageWidth - 390, align: 'right' });
  };

  // Section Header Banner
  doc.rect(startX, currentY, pageWidth, 20).fill(sectionHeaderBg).strokeColor(borderLight).stroke();
  doc.fillColor(slateDark).fontSize(9).font('Helvetica-Bold').text(`Fuel Logging Records (${fuelLogs.length})`, startX + 8, currentY + 5);
  doc.fillColor(amberDark).fontSize(8.5).font('Helvetica-Bold').text(`Subtotal: ${inr(totalFuelCost)}`, startX + 300, currentY + 5, {
    align: 'right',
    width: pageWidth - 310,
  });
  currentY += 20;

  renderFuelHeader(currentY);
  currentY += 15;

  if (fuelLogs.length === 0) {
    doc.rect(startX, currentY, pageWidth, 24).fill('#FFFFFF');
    doc.fillColor(slateMuted).fontSize(8).font('Helvetica').text('No fuel logs recorded.', startX + 12, currentY + 7);
    currentY += 24;
  } else {
    fuelLogs.forEach((f, idx) => {
      const rowHeight = 16;
      if (currentY + rowHeight > maxContentY) {
        doc.addPage();
        currentY = 32;
        renderFuelHeader(currentY);
        currentY += 15;
      }

      const isAlt = idx % 2 === 1;
      doc.rect(startX, currentY, pageWidth, rowHeight).fill(isAlt ? '#F8FAFC' : '#FFFFFF');

      doc.fillColor(slateDark).fontSize(7.5).font('Helvetica');
      doc.text(String(idx + 1), startX + 8, currentY + 4, { width: 25 });
      doc.text(String(f.date || 'N/A').slice(0, 10), startX + 35, currentY + 4, { width: 75 });
      doc.text(f.vehicleName || f.vehicleID || 'Vehicle', startX + 115, currentY + 4, { width: 170, ellipsis: true });
      doc.text(`${f.liters} L`, startX + 290, currentY + 4, { width: 80, align: 'right' });
      doc.font('Helvetica-Bold').text(inr(f.cost), startX + 380, currentY + 4, { width: pageWidth - 390, align: 'right' });

      currentY += rowHeight;
    });
  }

  currentY += 14;

  // --- SECTION 2: OTHER EXPENSES ---
  const renderExpenseHeader = (y: number) => {
    doc.rect(startX, y, pageWidth, 15).fill('#F1F5F9');
    doc.fillColor(slateMuted).fontSize(7).font('Helvetica-Bold');
    doc.text('#', startX + 8, y + 4, { width: 25 });
    doc.text('TRIP / PURPOSE', startX + 35, y + 4, { width: 110 });
    doc.text('VEHICLE', startX + 150, y + 4, { width: 120 });
    doc.text('TOLL', startX + 275, y + 4, { width: 55, align: 'right' });
    doc.text('MAINTENANCE', startX + 335, y + 4, { width: 70, align: 'right' });
    doc.text('OTHER', startX + 410, y + 4, { width: 50, align: 'right' });
    doc.text('TOTAL', startX + 465, y + 4, { width: pageWidth - 475, align: 'right' });
  };

  if (currentY + 50 > maxContentY) {
    doc.addPage();
    currentY = 32;
  }

  doc.rect(startX, currentY, pageWidth, 20).fill(sectionHeaderBg).strokeColor(borderLight).stroke();
  doc.fillColor(slateDark).fontSize(9).font('Helvetica-Bold').text(`Other Operational Expenses (${expenses.length})`, startX + 8, currentY + 5);
  doc.fillColor(amberDark).fontSize(8.5).font('Helvetica-Bold').text(`Subtotal: ${inr(totalExpensesCost)}`, startX + 300, currentY + 5, {
    align: 'right',
    width: pageWidth - 310,
  });
  currentY += 20;

  renderExpenseHeader(currentY);
  currentY += 15;

  if (expenses.length === 0) {
    doc.rect(startX, currentY, pageWidth, 24).fill('#FFFFFF');
    doc.fillColor(slateMuted).fontSize(8).font('Helvetica').text('No other expense entries recorded.', startX + 12, currentY + 7);
    currentY += 24;
  } else {
    expenses.forEach((e, idx) => {
      const rowHeight = 16;
      if (currentY + rowHeight > maxContentY) {
        doc.addPage();
        currentY = 32;
        renderExpenseHeader(currentY);
        currentY += 15;
      }

      const isAlt = idx % 2 === 1;
      doc.rect(startX, currentY, pageWidth, rowHeight).fill(isAlt ? '#F8FAFC' : '#FFFFFF');

      doc.fillColor(slateDark).fontSize(7.5).font('Helvetica');
      doc.text(String(idx + 1), startX + 8, currentY + 4, { width: 25 });
      doc.text(e.tripID || 'General Expense', startX + 35, currentY + 4, { width: 110, ellipsis: true });
      doc.text(e.vehicleName || e.vehicleID || 'Vehicle', startX + 150, currentY + 4, { width: 120, ellipsis: true });
      doc.text(inr(e.toll), startX + 275, currentY + 4, { width: 55, align: 'right' });
      doc.text(inr(e.maint), startX + 335, currentY + 4, { width: 70, align: 'right' });
      doc.text(inr(e.other), startX + 410, currentY + 4, { width: 50, align: 'right' });
      doc.font('Helvetica-Bold').text(inr(e.total), startX + 465, currentY + 4, { width: pageWidth - 475, align: 'right' });

      currentY += rowHeight;
    });
  }

  // Grand Total Summary Box
  if (currentY + 36 > maxContentY) {
    doc.addPage();
    currentY = 32;
  } else {
    currentY += 10;
  }

  doc.rect(startX, currentY, pageWidth, 26).fill('#F8FAFC').strokeColor(amberAccent).stroke();
  doc.fillColor(slateDark).fontSize(9.5).font('Helvetica-Bold').text('COMBINED FLEET EXPENDITURE GRAND TOTAL:', startX + 12, currentY + 8);
  doc.fillColor(amberDark).fontSize(11).font('Helvetica-Bold').text(inr(grandTotal), startX + 350, currentY + 7, {
    align: 'right',
    width: pageWidth - 362,
  });

  // Footer on all pages
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    doc.moveTo(startX, 794).lineTo(startX + pageWidth, 794).strokeColor(borderLight).stroke();
    doc
      .fillColor(slateMuted)
      .fontSize(7.5)
      .font('Helvetica')
      .text(
        'Powered by LogiSphere AI • Intelligent Fleet, Fuel & Expense Management • Confidential',
        startX,
        802,
        { width: 370, lineBreak: false }
      );

    doc.text(`Page ${i + 1} of ${totalPages}`, startX + 380, 802, {
      align: 'right',
      width: pageWidth - 380,
      lineBreak: false,
    });

    doc.page.margins.bottom = originalBottomMargin;
  }

  return doc;
}

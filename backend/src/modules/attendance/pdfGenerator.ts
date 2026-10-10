import PDFDocument from 'pdfkit';
import { getBusinessTimeString } from './autoClockOut';

export interface AttendanceSessionReportItem {
  id: string;
  sessionNumber: number;
  clockInTime: string;
  clockOutTime: string | null;
  durationMinutes: number;
  duration: string;
  clockOutType: 'MANUAL' | 'AUTOMATIC' | 'IN_PROGRESS';
  autoClockOut: boolean;
  locationName: string;
  distanceFromOffice: number;
  status: string;
}

export interface GroupedAttendanceReportItem {
  id: string;
  userId: string;
  staffName: string;
  staffEmail: string;
  staffRole: string;
  date: string;
  dateKey: string;
  totalWorkedMinutes: number;
  totalWorkedDuration: string;
  sessionsCount: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'AUTO_CLOSED';
  hasAutoClockOut: boolean;
  sessions: AttendanceSessionReportItem[];
}

export interface PdfReportOptions {
  title?: string;
  generatedBy?: string;
  userRole?: string;
  dateRangeText?: string;
  searchQuery?: string;
  statusFilter?: string;
}

/**
 * Generate a luxury, executive-grade PDF document containing the grouped attendance report.
 * Fits cleanly onto 1 page when data volume permits.
 */
export function generateAttendancePdf(
  reportData: GroupedAttendanceReportItem[],
  options: PdfReportOptions = {}
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

  // Premium Palette
  const headerBg = '#0B132B';
  const amberAccent = '#F59E0B';
  const amberDark = '#D97706';
  const slateDark = '#1E293B';
  const slateMuted = '#64748B';
  const slateLight = '#94A3B8';
  const borderLight = '#E2E8F0';
  const panelBg = '#F8FAFC';
  const groupHeaderBg = '#EEF2F6';

  const pageWidth = 535; // 595.28 - 60
  const startX = 30;
  const maxContentY = 780; // Safety boundary before bottom footer (794)

  // 1. Premium Header Banner
  doc
    .rect(startX, 30, pageWidth, 52)
    .fill(headerBg);

  // Gold accent bottom stripe
  doc
    .rect(startX, 82, pageWidth, 3)
    .fill(amberAccent);

  // Logo Brand Text
  doc
    .fillColor(amberAccent)
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('LogiSphere AI', startX + 16, 40);

  // Document Title
  doc
    .fillColor('#FFFFFF')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text(options.title || 'ATTENDANCE & STAFF HOURS REPORT', startX + 16, 60);

  // Generation timestamp - Clean (NO Asia/Kolkata, NO Scope)
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

  // 2. Executive Metrics Tiles (Compact 30pt)
  const totalStaff = new Set(reportData.map((r) => r.userId)).size;
  const totalDays = reportData.length;
  const totalMinutes = reportData.reduce((acc, r) => acc + r.totalWorkedMinutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const totalSessions = reportData.reduce((acc, r) => acc + r.sessionsCount, 0);
  const totalAutoClosed = reportData.filter((r) => r.hasAutoClockOut).length;

  const tileWidth = (pageWidth - 16) / 5;
  const metrics = [
    { label: 'STAFF LOGGED', value: String(totalStaff) },
    { label: 'ATTENDANCE DAYS', value: String(totalDays) },
    { label: 'TOTAL SESSIONS', value: String(totalSessions) },
    { label: 'TOTAL HOURS', value: `${totalHours} hrs`, highlight: true },
    { label: 'AUTO CLOSED', value: String(totalAutoClosed), alert: totalAutoClosed > 0 },
  ];

  metrics.forEach((m, idx) => {
    const x = startX + idx * (tileWidth + 4);
    doc
      .rect(x, currentY, tileWidth, 30)
      .fill(panelBg)
      .strokeColor(borderLight)
      .stroke();

    doc
      .fillColor(slateMuted)
      .fontSize(6.5)
      .font('Helvetica-Bold')
      .text(m.label, x + 6, currentY + 4.5);

    doc
      .fillColor(m.highlight ? amberDark : m.alert ? '#EF4444' : slateDark)
      .fontSize(10.5)
      .font('Helvetica-Bold')
      .text(m.value, x + 6, currentY + 15);
  });

  currentY += 38;

  // Helper for rendering session table column headers
  const renderTableHeader = (y: number) => {
    doc.rect(startX, y, pageWidth, 14).fill('#F1F5F9');
    doc.fillColor(slateMuted).fontSize(6.5).font('Helvetica-Bold');
    doc.text('#', startX + 8, y + 3.5, { width: 22 });
    doc.text('CLOCK IN', startX + 32, y + 3.5, { width: 68 });
    doc.text('CLOCK OUT', startX + 104, y + 3.5, { width: 68 });
    doc.text('DURATION', startX + 176, y + 3.5, { width: 56 });
    doc.text('CLOCK OUT TYPE', startX + 236, y + 3.5, { width: 95 });
    doc.text('VERIFIED LOCATION & STATUS', startX + 335, y + 3.5, { width: pageWidth - 340 });
  };

  // 3. Data Records Section
  if (reportData.length === 0) {
    doc
      .rect(startX, currentY, pageWidth, 44)
      .fill(panelBg)
      .strokeColor(borderLight)
      .stroke();

    doc
      .fillColor(slateMuted)
      .fontSize(9.5)
      .font('Helvetica')
      .text('No attendance records match the selected criteria.', startX + 16, currentY + 16, {
        align: 'center',
        width: pageWidth - 32,
      });

    currentY += 54;
  } else {
    reportData.forEach((item) => {
      // Calculate group required height
      const groupHeaderH = 22;
      const tableHeaderH = 14;
      const sessionRowH = 16;
      const groupHeight = groupHeaderH + tableHeaderH + item.sessions.length * sessionRowH + 6;

      // Only add page if content would collide with bottom footer and we're not at the top of a page
      if (currentY + groupHeight > maxContentY && currentY > 150) {
        doc.addPage();
        currentY = 32;
      }

      // Group Header Card (Staff Name & Daily Summary)
      doc
        .rect(startX, currentY, pageWidth, groupHeaderH)
        .fill(groupHeaderBg)
        .strokeColor(borderLight)
        .stroke();

      // Left: Staff Name and Role & Date
      doc
        .fillColor(slateDark)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(`${item.staffName}`, startX + 10, currentY + 6, { continued: true })
        .fillColor(slateMuted)
        .font('Helvetica')
        .text(`  •  ${item.staffRole || 'Staff'}  •  Date: ${item.date}  (${item.sessionsCount} session${item.sessionsCount === 1 ? '' : 's'})`);

      // Right: Daily Worked Duration
      doc
        .fillColor(amberDark)
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text(`Total Worked: ${item.totalWorkedDuration}`, startX + 360, currentY + 6, {
          align: 'right',
          width: pageWidth - 366,
        });

      currentY += groupHeaderH;

      // Column Header Row
      renderTableHeader(currentY);
      currentY += tableHeaderH;

      // Individual Sessions
      item.sessions.forEach((s, sIdx) => {
        // If a single session would collide with footer, add page and re-render column headers
        if (currentY + sessionRowH > maxContentY) {
          doc.addPage();
          currentY = 32;
          renderTableHeader(currentY);
          currentY += tableHeaderH;
        }

        const isAlt = sIdx % 2 === 1;
        doc
          .rect(startX, currentY, pageWidth, sessionRowH)
          .fill(isAlt ? '#F8FAFC' : '#FFFFFF');

        doc
          .fillColor(slateDark)
          .fontSize(7.5)
          .font('Helvetica');

        // Session number
        doc.text(`S${s.sessionNumber}`, startX + 8, currentY + 4, { width: 22 });

        // Clock In
        doc.text(s.clockInTime, startX + 32, currentY + 4, { width: 68 });

        // Clock Out
        doc.text(s.clockOutTime || 'Active Shift', startX + 104, currentY + 4, { width: 68 });

        // Duration
        doc.text(s.duration, startX + 176, currentY + 4, { width: 56 });

        // Clock Out Type with status indication
        const isAuto = s.autoClockOut || s.clockOutType === 'AUTOMATIC';
        doc
          .font(isAuto ? 'Helvetica-Bold' : 'Helvetica')
          .fillColor(isAuto ? amberDark : s.clockOutTime ? '#059669' : '#2563EB')
          .text(
            isAuto ? 'Auto (11:59 PM)' : s.clockOutTime ? 'Manual' : 'Active Shift',
            startX + 236,
            currentY + 4,
            { width: 95 }
          );

        // Location & distance
        doc
          .font('Helvetica')
          .fillColor(slateMuted)
          .text(
            `${s.locationName || 'HQ Gate'} (${s.distanceFromOffice}m)`,
            startX + 335,
            currentY + 4,
            { width: pageWidth - 340, ellipsis: true }
          );

        currentY += sessionRowH;
      });

      // Bottom separator rule
      doc
        .moveTo(startX, currentY)
        .lineTo(startX + pageWidth, currentY)
        .strokeColor(borderLight)
        .stroke();

      currentY += 6;
    });
  }

  // 4. Page Numbering & Bottom Footer (strictly preventing any new pages)
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);

    // Disable bottom margin temporarily so text at bottom NEVER triggers a new page
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    // Footer divider line
    doc
      .moveTo(startX, 794)
      .lineTo(startX + pageWidth, 794)
      .strokeColor(borderLight)
      .stroke();

    // Footer text
    doc
      .fillColor(slateMuted)
      .fontSize(7.5)
      .font('Helvetica')
      .text(
        'LogiSphere AI • Intelligent Fleet & Attendance Management Platform • Confidential',
        startX,
        802,
        { width: 370, lineBreak: false }
      );

    // Page count
    doc
      .text(`Page ${i + 1} of ${totalPages}`, startX + 380, 802, {
        align: 'right',
        width: pageWidth - 380,
        lineBreak: false,
      });

    doc.page.margins.bottom = originalBottomMargin;
  }

  return doc;
}

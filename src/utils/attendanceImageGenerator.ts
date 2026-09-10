import { Student } from '../types';

export interface AttendanceImageParams {
  dojoName: string;
  className: string;
  dayName: string;
  dateStr: string;
  fullDate: string;
  students: Student[];
  attendanceMap: Record<string, boolean>; // studentId -> boolean
}

export interface GeneratedAttendanceReport {
  blob: Blob;
  dataUrl: string;
  fileName: string;
  presentCount: number;
  absentCount: number;
  totalCount: number;
}

/**
 * Utility to draw a rounded rectangle on Canvas 2D
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | { tl: number; tr: number; br: number; bl: number }
) {
  let r = typeof radius === 'number' 
    ? { tl: radius, tr: radius, br: radius, bl: radius }
    : radius;

  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + width - r.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r.tr);
  ctx.lineTo(x + width, y + height - r.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r.br, y + height);
  ctx.lineTo(x + r.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
}

/**
 * Generates a clean, high-DPI attendance image for sharing on Zalo / Mobile.
 * Shows ONLY student name and attendance status (Có mặt / Nghỉ) and date.
 * Strictly excludes tuition, phone numbers, and sensitive notes.
 */
export async function generateAttendanceImage(
  params: AttendanceImageParams
): Promise<GeneratedAttendanceReport> {
  const {
    dojoName,
    className,
    dayName,
    dateStr,
    fullDate,
    students,
    attendanceMap
  } = params;

  // Filter students or keep all class students
  const studentList = students || [];
  const totalCount = studentList.length;
  let presentCount = 0;

  studentList.forEach(s => {
    if (attendanceMap[s.id]) {
      presentCount++;
    }
  });

  const absentCount = totalCount - presentCount;
  const presentPercent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  // Layout calculations
  const isTwoColumn = totalCount > 14;
  const columns = isTwoColumn ? 2 : 1;
  const rowCount = Math.ceil(totalCount / columns);
  const rowHeight = 52;

  const canvasWidth = 750;
  const headerHeight = 175;
  const summaryHeight = 85;
  const listPaddingTop = 20;
  const listHeight = Math.max(rowCount * rowHeight, 80);
  const footerHeight = 65;
  const canvasHeight = headerHeight + summaryHeight + listPaddingTop + listHeight + footerHeight;

  // High DPI 2x scaling
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth * scale;
  canvas.height = canvasHeight * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }

  ctx.scale(scale, scale);

  const fontSans = "'Plus Jakarta Sans', 'Segoe UI', -apple-system, Roboto, sans-serif";

  // 1. Overall Background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Outer border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

  // 2. Header Banner (Deep Navy Gradient)
  const headerGrad = ctx.createLinearGradient(0, 0, canvasWidth, headerHeight);
  headerGrad.addColorStop(0, '#0f172a');
  headerGrad.addColorStop(1, '#1e3a5f');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, canvasWidth, headerHeight);

  // Header Decorative Line
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, headerHeight - 4, canvasWidth, 4);

  // Dojo Name Badge
  ctx.font = `800 13px ${fontSans}`;
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`🥋  ${(dojoName || 'VÕ ĐƯỜNG').toUpperCase()}`, 35, 45);

  // Banner Title
  ctx.font = `900 24px ${fontSans}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('BẢNG ĐIỂM DANH BUỔI TẬP', 35, 80);

  // Date & Class Subtitle
  ctx.font = `600 14px ${fontSans}`;
  ctx.fillStyle = '#93c5fd';
  ctx.fillText(`Lớp: ${className || 'Toàn bộ'}   •   Buổi tập: ${dayName}, ${fullDate || dateStr}`, 35, 110);

  // Date Tag in header (Right aligned)
  roundRect(ctx, canvasWidth - 165, 35, 130, 48, 12);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = `800 13px ${fontSans}`;
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.fillText(dayName.toUpperCase(), canvasWidth - 100, 56);
  ctx.font = `700 13px ${fontSans}`;
  ctx.fillStyle = '#fde68a';
  ctx.fillText(dateStr, canvasWidth - 100, 74);
  ctx.textAlign = 'left'; // Reset alignment

  // 3. Summary Statistics Bar
  const sumY = headerHeight + 15;
  roundRect(ctx, 30, sumY, canvasWidth - 60, 56, 16);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Summary Item 1: Total
  ctx.font = `600 13px ${fontSans}`;
  ctx.fillStyle = '#64748b';
  ctx.fillText('Sĩ số lớp:', 50, sumY + 34);
  ctx.font = `800 15px ${fontSans}`;
  ctx.fillStyle = '#0f172a';
  ctx.fillText(`${totalCount} em`, 115, sumY + 34);

  // Separator 1
  ctx.strokeStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(180, sumY + 16);
  ctx.lineTo(180, sumY + 40);
  ctx.stroke();

  // Summary Item 2: Present
  roundRect(ctx, 200, sumY + 13, 24, 24, 6);
  ctx.fillStyle = '#dcfce7';
  ctx.fill();
  ctx.font = `bold 12px ${fontSans}`;
  ctx.fillStyle = '#16a34a';
  ctx.fillText('✓', 207, sumY + 29);

  ctx.font = `600 13px ${fontSans}`;
  ctx.fillStyle = '#166534';
  ctx.fillText('Đi học:', 232, sumY + 34);
  ctx.font = `900 16px ${fontSans}`;
  ctx.fillStyle = '#15803d';
  ctx.fillText(`${presentCount}`, 282, sumY + 34);
  ctx.font = `600 12px ${fontSans}`;
  ctx.fillStyle = '#16a34a';
  ctx.fillText(`(${presentPercent}%)`, 308, sumY + 34);

  // Separator 2
  ctx.strokeStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(375, sumY + 16);
  ctx.lineTo(375, sumY + 40);
  ctx.stroke();

  // Summary Item 3: Absent
  roundRect(ctx, 395, sumY + 13, 24, 24, 6);
  ctx.fillStyle = '#fee2e2';
  ctx.fill();
  ctx.font = `bold 12px ${fontSans}`;
  ctx.fillStyle = '#dc2626';
  ctx.fillText('✗', 402, sumY + 29);

  ctx.font = `600 13px ${fontSans}`;
  ctx.fillStyle = '#991b1b';
  ctx.fillText('Nghỉ:', 428, sumY + 34);
  ctx.font = `900 16px ${fontSans}`;
  ctx.fillStyle = '#b91c1c';
  ctx.fillText(`${absentCount} em`, 468, sumY + 34);

  // 4. Student List (Clean & Minimal: ONLY STT, Name, and Status)
  const listStartY = headerHeight + summaryHeight + listPaddingTop;
  const colWidth = isTwoColumn ? (canvasWidth - 75) / 2 : canvasWidth - 60;

  studentList.forEach((student, index) => {
    const col = isTwoColumn ? index % 2 : 0;
    const row = isTwoColumn ? Math.floor(index / 2) : index;

    const x = 30 + col * (colWidth + 15);
    const y = listStartY + row * rowHeight;
    const isPresent = !!attendanceMap[student.id];

    // Card background
    roundRect(ctx, x, y, colWidth, rowHeight - 8, 12);
    ctx.fillStyle = isPresent ? '#ffffff' : '#fef2f2';
    ctx.fill();
    ctx.strokeStyle = isPresent ? '#e2e8f0' : '#fecaca';
    ctx.lineWidth = 1;
    ctx.stroke();

    // STT Badge
    const sttStr = (index + 1).toString().padStart(2, '0');
    roundRect(ctx, x + 10, y + 9, 28, 26, 6);
    ctx.fillStyle = isPresent ? '#f1f5f9' : '#fee2e2';
    ctx.fill();
    ctx.font = `800 11px ${fontSans}`;
    ctx.fillStyle = isPresent ? '#475569' : '#dc2626';
    ctx.textAlign = 'center';
    ctx.fillText(sttStr, x + 24, y + 26);
    ctx.textAlign = 'left';

    // Student Full Name (Truncated if too long)
    ctx.font = `700 14px ${fontSans}`;
    ctx.fillStyle = isPresent ? '#0f172a' : '#475569';
    let displayName = student.name + (student.isMakeup ? ' (Học bù)' : '');
    const maxTextWidth = colWidth - 165;
    if (ctx.measureText(displayName).width > maxTextWidth) {
      while (ctx.measureText(displayName + '...').width > maxTextWidth && displayName.length > 5) {
        displayName = displayName.substring(0, displayName.length - 1);
      }
      displayName += '...';
    }
    ctx.fillText(displayName, x + 48, y + 27);

    // Status Pill (Right aligned within item card)
    const badgeW = 86;
    const badgeH = 28;
    const badgeX = x + colWidth - badgeW - 10;
    const badgeY = y + 8;

    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 14);
    ctx.fillStyle = isPresent ? '#dcfce7' : '#fee2e2';
    ctx.fill();
    ctx.strokeStyle = isPresent ? '#86efac' : '#fca5a5';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Badge Text & Icon
    ctx.font = `800 11px ${fontSans}`;
    ctx.fillStyle = isPresent ? '#15803d' : '#b91c1c';
    ctx.textAlign = 'center';
    ctx.fillText(
      isPresent ? '✓ CÓ MẶT' : '✗ NGHỈ',
      badgeX + badgeW / 2,
      badgeY + 18
    );
    ctx.textAlign = 'left';
  });

  // 5. Footer (Simple timestamp & watermarking)
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} - ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

  const footerY = canvasHeight - 25;
  ctx.font = `600 11px ${fontSans}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`🥋 Báo cáo điểm danh • Xuất lúc ${timeStr}`, 35, footerY);

  ctx.textAlign = 'right';
  ctx.fillText('Hệ Thống Điểm Danh Võ Sinh', canvasWidth - 35, footerY);
  ctx.textAlign = 'left';

  // 6. Output Blob and DataURL
  const safeDateName = dateStr.replace(/[^a-zA-Z0-9]/g, '-');
  const safeClassName = (className || 'Lop').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `DiemDanh_${safeClassName}_${safeDateName}.png`;

  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Failed to generate canvas blob'));
    }, 'image/png');
  });

  return {
    blob,
    dataUrl,
    fileName,
    presentCount,
    absentCount,
    totalCount
  };
}

/**
 * Generate formatted text message ready to paste into Zalo group chats
 */
export function generateZaloTextMessage(params: AttendanceImageParams): string {
  const {
    dojoName,
    className,
    dayName,
    dateStr,
    fullDate,
    students,
    attendanceMap
  } = params;

  const total = students.length;
  let present = 0;
  students.forEach(s => {
    if (attendanceMap[s.id]) present++;
  });
  const absent = total - present;

  let text = `🥋 [${dojoName.toUpperCase()}] - ĐIỂM DANH BUỔI TẬP\n`;
  text += `📅 Ngày: ${dayName}, ${fullDate || dateStr}\n`;
  text += `🥋 Lớp: ${className}\n`;
  text += `📊 Sĩ số: ${total} | ✅ Có mặt: ${present} | ❌ Nghỉ: ${absent}\n`;
  text += `------------------------------------\n`;

  students.forEach((s, idx) => {
    const isPresent = !!attendanceMap[s.id];
    const stt = (idx + 1).toString().padStart(2, '0');
    const makeupTag = s.isMakeup ? ' (Học bù)' : '';
    if (isPresent) {
      text += `✅ ${stt}. ${s.name}${makeupTag}\n`;
    } else {
      text += `❌ ${stt}. ${s.name}${makeupTag} (Nghỉ)\n`;
    }
  });

  text += `------------------------------------\n`;
  text += `📌 Giáo viên / HLV phụ trách gửi báo cáo.`;

  return text;
}

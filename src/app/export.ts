export function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>) {
  const escape = (value: string | number | null | undefined) => {
    const text = value == null ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };
  const csv = '\uFEFF' + rows.map(row => row.map(escape).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(filename, blob);
}

export type AttendanceImageRow = {
  index: number;
  code: string;
  name: string;
  status: string;
  type: string;
  originClass?: string;
};

export async function shareAttendanceImage(input: {
  filename: string;
  dojoName?: string;
  className: string;
  date: string;
  rows: AttendanceImageRow[];
}) {
  const width = 1200;
  const rowHeight = 58;
  const headerHeight = 210;
  const footerHeight = 70;
  const height = Math.max(420, headerHeight + input.rows.length * rowHeight + footerHeight);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ tạo ảnh Canvas.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, 150);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 150, width, 8);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 38px Arial, sans-serif';
  ctx.fillText(input.dojoName || 'HỆ THỐNG ĐIỂM DANH VÕ SINH', 48, 62);
  ctx.font = '600 26px Arial, sans-serif';
  ctx.fillText(`${input.className} · ${input.date}`, 48, 108);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '600 20px Arial, sans-serif';
  ctx.fillText(`Tổng: ${input.rows.length} võ sinh`, 48, 138);

  const columns = [48, 110, 260, 720, 900, 1040];
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(32, 178, width - 64, 42);
  ctx.fillStyle = '#334155';
  ctx.font = '700 18px Arial, sans-serif';
  ['STT', 'MÃ', 'HỌ TÊN', 'LỚP GỐC', 'TRẠNG THÁI', 'LOẠI'].forEach((text, index) => ctx.fillText(text, columns[index], 205));

  ctx.font = '500 18px Arial, sans-serif';
  input.rows.forEach((row, index) => {
    const y = 220 + index * rowHeight;
    if (index % 2 === 1) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(32, y, width - 64, rowHeight);
    }
    ctx.fillStyle = '#0f172a';
    ctx.fillText(String(row.index), columns[0], y + 36);
    ctx.fillText(trimCanvasText(ctx, row.code, 125), columns[1], y + 36);
    ctx.font = '600 19px Arial, sans-serif';
    ctx.fillText(trimCanvasText(ctx, row.name, 430), columns[2], y + 36);
    ctx.font = '500 18px Arial, sans-serif';
    ctx.fillText(trimCanvasText(ctx, row.originClass || '', 165), columns[3], y + 36);
    ctx.fillText(statusLabel(row.status), columns[4], y + 36);
    ctx.fillText(row.type === 'MAKEUP' ? 'Học bù' : row.type === 'TRIAL' ? 'Học thử' : 'Chính', columns[5], y + 36);
  });

  ctx.fillStyle = '#64748b';
  ctx.font = '500 16px Arial, sans-serif';
  ctx.fillText(`Xuất lúc ${new Date().toLocaleString('vi-VN')}`, 48, height - 30);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(value => value ? resolve(value) : reject(new Error('Không tạo được ảnh PNG.')), 'image/png', 0.95);
  });
  const file = new File([blob], input.filename, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };

  if (navigator.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
    try {
      await navigator.share({ title: `Điểm danh ${input.className}`, text: `${input.className} - ${input.date}`, files: [file] });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }

  downloadBlob(input.filename, blob);
}

function statusLabel(status: string) {
  if (status === 'PRESENT') return 'Có mặt';
  if (status === 'ABSENT') return 'Vắng';
  if (status === 'LATE') return 'Đi muộn';
  if (status === 'EXCUSED') return 'Có phép';
  return 'Chưa điểm danh';
}

function trimCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let value = text;
  while (value.length > 1 && ctx.measureText(`${value}…`).width > maxWidth) value = value.slice(0, -1);
  return `${value}…`;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

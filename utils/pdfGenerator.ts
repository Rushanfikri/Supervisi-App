import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { InventoryItem, SupervisionSection, SupervisionSignatures } from '../types';
import { MONTHS } from '../constants';

export interface PDFExportOptions {
  view: 'inventory' | 'supervision';
  bangsal: string;
  month: number;
  year: number;
  items: InventoryItem[];
  supervisionSections: SupervisionSection[];
  signatures: SupervisionSignatures;
  printDate?: Date;
  kunciLama?: string;
  kunciBaru?: string;
  waktuSupervisi?: string;
}

/**
 * Generate QR code as Base64 Data URL using the fast local qrcode library
 */
export async function generateQRCodeBase64(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      margin: 1,
      width: 200,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    return '';
  }
}

/**
 * Helper to calculate expiry status for inventory table rows
 */
function getExpiryStatus(item: InventoryItem, refDate: Date): 'expired' | 'warning' | 'normal' {
  const { ed_dd, ed_mm, ed_yy } = item;
  if (!ed_dd || !ed_mm || !ed_yy || ed_yy.length < 4) return 'normal';

  const day = parseInt(ed_dd, 10);
  const month = parseInt(ed_mm, 10) - 1;
  const year = parseInt(ed_yy, 10);
  const expiryDate = new Date(year, month, day);

  if (isNaN(expiryDate.getTime())) return 'normal';

  const today = new Date(refDate);
  today.setHours(0, 0, 0, 0);

  const warningLimit = new Date(today);
  warningLimit.setMonth(warningLimit.getMonth() + 3);

  if (expiryDate < today) return 'expired';
  if (expiryDate <= warningLimit) return 'warning';
  return 'normal';
}

/**
 * Main function to build the jsPDF document.
 * In 'supervision' view: Exact format matching RSUP Surakarta official form (no logo,
 * RUANG, WAKTU, KUNCI LAMA, KUNCI BARU, vector checklist table, and 3-way signatories
 * where QR is ONLY generated when NIP is inputted).
 * In 'inventory' view: Trolley Emergency stock opname table.
 */
export async function createReportPDF(options: PDFExportOptions): Promise<jsPDF> {
  const {
    view,
    bangsal,
    month,
    year,
    items,
    supervisionSections,
    signatures,
    printDate = new Date(),
    kunciLama = '',
    kunciBaru = '',
    waktuSupervisi,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4', // 210 x 297 mm
  });

  const periodStr = `${MONTHS[month]} ${year}`;
  const timeStr = printDate
    .toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .replace(/\./g, ':');
  const dateFormatted = printDate.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const printTimestampStr = `${dateFormatted} ${timeStr}`;

  // Generate QR ONLY if useQR is explicitly enabled!
  let supervisorQRBase64 = '';
  if (signatures.supervisor.useQR) {
    const sName = signatures.supervisor.nama || 'Petugas Supervisi';
    const sNip = signatures.supervisor.nip ? signatures.supervisor.nip.trim() : '-';
    supervisorQRBase64 = await generateQRCodeBase64(
      `Verified Supervisi: ${sName} - NIP: ${sNip} - Dept: ${bangsal} - Periode: ${periodStr} - RSUP Surakarta`
    );
  }

  let kaRuangQRBase64 = '';
  if (signatures.kaRuang.useQR) {
    const krName = signatures.kaRuang.nama || 'Kepala Ruang';
    const krNip = signatures.kaRuang.nip ? signatures.kaRuang.nip.trim() : '-';
    kaRuangQRBase64 = await generateQRCodeBase64(
      `Verified Supervisi: ${krName} - NIP: ${krNip} - Dept: ${bangsal} - Periode: ${periodStr} - RSUP Surakarta`
    );
  }

  let kaInstalasiQRBase64 = '';
  if (signatures.kaInstalasi.useQR) {
    const kiName = signatures.kaInstalasi.nama || 'Kepala Instalasi Farmasi';
    const kiNip = signatures.kaInstalasi.nip ? signatures.kaInstalasi.nip.trim() : '-';
    kaInstalasiQRBase64 = await generateQRCodeBase64(
      `Verified Supervisi: ${kiName} - NIP: ${kiNip} - Dept: ${bangsal} - Periode: ${periodStr} - RSUP Surakarta`
    );
  }

  // =========================================================================
  // VIEW: SUPERVISION (EXACT RECREATION OF RSUP SURAKARTA OFFICIAL DOCUMENT)
  // =========================================================================
  if (view === 'supervision') {
    // 1. HEADER (Center-aligned title, strictly no logo)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(0, 0, 0);
    doc.text(
      'SUPERVISI INSTALASI FARMASI DALAM PELAYANAN KEFARMASIAN',
      105,
      12.5,
      { align: 'center' }
    );
    doc.text(
      'DI RUANG RAWAT INAP RUMAH SAKIT UMUM PUSAT SURAKARTA',
      105,
      17.5,
      { align: 'center' }
    );

    // 2. METADATA SECTION: PERIODE, RUANG, WAKTU, KUNCI LAMA, KUNCI BARU
    const displayWaktu =
      waktuSupervisi ||
      `${printDate.getDate().toString().padStart(2, '0')}/${(printDate.getMonth() + 1)
        .toString()
        .padStart(2, '0')}/${printDate.getFullYear()}`;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);

    // Left column: PERIODE on top, then RUANG, then WAKTU
    doc.text(`PERIODE  :  ${periodStr.toUpperCase()}`, 12, 22.5);
    doc.text(`RUANG    :  ${bangsal.toUpperCase()}`, 12, 26.5);
    doc.text(`WAKTU    :  ${displayWaktu}`, 12, 30.5);

    // Right column: KUNCI LAMA, KUNCI BARU
    doc.text(`KUNCI LAMA  :  ${kunciLama || ''}`, 135, 26.5);
    doc.text(`KUNCI BARU  :  ${kunciBaru || ''}`, 135, 30.5);

    // 3. TABLE WITH 6 COLUMNS: Tanggal Supervisi | Uraian | Sesuai | Tidak Sesuai | Temuan | Tindak Lanjut
    // Prepare flattened list of items for vector checkbox rendering in didDrawCell
    interface RowMeta {
      isSection: boolean;
      sesuai: boolean | null;
    }
    const rowMetaList: RowMeta[] = [];
    const tableBody: any[] = [];

    supervisionSections.forEach((section) => {
      rowMetaList.push({ isSection: true, sesuai: null });
      tableBody.push([
        {
          content: section.title,
          colSpan: 6,
          styles: {
            fontStyle: 'bold',
            textColor: [0, 0, 0],
            fillColor: [255, 255, 255],
            halign: 'left',
            cellPadding: { top: 1.2, bottom: 1.2, left: 1.8, right: 1.8 },
          },
        },
      ]);

      section.items.forEach((item) => {
        rowMetaList.push({ isSection: false, sesuai: item.sesuai });
        tableBody.push([
          '', // Tanggal Supervisi (left empty or filled per item)
          item.uraian,
          '', // Sesuai (vector checkbox drawn in didDrawCell)
          '', // Tidak Sesuai (vector checkbox drawn in didDrawCell)
          item.temuan || '',
          item.tindakLanjut || '',
        ]);
      });
    });

    autoTable(doc, {
      startY: 33,
      margin: { top: 33, bottom: 12, left: 12, right: 12 },
      head: [
        [
          'Tanggal\nSupervisi',
          'Uraian',
          'Sesuai',
          'Tidak\nSesuai',
          'Temuan',
          'Tindak Lanjut',
        ],
      ],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 7.2,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 },
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: 18, halign: 'center', valign: 'middle' },
        1: { cellWidth: 80, halign: 'left', valign: 'middle' },
        2: { cellWidth: 14, halign: 'center', valign: 'middle' },
        3: { cellWidth: 14, halign: 'center', valign: 'middle' },
        4: { cellWidth: 30, halign: 'left', valign: 'middle' },
        5: { cellWidth: 30, halign: 'left', valign: 'middle' },
      },
      bodyStyles: {
        fontSize: 6.5,
        textColor: [0, 0, 0],
        cellPadding: { top: 1.1, bottom: 1.1, left: 1.5, right: 1.5 },
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        valign: 'middle',
      },
      didDrawCell: (data) => {
        if (data.section === 'body') {
          const meta = rowMetaList[data.row.index];
          if (!meta || meta.isSection) return;

          // Columns 2 (Sesuai) and 3 (Tidak Sesuai)
          if (data.column.index === 2 || data.column.index === 3) {
            const boxSize = 3.2;
            const boxX = data.cell.x + (data.cell.width - boxSize) / 2;
            const boxY = data.cell.y + (data.cell.height - boxSize) / 2;

            // Draw clean square checkbox
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.25);
            doc.rect(boxX, boxY, boxSize, boxSize);

            // Determine if checked
            const isSesuaiCol = data.column.index === 2;
            const isTidakSesuaiCol = data.column.index === 3;
            const isChecked =
              (isSesuaiCol && meta.sesuai === true) ||
              (isTidakSesuaiCol && meta.sesuai === false);

            if (isChecked) {
              // Draw sharp vector checkmark inside square
              doc.setDrawColor(0, 0, 0);
              doc.setLineWidth(0.5);
              doc.line(boxX + 0.6, boxY + 1.6, boxX + 1.3, boxY + 2.5);
              doc.line(boxX + 1.3, boxY + 2.5, boxX + 2.6, boxY + 0.7);
            }
          }
        }
      },
    });

    // 4. SIGNATURE SECTION AT THE BOTTOM
    // Check final table Y position; if close to bottom, add new page, else place below table
    let finalTableY = (doc as any).lastAutoTable.finalY || 190;
    // We need around 65mm for both signature rows
    if (finalTableY + 65 > 290) {
      doc.addPage();
      finalTableY = 20;
    }

    const sigRow1Y = Math.max(finalTableY + 7, 215);

    // ROW 1: Kepala Ruang (left) & Petugas Supervisi (right)
    const colLeftX = 52;
    const colRightX = 158;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('Kepala Ruang', colLeftX, sigRow1Y, { align: 'center' });
    doc.text('Petugas Supervisi', colRightX, sigRow1Y, { align: 'center' });

    // --- Left: Kepala Ruang ---
    const useKrQR = Boolean(signatures.kaRuang.useQR && kaRuangQRBase64);
    let krNameY = sigRow1Y + 18;
    if (useKrQR) {
      doc.addImage(kaRuangQRBase64, 'PNG', colLeftX - 7.5, sigRow1Y + 2, 15, 15);
      krNameY = sigRow1Y + 19.5;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(
      signatures.kaRuang.nama ? signatures.kaRuang.nama.toUpperCase() : 'PUTRIANI KARTIKA',
      colLeftX,
      krNameY,
      { align: 'center' }
    );
    if (signatures.kaRuang.nip && signatures.kaRuang.nip.trim().length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(signatures.kaRuang.nip.trim(), colLeftX, krNameY + 4, { align: 'center' });
    }

    // --- Right: Petugas Supervisi ---
    const useSpQR = Boolean(signatures.supervisor.useQR && supervisorQRBase64);
    let spNameY = sigRow1Y + 18;
    if (useSpQR) {
      doc.addImage(supervisorQRBase64, 'PNG', colRightX - 7.5, sigRow1Y + 2, 15, 15);
      spNameY = sigRow1Y + 19.5;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(
      signatures.supervisor.nama
        ? signatures.supervisor.nama.toUpperCase()
        : 'MUHAMMAD IQBAL RUSHANFIKRI, S.Farm,Apt',
      colRightX,
      spNameY,
      { align: 'center' }
    );
    if (signatures.supervisor.nip && signatures.supervisor.nip.trim().length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(signatures.supervisor.nip.trim(), colRightX, spNameY + 4, { align: 'center' });
    }

    // ROW 2: Mengetahui, Kepala Instalasi Farmasi (centered)
    const sigRow2Y = sigRow1Y + 28;
    const colCenterX = 105;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Mengetahui,', colCenterX, sigRow2Y, { align: 'center' });
    doc.text('Kepala Instalasi Farmasi', colCenterX, sigRow2Y + 4, { align: 'center' });

    const useKiQR = Boolean(signatures.kaInstalasi.useQR && kaInstalasiQRBase64);
    let kiNameY = sigRow2Y + 22;
    if (useKiQR) {
      doc.addImage(kaInstalasiQRBase64, 'PNG', colCenterX - 7.5, sigRow2Y + 6, 15, 15);
      kiNameY = sigRow2Y + 23.5;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(
      signatures.kaInstalasi.nama
        ? signatures.kaInstalasi.nama.toUpperCase()
        : 'FELLA SYIFA, S.Farm, Apt',
      colCenterX,
      kiNameY,
      { align: 'center' }
    );
    if (signatures.kaInstalasi.nip && signatures.kaInstalasi.nip.trim().length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(signatures.kaInstalasi.nip.trim(), colCenterX, kiNameY + 4, { align: 'center' });
    }

    return doc;
  }

  // =========================================================================
  // VIEW: INVENTORY (DAFTAR OBAT TROLLEY EMERGENCY)
  // =========================================================================
  const tableRows = items.map((item, index) => {
    const displayNo = item.no || index + 1;
    const fisikVal = item.fisik === '' || item.fisik === null ? '-' : item.fisik;
    let selisihVal = '-';
    if (typeof item.selisih === 'number') {
      selisihVal = item.selisih > 0 ? `+${item.selisih}` : `${item.selisih}`;
    }
    const expiredVal =
      item.ed_dd && item.ed_mm && item.ed_yy
        ? `${item.ed_dd.padStart(2, '0')}/${item.ed_mm.padStart(2, '0')}/${item.ed_yy}`
        : '-';

    return [displayNo, item.namaItem, item.sistem, fisikVal, selisihVal, expiredVal];
  });

  autoTable(doc, {
    startY: 37,
    margin: { top: 37, bottom: 46, left: 14, right: 14 },
    head: [['NO', 'NAMA ITEM', 'SISTEM', 'FISIK', 'SELISIH', 'EXPIRED']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 76, halign: 'left' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 28, halign: 'center' },
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 1.8,
      lineColor: [226, 232, 240],
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const rowIndex = data.row.index;
        const item = items[rowIndex];
        if (item) {
          const status = getExpiryStatus(item, printDate);
          if (status !== 'normal') {
            if (data.column.index === 1 || data.column.index === 5) {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            }
          }
          if (data.column.index === 4 && typeof item.selisih === 'number') {
            if (item.selisih < 0) {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            } else if (item.selisih > 0) {
              data.cell.styles.textColor = [37, 99, 235];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      }
    },
  });

  // Draw Header and Lembar Pengesahan Footer on EVERY page for Inventory
  const totalPages = (doc as any).internal.getNumberOfPages();

  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);

    // 1. Header (No logo)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('DAFTAR OBAT TROLLEY EMERGENCY', 14, 13);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('RSUP Surakarta', 14, 18.5);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(`Bangsal : ${bangsal}`, 14, 24.5);
    doc.text(`Periode : ${periodStr}`, 85, 24.5);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Dicetak pada: ${printTimestampStr}`, 14, 29.5);

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Halaman ${page} dari ${totalPages}`, 196, 29.5, { align: 'right' });

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(14, 32.5, 196, 32.5);

    // 2. Lembar Pengesahan Footer
    const footerTopY = 253;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(14, footerTopY, 196, footerTopY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('LEMBAR PENGESAHAN STOCK OPNAME', 14, footerTopY + 4.5);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Bangsal: ${bangsal}  |  Periode: ${periodStr}`, 85, footerTopY + 4.5);

    doc.text(`RSUP Surakarta • Hal ${page}/${totalPages}`, 196, footerTopY + 4.5, {
      align: 'right',
    });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(14, footerTopY + 6.5, 196, footerTopY + 6.5);

    // Supervisor Unit Signatory Block
    const sigY = footerTopY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text('Supervisor Unit / Petugas Farmasi', 14, sigY);

    const useSupInvQR = Boolean(signatures.supervisor.useQR && supervisorQRBase64);
    if (useSupInvQR) {
      doc.addImage(supervisorQRBase64, 'PNG', 14, sigY + 2, 21, 21);
    }

    const textX = useSupInvQR ? 38 : 14;
    const textStartY = useSupInvQR ? sigY + 7 : sigY + 14;

    if (useSupInvQR) {
      doc.setFontSize(6.8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text(`Signed at: ${printTimestampStr}`, textX, sigY + 7);
    }

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(
      signatures.supervisor.nama || 'Muhammad Iqbal Rushanfikri',
      textX,
      useSupInvQR ? sigY + 13 : textStartY
    );

    if (signatures.supervisor.nip && signatures.supervisor.nip.trim().length > 0) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(`NIP: ${signatures.supervisor.nip.trim()}`, textX, useSupInvQR ? sigY + 18 : textStartY + 5);
    }

    // Stats box on right
    const countedItems = items.filter((i) => i.fisik !== '' && i.fisik !== null).length;
    const diffItems = items.filter((i) => typeof i.selisih === 'number' && i.selisih !== 0).length;
    const expiredItems = items.filter((i) => getExpiryStatus(i, printDate) === 'expired').length;

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(138, sigY + 1, 58, 22, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('RINGKASAN FISIK TROLLEY', 142, sigY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Total Obat/Item: ${items.length} item`, 142, sigY + 9.5);
    doc.text(`Selesai Dihitung: ${countedItems} / ${items.length}`, 142, sigY + 13.5);

    if (diffItems > 0) {
      doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
      doc.text(`Selisih: ${diffItems} item`, 142, sigY + 17.5);
    } else {
      doc.setTextColor(22, 163, 74);
      doc.text(`Selisih: 0 (Cocok)`, 142, sigY + 17.5);
    }

    if (expiredItems > 0) {
      doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
      doc.text(`Expired: ${expiredItems} item!`, 142, sigY + 21);
    } else {
      doc.setTextColor(100, 116, 139);
      doc.text(`Expired: Nihil (Aman)`, 142, sigY + 21);
    }
  }

  return doc;
}

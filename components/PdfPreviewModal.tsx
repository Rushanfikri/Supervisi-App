import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem, SupervisionSection, SupervisionSignatures, Department } from '../types';
import { MONTHS, YEARS } from '../constants';
import { createReportPDF, PDFExportOptions } from '../utils/pdfGenerator';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  view: 'inventory' | 'supervision';
  activeBangsal: Department;
  availableBangsalList: string[];
  onBangsalChange: (bangsal: Department) => void;
  selectedMonth: number;
  onMonthChange: (month: number) => void;
  selectedYear: number;
  onYearChange: (year: number) => void;
  items: InventoryItem[];
  supervisionSections: SupervisionSection[];
  signatures: SupervisionSignatures;
  nowDate: Date;
  kunciLama?: string;
  kunciBaru?: string;
  waktuSupervisi?: string;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  view,
  activeBangsal,
  availableBangsalList,
  onBangsalChange,
  selectedMonth,
  onMonthChange,
  selectedYear,
  onYearChange,
  items,
  supervisionSections,
  signatures,
  nowDate,
  kunciLama = '',
  kunciBaru = '',
  waktuSupervisi = '',
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const currentBlobUrlRef = useRef<string | null>(null);

  // Generate the PDF blob whenever props change
  useEffect(() => {
    if (!isOpen) {
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = null;
        setPdfUrl(null);
      }
      return;
    }

    let isCancelled = false;
    setIsGenerating(true);

    const generate = async () => {
      try {
        const options: PDFExportOptions = {
          view,
          bangsal: activeBangsal,
          month: selectedMonth,
          year: selectedYear,
          items,
          supervisionSections,
          signatures,
          printDate: nowDate,
          kunciLama,
          kunciBaru,
          waktuSupervisi,
        };

        const doc = await createReportPDF(options);

        if (isCancelled) return;

        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);

        if (currentBlobUrlRef.current) {
          URL.revokeObjectURL(currentBlobUrlRef.current);
        }

        currentBlobUrlRef.current = url;
        setPdfUrl(url);
      } catch (err) {
        console.error('Failed to generate PDF for preview:', err);
      } finally {
        if (!isCancelled) {
          setIsGenerating(false);
        }
      }
    };

    generate();

    return () => {
      isCancelled = true;
    };
  }, [
    isOpen,
    view,
    activeBangsal,
    selectedMonth,
    selectedYear,
    items,
    supervisionSections,
    signatures,
    nowDate,
    kunciLama,
    kunciBaru,
    waktuSupervisi,
  ]);

  const handleDownload = async () => {
    const options: PDFExportOptions = {
      view,
      bangsal: activeBangsal,
      month: selectedMonth,
      year: selectedYear,
      items,
      supervisionSections,
      signatures,
      printDate: nowDate,
      kunciLama,
      kunciBaru,
      waktuSupervisi,
    };
    const doc = await createReportPDF(options);
    const prefix = view === 'inventory' ? 'Daftar_Obat_Trolley' : 'Laporan_Supervisi';
    const monthName = MONTHS[selectedMonth];
    doc.save(`${prefix}_RSUP_Surakarta_${activeBangsal}_${monthName}_${selectedYear}.pdf`);
  };

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } catch (e) {
        // Fallback: open in new window for printing
        if (pdfUrl) {
          window.open(pdfUrl, '_blank');
        }
      }
    } else if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[92vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-all duration-300">
        {/* Top Control Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                  Display PDF • RSUP Surakarta
                </h2>
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-black text-[9px] rounded-full uppercase">
                  {view === 'inventory' ? 'Trolley Emergency' : 'Supervisi'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                Header resmi & Lembar Pengesahan tercetak pada footer setiap halaman
              </p>
            </div>
          </div>

          {/* Dynamic Selectors for Bangsal & Periode */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Bangsal selector */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">
                Bangsal:
              </span>
              <select
                value={activeBangsal}
                onChange={(e) => onBangsalChange(e.target.value as Department)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
              >
                {availableBangsalList.map((b) => (
                  <option key={b} value={b} className="dark:bg-slate-800 dark:text-white">
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Periode selector */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">
                Periode:
              </span>
              <select
                value={selectedMonth}
                onChange={(e) => onMonthChange(parseInt(e.target.value, 10))}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx} className="dark:bg-slate-800 dark:text-white">
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => onYearChange(parseInt(e.target.value, 10))}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y} className="dark:bg-slate-800 dark:text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Action buttons */}
            <button
              onClick={handlePrint}
              disabled={isGenerating || !pdfUrl}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
              title="Cetak Langsung"
            >
              <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              <span>Cetak</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={isGenerating || !pdfUrl}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span>Download PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              title="Tutup Modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main PDF Display Viewer */}
        <div className="flex-1 relative bg-slate-200 dark:bg-slate-950 p-2 sm:p-4 overflow-hidden flex items-center justify-center">
          {isGenerating && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-sm gap-3">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-white text-xs font-bold tracking-wider uppercase">
                Menyusun Display PDF & Lembar Pengesahan...
              </p>
            </div>
          )}

          {pdfUrl ? (
            <iframe
              ref={iframeRef}
              src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
              title="Display PDF Laporan RSUP Surakarta"
              className="w-full h-full rounded-2xl shadow-xl border border-slate-300 dark:border-slate-800 bg-white"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-xs font-bold">Menyiapkan pratinjau PDF...</p>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-bold">RSUP Surakarta • Standar Akreditasi Rumah Sakit</span>
          </div>
          <p className="hidden sm:block italic">
            Gunakan tombol cetak atau simpan PDF untuk arsip resmi dan inspeksi troli emergensi.
          </p>
        </div>
      </div>
    </div>
  );
};

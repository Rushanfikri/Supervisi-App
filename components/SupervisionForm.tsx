import React, { useState } from 'react';
import { SupervisionSection, SupervisionItem, SupervisionSignatures } from '../types';

interface SupervisionFormProps {
  sections: SupervisionSection[];
  signatures: SupervisionSignatures;
  kunciLama?: string;
  kunciBaru?: string;
  waktuSupervisi?: string;
  bangsalName?: string;
  onUpdateMetadata?: (field: 'kunciLama' | 'kunciBaru' | 'waktuSupervisi', value: string) => void;
  onUpdateItem: (sectionIndex: number, itemIndex: number, field: keyof SupervisionItem, value: any) => void;
  onUpdateSignature: (role: keyof SupervisionSignatures, field: 'nama' | 'nip', value: string) => void;
  onAddCriteria: (sectionIndex: number) => void;
  onRemoveCriteria: (sectionIndex: number, itemIndex: number) => void;
  readOnly?: boolean;
  onSave?: () => void;
}

const SupervisionForm: React.FC<SupervisionFormProps> = ({ 
  sections, 
  signatures, 
  kunciLama = '',
  kunciBaru = '',
  waktuSupervisi = '',
  bangsalName = '',
  onUpdateMetadata,
  onUpdateItem, 
  onUpdateSignature, 
  onAddCriteria, 
  onRemoveCriteria, 
  readOnly = false,
  onSave
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUraian, setEditUraian] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{sectionIndex: number, itemIndex: number, name: string} | null>(null);

  const startEditing = (item: SupervisionItem) => {
    setEditingId(item.id);
    setEditUraian(item.uraian);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEditing = (sectionIndex: number, itemIndex: number) => {
    onUpdateItem(sectionIndex, itemIndex, 'uraian', editUraian);
    setEditingId(null);
  };

  const renderSignatureBox = (role: keyof SupervisionSignatures, label: string) => {
    const sig = signatures[role];
    // ONLY generate QR if NIP is entered (not empty)
    const hasNip = Boolean(sig.nip && sig.nip.trim().length > 0);
    const sName = sig.nama || 'Petugas';
    const sNip = sig.nip ? sig.nip.trim() : '';
    const qrData = encodeURIComponent(`Verified Supervisi: ${sName} - NIP: ${sNip} - Time: ${sig.timestamp || "N/A"} - RSUP Surakarta`);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${qrData}`;

    return (
      <div className="flex flex-col p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3 transition-colors duration-300">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
          <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            {label}
          </p>
          {sig.timestamp && (
            <p className="text-[8px] font-bold text-slate-400 dark:text-slate-600 tracking-tighter italic">
              {sig.timestamp}
            </p>
          )}
        </div>
        
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Nama Lengkap</label>
          <input
            type="text"
            disabled={readOnly}
            className="w-full px-3 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50"
            placeholder="Ketik Nama Lengkap..."
            value={sig.nama}
            onChange={(e) => onUpdateSignature(role, 'nama', e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Nomor NIP</label>
            <span className="text-[8px] text-slate-400 dark:text-slate-500 italic">
              {hasNip ? 'QR aktif' : 'Isi NIP untuk QR'}
            </span>
          </div>
          <input
            type="text"
            disabled={readOnly}
            className="w-full px-3 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50"
            placeholder="Nomor NIP Pegawai (opsional)..."
            value={sig.nip}
            onChange={(e) => onUpdateSignature(role, 'nip', e.target.value)}
          />
        </div>

        <div className="flex flex-col items-center justify-center py-3 border-t border-slate-100 dark:border-slate-800 mt-2 gap-2">
          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
            {hasNip ? 'QR VERIFICATION' : 'TANDA TANGAN MANUAL'}
          </p>
          <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden transition-all duration-300">
            {hasNip ? (
              <img src={qrUrl} alt="Signature QR" className="w-full h-full p-1 dark:invert-[0.05]" />
            ) : (
              <div className="flex flex-col items-center justify-center p-2 text-center text-slate-400 dark:text-slate-500">
                <svg className="w-7 h-7 mb-1 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span className="text-[8px] font-bold uppercase tracking-tight">Tanda Tangan Basah</span>
              </div>
            )}
          </div>
          {hasNip ? (
            <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
              Digital Verified
            </span>
          ) : (
            <span className="text-[8px] text-slate-400 dark:text-slate-500 italic text-center">
              Tanpa QR (ttd basah di PDF)
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Header Info Panel: RUANG, WAKTU, KUNCI LAMA, KUNCI BARU */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
              Informasi Supervisi Farmasi
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Dicetak pada header resmi PDF: Ruang, Waktu, Kunci Lama, dan Kunci Baru troli
            </p>
          </div>
          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
            {bangsalName || 'Ruang Perawatan'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Waktu / Tanggal Supervisi
            </label>
            <input
              type="text"
              disabled={readOnly}
              className="px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50"
              placeholder="Contoh: 12/08/2026..."
              value={waktuSupervisi}
              onChange={(e) => onUpdateMetadata && onUpdateMetadata('waktuSupervisi', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Nomor Kunci Lama (Segel)
            </label>
            <input
              type="text"
              disabled={readOnly}
              className="px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50"
              placeholder="Contoh: B-4019..."
              value={kunciLama}
              onChange={(e) => onUpdateMetadata && onUpdateMetadata('kunciLama', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Nomor Kunci Baru (Segel)
            </label>
            <input
              type="text"
              disabled={readOnly}
              className="px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50"
              placeholder="Contoh: B-4020..."
              value={kunciBaru}
              onChange={(e) => onUpdateMetadata && onUpdateMetadata('kunciBaru', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col w-full overflow-hidden bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors duration-300">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-20 transition-colors">
              <tr>
                <th className="px-4 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 min-w-[300px]">URAIAN</th>
                <th className="px-2 py-4 text-center text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 w-20">SESUAI</th>
                <th className="px-2 py-4 text-center text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 w-20">TIDAK SESUAI</th>
                <th className="px-4 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 min-w-[200px]">TEMUAN</th>
                <th className="px-4 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 min-w-[200px]">TINDAK LANJUT</th>
                {!readOnly && <th className="px-4 py-4 text-center text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 w-20">AKSI</th>}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 transition-colors">
              {sections.map((section, sIdx) => (
                <React.Fragment key={sIdx}>
                  <tr className="bg-slate-100/50 dark:bg-slate-800/40">
                    <td colSpan={readOnly ? 5 : 6} className="px-4 py-2 border-y border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">{section.title}</span>
                        {!readOnly && (
                          <button
                            onClick={() => onAddCriteria(sIdx)}
                            className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-[10px] font-bold uppercase tracking-tight"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                            Tambah Kriteria
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {section.items.map((item, iIdx) => {
                    const isEditing = editingId === item.id;
                    return (
                      <tr key={item.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">
                          {isEditing ? (
                            <input
                              type="text"
                              className="w-full px-2 py-1 text-sm font-bold border border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                              value={editUraian}
                              onChange={(e) => setEditUraian(e.target.value)}
                            />
                          ) : (
                            item.uraian
                          )}
                        </td>
                        <td className="px-2 py-3 text-center border-b border-slate-100 dark:border-slate-800">
                          <button
                            onClick={() => !readOnly && onUpdateItem(sIdx, iIdx, 'sesuai', true)}
                            disabled={readOnly}
                            className={`w-6 h-6 rounded-md border-2 transition-all flex items-center justify-center ${
                              item.sesuai === true 
                                ? 'bg-emerald-500 border-emerald-500 text-white' 
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                            } disabled:cursor-not-allowed`}
                          >
                            {item.sesuai === true && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                          </button>
                        </td>
                        <td className="px-2 py-3 text-center border-b border-slate-100 dark:border-slate-800">
                          <button
                            onClick={() => !readOnly && onUpdateItem(sIdx, iIdx, 'sesuai', false)}
                            disabled={readOnly}
                            className={`w-6 h-6 rounded-md border-2 transition-all flex items-center justify-center ${
                              item.sesuai === false 
                                ? 'bg-red-500 border-red-500 text-white' 
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-red-300 dark:hover:border-red-700'
                            } disabled:cursor-not-allowed`}
                          >
                            {item.sesuai === false && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>}
                          </button>
                        </td>
                        <td className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                          <input
                            type="text"
                            disabled={readOnly}
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-700 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/5 outline-none transition-all disabled:opacity-50"
                            placeholder="Catat temuan..."
                            value={item.temuan}
                            onChange={(e) => onUpdateItem(sIdx, iIdx, 'temuan', e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                          <input
                            type="text"
                            disabled={readOnly}
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-700 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/5 outline-none transition-all disabled:opacity-50"
                            placeholder="Rencana tindak lanjut..."
                            value={item.tindakLanjut}
                            onChange={(e) => onUpdateItem(sIdx, iIdx, 'tindakLanjut', e.target.value)}
                          />
                        </td>
                        {!readOnly && (
                          <td className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => saveEditing(sIdx, iIdx)}
                                  className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                                  title="Simpan"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
                                  </svg>
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                  title="Batal"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => startEditing(item)}
                                  className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                                  title="Edit Item"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirm({ sectionIndex: sIdx, itemIndex: iIdx, name: item.uraian });
                                  }}
                                  className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-all"
                                  title="Hapus Item"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                  </svg>
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest pl-2 border-l-4 border-blue-600">
          Tanda Tangan Elektronik (QR Verification)
        </h3>
        
        {/* Save Draft Section inside Supervision Form */}
        {!readOnly && onSave && (
          <div className="p-5 bg-blue-50/40 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors duration-300">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-tight">Simpan Hasil Supervisi (Draft)</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Jika tanda tangan belum lengkap, Anda dapat menyimpan hasil supervisi ini terlebih dahulu ke cloud agar formulir dan isian data aman serta dapat diakses kembali kapan saja.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onSave}
              className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-500/10 active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
              <span>Simpan Progress ke Cloud</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderSignatureBox('supervisor', 'Supervisor')}
          {renderSignatureBox('kaRuang', 'Kepala Ruang')}
          {renderSignatureBox('kaInstalasi', 'Kepala Instalasi Farmasi')}
        </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Hapus Kriteria?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Anda akan menghapus <span className="font-bold text-slate-800 dark:text-slate-200">"{deleteConfirm.name}"</span>. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  BATAL
                </button>
                <button 
                  onClick={() => {
                    onRemoveCriteria(deleteConfirm.sectionIndex, deleteConfirm.itemIndex);
                    setDeleteConfirm(null);
                  }}
                  className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-100 dark:shadow-red-900/20 transition-colors"
                >
                  HAPUS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisionForm;

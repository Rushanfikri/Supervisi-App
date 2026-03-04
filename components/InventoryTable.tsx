
import React, { useState } from 'react';
import { InventoryItem, SupervisionSignatures } from '../types';

interface InventoryTableProps {
  items: InventoryItem[];
  currentDate: Date;
  onUpdateItem: (id: string, field: keyof InventoryItem, value: any) => void;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  signatures: SupervisionSignatures;
  onUpdateSignature: (role: keyof SupervisionSignatures, field: 'nama' | 'nip', value: string) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({ 
  items, 
  currentDate, 
  onUpdateItem, 
  onAddItem,
  onRemoveItem,
  signatures, 
  onUpdateSignature 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSistem, setEditSistem] = useState<number>(0);
  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, name: string} | null>(null);

  const filteredItems = items.filter(item => 
    item.namaItem.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.idItem.includes(searchTerm)
  );

  const startEditing = (item: InventoryItem) => {
    setEditingId(item.idItem);
    setEditName(item.namaItem);
    setEditSistem(item.sistem);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEditing = (id: string) => {
    onUpdateItem(id, 'namaItem', editName);
    onUpdateItem(id, 'sistem', editSistem);
    
    // Recalculate selisih if fisik exists
    const item = items.find(i => i.idItem === id);
    if (item && item.fisik !== "") {
      const fisikNum = typeof item.fisik === 'string' ? parseInt(item.fisik) : item.fisik;
      if (!isNaN(fisikNum)) {
        onUpdateItem(id, 'selisih', fisikNum - editSistem);
      }
    }
    
    setEditingId(null);
  };

  const handlePhysicalChange = (id: string, value: string, sistem: number) => {
    const val = value === "" ? "" : parseInt(value);
    onUpdateItem(id, 'fisik', val);
    
    if (typeof val === 'number') {
      onUpdateItem(id, 'selisih', val - sistem);
    } else {
      onUpdateItem(id, 'selisih', "");
    }
  };

  const handleDateInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    id: string,
    field: 'ed_dd' | 'ed_mm' | 'ed_yy',
    maxLength: number
  ) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    onUpdateItem(id, field, value);

    // Auto-focus logic
    if (value.length >= maxLength) {
      let nextEl = e.target.nextElementSibling;
      // Skip the "/" span to find the next input
      while (nextEl && nextEl.tagName !== 'INPUT') {
        nextEl = nextEl.nextElementSibling;
      }
      if (nextEl) {
        (nextEl as HTMLInputElement).focus();
      }
    }
  };

  const getExpiryStatus = (item: InventoryItem) => {
    const { ed_dd, ed_mm, ed_yy } = item;
    if (!ed_dd || !ed_mm || !ed_yy || ed_yy.length < 4) return 'normal';

    const day = parseInt(ed_dd);
    const month = parseInt(ed_mm) - 1;
    const year = parseInt(ed_yy);
    const expiryDate = new Date(year, month, day);

    if (isNaN(expiryDate.getTime())) return 'normal';

    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);

    const warningLimit = new Date(today);
    warningLimit.setMonth(warningLimit.getMonth() + 3);

    if (expiryDate < today) return 'expired';
    if (expiryDate <= warningLimit) return 'warning';
    return 'normal';
  };

  const renderSupervisorSignature = () => {
    const sig = signatures.supervisor;
    const hasData = sig.nama && sig.nip;
    const qrData = encodeURIComponent(`Verified Stock Opname: ${sig.nama} - NIP: ${sig.nip} - Time: ${sig.timestamp || currentDate.toLocaleDateString()}`);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}`;

    return (
      <div className="mt-8 flex flex-col items-start">
        <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest pl-2 border-l-4 border-blue-600 mb-4">
          Pengesahan Stock Opname
        </h3>
        <div className="w-full max-w-sm flex flex-col p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3 transition-colors duration-300">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Supervisor Unit
            </p>
            {sig.timestamp && (
              <p className="text-[8px] font-bold text-slate-400 dark:text-slate-600 tracking-tighter italic">
                {sig.timestamp}
              </p>
            )}
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase">Nama Lengkap</label>
            <input
              type="text"
              className="w-full px-3 py-2 text-xs font-bold border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              placeholder="Nama Supervisor..."
              value={sig.nama}
              onChange={(e) => onUpdateSignature('supervisor', 'nama', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase">Nomor NIP</label>
            <input
              type="text"
              className="w-full px-3 py-2 text-xs font-bold border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              placeholder="NIP Supervisor..."
              value={sig.nip}
              onChange={(e) => onUpdateSignature('supervisor', 'nip', e.target.value)}
            />
          </div>

          <div className="flex flex-col items-center justify-center py-4 border-t border-slate-100 dark:border-slate-800 mt-2 gap-3">
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-tighter">QR VERIFICATION</p>
            <div className="w-28 h-28 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden">
              {hasData ? (
                <img src={qrUrl} alt="Signature QR" className="w-full h-full p-1 dark:invert-[0.05]" />
              ) : (
                <div className="flex flex-col items-center gap-1 opacity-20 dark:opacity-40">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  <span className="text-[8px] font-black uppercase text-slate-400">Ready</span>
                </div>
              )}
            </div>
            {hasData && (
              <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-500 uppercase bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                Verified Signatory
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full gap-6">
      <div className="flex flex-col w-full overflow-hidden bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors duration-300">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-xl">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 dark:text-slate-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </span>
            <input
              type="text"
              className="block w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
              placeholder="Cari Nama Item atau Kode ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 self-end md:self-center">
            <button
              onClick={onAddItem}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-bold text-xs shadow-lg shadow-blue-100 dark:shadow-blue-900/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path>
              </svg>
              <span>Tambah Item</span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{filteredItems.length} ITEMS</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-20 transition-colors">
              <tr>
                <th className="px-4 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 w-12">NO</th>
                <th className="px-4 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 min-w-[200px]">NAMA ITEM</th>
                <th className="px-4 py-4 text-center text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 w-24">SISTEM</th>
                <th className="px-4 py-4 text-center text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 w-28">FISIK</th>
                <th className="px-4 py-4 text-center text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 w-24">SELISIH</th>
                <th className="px-4 py-4 text-center text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 w-52">TGL EXPIRED</th>
                <th className="px-4 py-4 text-center text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 w-20">AKSI</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
              {filteredItems.map((item) => {
                const isEditing = editingId === item.idItem;
                const selisihVal = typeof item.selisih === 'number' ? item.selisih : null;
                const isShortage = selisihVal !== null && selisihVal < 0;
                const isSurplus = selisihVal !== null && selisihVal > 0;
                const isChecked = item.fisik !== "";
                const expStatus = getExpiryStatus(item);
                
                let rowBgClass = '';
                if (isShortage) rowBgClass = 'bg-red-50/40 dark:bg-red-950/20';
                else if (isSurplus) rowBgClass = 'bg-blue-50/40 dark:bg-blue-950/20';
                else if (isChecked) rowBgClass = 'bg-emerald-50/10 dark:bg-emerald-500/5';

                return (
                  <tr key={item.idItem} className={`group transition-colors hover:bg-slate-100/50 dark:hover:bg-slate-800/40 ${rowBgClass}`}>
                    <td className="px-4 py-4 text-xs text-slate-400 dark:text-slate-600 font-bold whitespace-nowrap text-center">{item.no}</td>
                    <td className="px-4 py-4">
                      {isEditing ? (
                        <input
                          type="text"
                          className="w-full px-2 py-1 text-sm font-bold border border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      ) : (
                        <>
                          <div className={`text-sm font-bold leading-tight group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors break-words max-w-[200px] lg:max-w-none ${
                            isShortage ? 'text-red-700 dark:text-red-400' : 
                            isSurplus ? 'text-blue-700 dark:text-blue-400' : 
                            'text-slate-800 dark:text-slate-200'
                          }`}>
                            {item.namaItem}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 dark:text-slate-600 mt-1 flex items-center gap-1">
                             <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 11h.01M7 15h.01M13 7h.01M13 11h.01M13 15h.01M17 7h.01M17 11h.01M17 15h.01"></path></svg>
                             <span className="truncate">{item.idItem}</span>
                          </div>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          className="w-16 px-2 py-1 text-sm font-black border border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-center focus:ring-2 focus:ring-blue-500 outline-none"
                          value={editSistem}
                          onChange={(e) => setEditSistem(Number(e.target.value))}
                        />
                      ) : (
                        <span className="px-3 py-1 text-sm font-black text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          {item.sistem}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <input
                        type="number"
                        inputMode="numeric"
                        className={`w-16 md:w-20 px-2 py-2 text-sm border-2 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-center font-black transition-all ${
                          isShortage ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                          isSurplus ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                          isChecked 
                            ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                            : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                        placeholder="0"
                        value={item.fisik}
                        onChange={(e) => handlePhysicalChange(item.idItem, e.target.value, item.sistem)}
                      />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className={`inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded-lg text-sm font-black transition-all ${
                        isShortage 
                          ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 ring-1 ring-red-200 dark:ring-red-900' 
                          : isSurplus
                            ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 ring-1 ring-blue-200 dark:ring-blue-900'
                            : isChecked 
                              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 ring-1 ring-emerald-200 dark:ring-emerald-900'
                              : 'text-slate-300 dark:text-slate-700'
                      }`}>
                        {selisihVal !== null ? (selisihVal > 0 ? `+${selisihVal}` : selisihVal) : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`flex items-center justify-center gap-0.5 md:gap-1 p-1 rounded-lg transition-all ${
                          expStatus !== 'normal' ? 'bg-red-50 dark:bg-red-900/20 ring-2 ring-red-500 ring-offset-1 dark:ring-offset-slate-900' : ''
                        }`}>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="DD"
                            maxLength={2}
                            className={`w-9 md:w-11 px-1 py-2 text-[10px] md:text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-center outline-none focus:border-blue-500 focus:bg-blue-50 dark:focus:bg-slate-700 font-bold text-slate-800 dark:text-slate-200 ${
                              expStatus !== 'normal' ? 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-900' : ''
                            }`}
                            value={item.ed_dd}
                            onChange={(e) => handleDateInput(e, item.idItem, 'ed_dd', 2)}
                          />
                          <span className={expStatus !== 'normal' ? 'text-red-300 dark:text-red-900' : 'text-slate-300 dark:text-slate-700'}>/</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="MM"
                            maxLength={2}
                            className={`w-9 md:w-11 px-1 py-2 text-[10px] md:text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-center outline-none focus:border-blue-500 focus:bg-blue-50 dark:focus:bg-slate-700 font-bold text-slate-800 dark:text-slate-200 ${
                              expStatus !== 'normal' ? 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-900' : ''
                            }`}
                            value={item.ed_mm}
                            onChange={(e) => handleDateInput(e, item.idItem, 'ed_mm', 2)}
                          />
                          <span className={expStatus !== 'normal' ? 'text-red-300 dark:text-red-900' : 'text-slate-300 dark:text-slate-700'}>/</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="YYYY"
                            maxLength={4}
                            className={`w-14 md:w-16 px-1 py-2 text-[10px] md:text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-center outline-none focus:border-blue-500 focus:bg-blue-50 dark:focus:bg-slate-700 font-bold text-slate-800 dark:text-slate-200 ${
                              expStatus !== 'normal' ? 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-900' : ''
                            }`}
                            value={item.ed_yy}
                            onChange={(e) => handleDateInput(e, item.idItem, 'ed_yy', 4)}
                          />
                        </div>
                        {expStatus !== 'normal' && (
                          <div className="flex items-center gap-1">
                             <span className={`text-[9px] font-black uppercase tracking-tighter ${expStatus === 'expired' ? 'text-red-700 dark:text-red-400' : 'text-red-500 dark:text-red-400'}`}>
                               {expStatus === 'expired' ? '⚠️ EXPIRED' : '⚠️ < 3 BULAN'}
                             </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => saveEditing(item.idItem)}
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
                              setDeleteConfirm({ id: item.idItem, name: item.namaItem });
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-300 dark:text-slate-700 bg-slate-50/50 dark:bg-slate-800/20 transition-colors">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-300 dark:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <p className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">{items.length === 0 ? "Menunggu Data..." : "Tidak ada item ditemukan"}</p>
          </div>
        )}
      </div>
      
      {renderSupervisorSignature()}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Hapus Item?</h3>
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
                    onRemoveItem(deleteConfirm.id);
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

export default InventoryTable;

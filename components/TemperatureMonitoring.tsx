
import React, { useState, useMemo, useEffect } from 'react';
import { TemperatureEntry } from '../types';
import { MONTHS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TemperatureMonitoringProps {
  entries: TemperatureEntry[];
  onUpdate: (date: string, type: 'room' | 'cold', timeSlot: 'pagi' | 'siang' | 'malam' | 'humidity', value: number | string) => void;
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  activeTab: string;
}

const TemperatureMonitoring: React.FC<TemperatureMonitoringProps> = ({
  entries,
  onUpdate,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  activeTab
}) => {
  const [formDate, setFormDate] = useState(() => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  });
  const [tempValue, setTempValue] = useState<string>('');
  const [humidityValue, setHumidityValue] = useState<string>('');
  const [tempType, setTempType] = useState<'room' | 'cold'>('room');
  
  // Detect current shift
  const getCurrentShift = (): 'pagi' | 'siang' | 'malam' => {
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 14) return 'pagi';
    if (hour >= 14 && hour < 20) return 'siang';
    return 'malam';
  };

  const [selectedShift, setSelectedShift] = useState<'pagi' | 'siang' | 'malam'>(getCurrentShift());

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedMonth, selectedYear]);

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const formatChartData = (type: 'room' | 'cold') => {
    return daysArray.map(day => {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const entry = entries.find(e => e.date === dateStr && e.type === type);
      return {
        day: day,
        pagi: (entry?.pagi !== undefined && entry?.pagi !== '') ? Number(entry.pagi) : null,
        siang: (entry?.siang !== undefined && entry?.siang !== '') ? Number(entry.siang) : null,
        malam: (entry?.malam !== undefined && entry?.malam !== '') ? Number(entry.malam) : null,
        humidity: (entry?.humidity !== undefined && entry?.humidity !== '') ? Number(entry.humidity) : null,
      };
    });
  };

  const roomChartData = useMemo(() => formatChartData('room'), [entries, daysArray, selectedMonth, selectedYear]);
  const coldChartData = useMemo(() => formatChartData('cold'), [entries, daysArray, selectedMonth, selectedYear]);
  const periodStr = `${MONTHS[selectedMonth]} ${selectedYear}`;

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text(`LOG MONITORING SUHU DAILY - ${activeTab}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Periode: ${periodStr}`, 14, 28);
    
    doc.setFontSize(12);
    doc.text('1. SUHU RUANGAN (Suhu Normal: 15-25°C)', 14, 38);
    
    const roomTable = daysArray.map(day => {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const e = entries.find(entry => entry.date === dateStr && entry.type === 'room');
      return [day, e?.pagi || '-', e?.siang || '-', e?.malam || '-', e?.humidity ? `${e.humidity}%` : '-'];
    });

    autoTable(doc, {
      startY: 42,
      head: [['Tgl', 'Pagi', 'Siang', 'Malam', 'Kelembapan']],
      body: roomTable,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text('2. SUHU COLD/KULKAS (Suhu Normal: 2-8°C)', 14, finalY);

    const coldTable = daysArray.map(day => {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const e = entries.find(entry => entry.date === dateStr && entry.type === 'cold');
      return [day, e?.pagi || '-', e?.siang || '-', e?.malam || '-', e?.humidity ? `${e.humidity}%` : '-'];
    });

    autoTable(doc, {
      startY: finalY + 4,
      head: [['Tgl', 'Pagi', 'Siang', 'Malam', 'Kelembapan']],
      body: coldTable,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
    });

    doc.save(`Monitoring_Suhu_${activeTab}_${MONTHS[selectedMonth]}_${selectedYear}.pdf`);
  };

  const handleSave = () => {
    if (tempValue) onUpdate(formDate, tempType, selectedShift, tempValue);
    if (humidityValue) onUpdate(formDate, tempType, 'humidity', humidityValue);
    setTempValue('');
    setHumidityValue('');
    alert('Data tersimpan!');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-32"
    >
      {/* Static Input Form */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Input Suhu & Kelembapan</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entry Data Terpusat Unit {activeTab}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
             <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Jenis Lokasi</label>
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button onClick={() => setTempType('room')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${tempType === 'room' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500'}`}>Ruang</button>
                <button onClick={() => setTempType('cold')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${tempType === 'cold' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Cold</button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Waktu / Shift</label>
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {['pagi', 'siang', 'malam'].map(s => (
                  <button key={s} onClick={() => setSelectedShift(s as any)} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${selectedShift === s ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}>{s}</button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="lg:col-span-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Tanggal</label>
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-0 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Suhu (°C)</label>
                <input type="number" step="0.1" value={tempValue} onChange={(e) => setTempValue(e.target.value)} placeholder="00.0" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-0 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">HR (%)</label>
                <input type="number" value={humidityValue} onChange={(e) => setHumidityValue(e.target.value)} placeholder="%" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-0 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <button onClick={handleSave} className="h-[42px] bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/20">Simpan</button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-2">
            <select value={selectedMonth} onChange={(e) => onMonthChange(parseInt(e.target.value))} className="px-4 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 transition-all">{MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}</select>
            <select value={selectedYear} onChange={(e) => onYearChange(parseInt(e.target.value))} className="px-4 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 transition-all">{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
        </div>
        <button onClick={handleExportPDF} className="flex items-center gap-2 px-6 py-2 bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Sertifikat Monitoring PDF
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Room Chart */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Grafik Suhu Ruang</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Standar: 15°C - 25°C</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pagi</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Siang</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Malam</span>
              </div>
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={roomChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRoomPagi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRoomSiang" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRoomMalam" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.5} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 800 }} interval={0} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 800 }} domain={[0, 40]} />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                  cursor={{ stroke: '#3B82F6', strokeWidth: 2, strokeDasharray: '5 5' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="pagi" 
                  stroke="#3B82F6" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorRoomPagi)" 
                  connectNulls={true}
                  isAnimationActive={false}
                  dot={{ r: 4, strokeWidth: 2, fill: '#3B82F6', stroke: 'white' }}
                  activeDot={{ r: 6 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="siang" 
                  stroke="#F97316" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorRoomSiang)" 
                  connectNulls={true}
                  isAnimationActive={false}
                  dot={{ r: 4, strokeWidth: 2, fill: '#F97316', stroke: 'white' }}
                  activeDot={{ r: 6 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="malam" 
                  stroke="#6366F1" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorRoomMalam)" 
                  connectNulls={true}
                  isAnimationActive={false}
                  dot={{ r: 4, strokeWidth: 2, fill: '#6366F1', stroke: 'white' }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cold Chart */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Grafik Suhu Cold/Kulkas</h3>
              <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-1">Standar: 2°C - 8°C</p>
            </div>
            <div className="flex gap-4">
               <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pagi</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"></div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Siang</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]"></div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Malam</span>
              </div>
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={coldChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorColdPagi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorColdSiang" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorColdMalam" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#14B8A6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.5} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 800 }} interval={0} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 800 }} domain={[0, 15]} />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                  cursor={{ stroke: '#10B981', strokeWidth: 2, strokeDasharray: '5 5' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="pagi" 
                  stroke="#10B981" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorColdPagi)" 
                  connectNulls={true}
                  isAnimationActive={false}
                  dot={{ r: 4, strokeWidth: 2, fill: '#10B981', stroke: 'white' }}
                  activeDot={{ r: 6 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="siang" 
                  stroke="#06B6D4" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorColdSiang)" 
                  connectNulls={true}
                  isAnimationActive={false}
                  dot={{ r: 4, strokeWidth: 2, fill: '#06B6D4', stroke: 'white' }}
                  activeDot={{ r: 6 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="malam" 
                  stroke="#14B8A6" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorColdMalam)" 
                  connectNulls={true}
                  isAnimationActive={false}
                  dot={{ r: 4, strokeWidth: 2, fill: '#14B8A6', stroke: 'white' }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Summary Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            Summary Data Bulanan ({periodStr})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tgl</th>
                <th className="p-3 text-[10px] font-black text-blue-500 uppercase tracking-widest text-center">Ruang (P/S/M)</th>
                <th className="p-3 text-[10px] font-black text-emerald-500 uppercase tracking-widest text-center">Cold (P/S/M)</th>
                <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">RH (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {daysArray.slice().reverse().map(day => {
                const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const room = entries.find(e => e.date === dateStr && e.type === 'room');
                const cold = entries.find(e => e.date === dateStr && e.type === 'cold');
                const hasData = room || cold;
                if (!hasData) return null;
                
                return (
                  <tr key={day} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="p-3 text-[10px] font-bold text-slate-600 dark:text-slate-400">{day} {MONTHS[selectedMonth].substring(0,3)}</td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1">
                        <span className={`px-1 rounded ${room?.pagi ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'text-slate-300'} text-[9px] font-bold`}>{room?.pagi || '-'}</span>
                        <span className={`px-1 rounded ${room?.siang ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' : 'text-slate-300'} text-[9px] font-bold`}>{room?.siang || '-'}</span>
                        <span className={`px-1 rounded ${room?.malam ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'text-slate-300'} text-[9px] font-bold`}>{room?.malam || '-'}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1">
                        <span className={`px-1 rounded ${cold?.pagi ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'text-slate-300'} text-[9px] font-bold`}>{cold?.pagi || '-'}</span>
                        <span className={`px-1 rounded ${cold?.siang ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600' : 'text-slate-300'} text-[9px] font-bold`}>{cold?.siang || '-'}</span>
                        <span className={`px-1 rounded ${cold?.malam ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600' : 'text-slate-300'} text-[9px] font-bold`}>{cold?.malam || '-'}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="text-[9px] font-bold text-slate-500">
                        {room?.humidity || cold?.humidity ? `${room?.humidity || cold?.humidity}%` : '-'}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {entries.filter(e => {
                const [y, m] = e.date.split('-').map(Number);
                return y === selectedYear && m === (selectedMonth + 1);
              }).length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Belum ada data untuk bulan ini</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default TemperatureMonitoring;

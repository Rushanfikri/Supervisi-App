
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import InventoryTable from './components/InventoryTable';
import SupervisionForm from './components/SupervisionForm';
import TemperatureMonitoring from './components/TemperatureMonitoring';
import Login from './components/Login';
import { Department, InventoryItem, AppView, SupervisionSection, SupervisionItem, SupervisionSignatures, TemperatureEntry } from './types';
import { ICU_SHEET_URL, IBS_SHEET_URL, MONTHS, YEARS, CLOUD_SYNC_ID } from './constants';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from './firebaseConfig';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const STORAGE_KEY_ICU = 'rs_inventory_icu_data_v2';
const STORAGE_KEY_IBS = 'rs_inventory_ibs_data_v2';
const STORAGE_KEY_SUP_ICU = 'rs_supervision_icu_v1';
const STORAGE_KEY_SUP_IBS = 'rs_supervision_ibs_v1';
const STORAGE_KEY_SIG_ICU = 'rs_signatures_icu_v1';
const STORAGE_KEY_SIG_IBS = 'rs_signatures_ibs_v1';
const STORAGE_KEY_TEMP_ICU = 'rs_temperature_icu_v1';
const STORAGE_KEY_TEMP_IBS = 'rs_temperature_ibs_v1';
const STORAGE_KEY_TIMESTAMP = 'rs_inventory_last_update';
const STORAGE_KEY_AUTH = 'rs_inventory_auth_status';
const STORAGE_KEY_CUSTOM_UNITS = 'rs_inventory_custom_units';
const STORAGE_KEY_CUSTOM_DATA = 'rs_inventory_custom_data';
const STORAGE_KEY_CUSTOM_SUP = 'rs_supervision_custom_data';
const STORAGE_KEY_CUSTOM_SIG = 'rs_signatures_custom_data';
const STORAGE_KEY_CUSTOM_TEMP = 'rs_temperature_custom_data';

const INITIAL_SIGNATURES: SupervisionSignatures = {
  supervisor: { nama: '', nip: '', timestamp: '' },
  kaRuang: { nama: '', nip: '', timestamp: '' },
  kaInstalasi: { nama: '', nip: '', timestamp: '' }
};

const INITIAL_SUPERVISION_SECTIONS: SupervisionSection[] = [
  {
    title: 'A. PENYIMPANAN OBAT/ BMHP DI RUANG PERAWATAN',
    items: [
      { id: 'a1', uraian: 'Ada Identitas pasien di setiap kotak penyimpanan obat pasien', sesuai: null, temuan: '', tindakLanjut: '' },
      { id: 'a2', uraian: 'Lemari/ kotak obat pasien disimpan di lokasi yang aman', sesuai: null, temuan: '', tindakLanjut: '' },
      { id: 'a3', uraian: 'Jumlah sisa obat pasien sesuai dengan instruksi pemakaian obat', sesuai: null, temuan: '', tindakLanjut: '' },
      { id: 'a4', uraian: 'Jumlah BMHP sesuai dengan SIM RS dan kartu stok', sesuai: null, temuan: '', tindakLanjut: '' },
      { id: 'a5', uraian: 'Tidak terdapat obat/ BMHP yang ED', sesuai: null, temuan: '', tindakLanjut: '' },
      { id: 'a6', uraian: 'Obat and BMHP yang mendekati ED diberikan label peringatan khusus', sesuai: null, temuan: '', tindakLanjut: '' },
      { id: 'a7', uraian: 'Terdapat Form pantauan suhu ruang, kulkas and kelembapan ruang penyimpanan obat yang terisi (Suhu ruang: 15-30°C, suhu kulkas: 2-8°C)', sesuai: null, temuan: '', tindakLanjut: '' },
      { id: 'a8', uraian: 'Tempat penyimpanan obat dan BMHP tidak bercampur', sesuai: null, temuan: '', tindakLanjut: '' },
      { id: 'a9', uraian: 'Obat multidose yang masih akan digunakan lagi diberikan label BUD and ditutup dengan menggunakan parafilm', sesuai: null, temuan: '', tindakLanjut: '' },
    ]
  },
  {
    title: 'B. LEMBAR MONITORING PEMBERIAN OBAT',
    items: [
      { id: 'b1', uraian: 'Nama obat, dosis, frekuensi, rute/cara pemakaian diisi lengkap', sesuai: null, temuan: '', tindakLanjut: '' },
      { id: 'b2', uraian: 'Ada paraf pemberi obat', sesuai: null, temuan: '', tindakLanjut: '' },
      { id: 'b3', uraian: 'Ada double check dua petugas untuk pemberian obat HAM dan LASA', sesuai: null, temuan: '', tindakLanjut: '' },
    ]
  },
  {
    title: 'C. TROLI EMERGENSI',
    items: [
      { id: 'c1', uraian: 'Ada daftar obat, jumlah and kedaluarsa pada troli / kotak emergensi', sesuai: null, temuan: '', tindakLanjut: '' },
      { id: 'c2', uraian: 'Troli/kotak emergensi diletakkan ditempat yang mudah diakses petugas and aman dari pencurian', sesuai: null, temuan: '', tindakLanjut: '' },
      { id: 'c3', uraian: 'Troli / kotak emergensi terkunci /tersegel', sesuai: null, temuan: '', tindakLanjut: '' },
      { id: 'c4', uraian: 'Troli / kotak emergensi dalam keadaan bersih, tidak digunakan untuk menyimpan barang lain', sesuai: null, temuan: '', tindakLanjut: '' },
      { id: 'c5', uraian: 'Tidak ada obat/bmhp kedaluarsa and rusak di dalam troli / kotak emergensi, obat/bmhp mendekati ED 3 bulan harus diganti bila stok mencukupi di Instalasi Farmasi', sesuai: null, temuan: '', tindakLanjut: '' },
      { id: 'c6', uraian: 'Penggantian obat/bmhp emergensi yang dipakai oleh dokter/perawat dicatat dalam form penggunaan troli', sesuai: null, temuan: '', tindakLanjut: '' },
      { id: 'c7', uraian: 'Penggantian segel troli emergensi yang telah dirusak juga tercatat dalam form supervisi/ penggunaan troli', sesuai: null, temuan: '', tindakLanjut: '' },
      { id: 'c8', uraian: 'Obat/bmhp emergensi yang digunakan dokter/perawat harus digantikan dalam waktu maximal 2 jam setelah form di terima petugas farmasi', sesuai: null, temuan: '', tindakLanjut: '' },
    ]
  },
  {
    title: 'D. HIGH ALERT MEDICATION DAN LASA',
    items: [
      { id: 'd1', uraian: 'Ada daftar obat HAM & LASA', sesuai: null, temuan: '', tindakLanjut: '' },
      { id: 'd2', uraian: 'Obat HAM dan LASA terlabel', sesuai: null, temuan: '', tindakLanjut: '' },
    ]
  },
  {
    title: 'E. PENYIMPANAN B3',
    items: [
      { id: 'e1', uraian: 'Disimpan dalam lemari tersendiri and diberikan penandaan', sesuai: null, temuan: '', tindakLanjut: '' },
      { id: 'e2', uraian: 'Setiap B3 diberikan label sesuai peringatan khususnya', sesuai: null, temuan: '', tindakLanjut: '' },
      { id: 'e3', uraian: 'Memiliki MSDS untuk semua B3 yang disimpan di ruangan', sesuai: null, temuan: '', tindakLanjut: '' },
    ]
  }
];

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_AUTH) === 'true';
  });
  const [isGuestMode, setIsGuestMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<Department>('ICU');
  const [view, setView] = useState<AppView>('inventory');
  const [refreshId, setRefreshId] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");

  const lastCloudUpdate = useRef<number>(Number(localStorage.getItem(STORAGE_KEY_TIMESTAMP) || 0));
  const isInternalChange = useRef<boolean>(false);
  const isInitialSyncDone = useRef<boolean>(false);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  // Period state for Supervision
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000); 
    
    // Check for guest view in URL (e.g. ?view=ICU)
    const params = new URLSearchParams(window.location.search);
    const guestView = params.get('view');
    if (guestView) {
      const dept = guestView.toUpperCase() as Department;
      // We allow standard depts OR matching custom depts (case sensitive for custom)
      if (['ICU', 'IBS'].includes(dept)) {
        setActiveTab(dept);
        setIsGuestMode(true);
      } else {
        const customUnitsStr = localStorage.getItem(STORAGE_KEY_CUSTOM_UNITS);
        if (customUnitsStr) {
          try {
            const customUnits = JSON.parse(customUnitsStr) as string[];
            if (customUnits.includes(guestView)) {
              setActiveTab(guestView as Department);
              setIsGuestMode(true);
            }
          } catch (e) {
            console.error("Error parsing custom units", e);
          }
        }
      }
    }
    
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    localStorage.setItem(STORAGE_KEY_AUTH, 'true');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem(STORAGE_KEY_AUTH);
  };

  const formattedDate = useMemo(() => {
    return now.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [now]);

  // Inventory Data State
  const [icuData, setIcuData] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ICU);
    return saved ? JSON.parse(saved) : [];
  });

  const [ibsData, setIbsData] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_IBS);
    return saved ? JSON.parse(saved) : [];
  });

  // Supervision Data State
  const [icuSupervision, setIcuSupervision] = useState<SupervisionSection[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SUP_ICU);
    return saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(INITIAL_SUPERVISION_SECTIONS));
  });

  const [ibsSupervision, setIbsSupervision] = useState<SupervisionSection[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SUP_IBS);
    return saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(INITIAL_SUPERVISION_SECTIONS));
  });

  // Signature State
  const [icuSignatures, setIcuSignatures] = useState<SupervisionSignatures>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SIG_ICU);
    return saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(INITIAL_SIGNATURES));
  });

  const [ibsSignatures, setIbsSignatures] = useState<SupervisionSignatures>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SIG_IBS);
    return saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(INITIAL_SIGNATURES));
  });

  const [customUnits, setCustomUnits] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_UNITS);
    return saved ? JSON.parse(saved) : [];
  });

  const [customData, setCustomData] = useState<Record<string, InventoryItem[]>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_DATA);
    return saved ? JSON.parse(saved) : {};
  });

  const [customSupervision, setCustomSupervision] = useState<Record<string, SupervisionSection[]>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_SUP);
    return saved ? JSON.parse(saved) : {};
  });

  const [customSignatures, setCustomSignatures] = useState<Record<string, SupervisionSignatures>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_SIG);
    return saved ? JSON.parse(saved) : {};
  });

  const [icuTemperature, setIcuTemperature] = useState<TemperatureEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TEMP_ICU);
    return saved ? JSON.parse(saved) : [];
  });

  const [ibsTemperature, setIbsTemperature] = useState<TemperatureEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TEMP_IBS);
    return saved ? JSON.parse(saved) : [];
  });

  const [customTemperature, setCustomTemperature] = useState<Record<string, TemperatureEntry[]>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_TEMP);
    return saved ? JSON.parse(saved) : {};
  });

  const parseGvizResponse = (responseText: string): InventoryItem[] => {
    try {
      const jsonString = responseText.match(/setResponse\((.*)\);/)?.[1];
      if (!jsonString) throw new Error("Format data tidak valid");
      const data = JSON.parse(jsonString);
      const rows = data.table.rows;
      return rows
        .map((row: any, index: number) => {
          const cols = row.c;
          const rawId = cols[1]?.v !== null ? String(cols[1]?.v).trim() : "";
          return {
            no: cols[0]?.v || index + 1,
            idItem: rawId,
            namaItem: String(cols[2]?.v || "").trim(),
            sistem: Number(cols[3]?.v || 0),
            fisik: "",
            selisih: "",
            ed_dd: "",
            ed_mm: "",
            ed_yy: ""
          };
        })
        .filter((item: any) => item.namaItem && item.namaItem.toLowerCase() !== "nama item" && item.idItem !== "");
    } catch (e) {
      console.error("Parsing error", e);
      return [];
    }
  };

  const fetchData = useCallback(async (dept: Department, forceReset: boolean = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = dept === 'ICU' ? ICU_SHEET_URL : IBS_SHEET_URL;
      const response = await fetch(url);
      const text = await response.text();
      const freshItems = parseGvizResponse(text);
      const updateData = (prev: InventoryItem[]) => {
        if (forceReset || prev.length === 0) return freshItems;
        return freshItems.map(newItem => {
          const existing = prev.find(p => String(p.idItem).trim().toLowerCase() === String(newItem.idItem).trim().toLowerCase());
          if (existing) {
            let newSelisih: number | string = "";
            if (existing.fisik !== "" && typeof existing.fisik === 'number') {
              newSelisih = existing.fisik - newItem.sistem;
            }
            return { ...newItem, fisik: existing.fisik, selisih: newSelisih, ed_dd: existing.ed_dd, ed_mm: existing.ed_mm, ed_yy: existing.ed_yy };
          }
          return newItem;
        });
      };
      if (dept === 'ICU') setIcuData(updateData);
      else setIbsData(updateData);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Gagal mengambil data sistem terbaru. Menampilkan data lokal terakhir.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleManualSync = async () => {
    if (!isLoggedIn) return;
    setIsSyncing(true);
    try {
      const timestamp = Date.now();
      const payload = {
        icuData, ibsData, icuSupervision, ibsSupervision, icuSignatures, ibsSignatures,
        icuTemperature, ibsTemperature, customUnits, customData, customSupervision, customSignatures, customTemperature,
        timestamp,
        syncId: CLOUD_SYNC_ID
      };

      await setDoc(doc(db, "sync", CLOUD_SYNC_ID), payload, { merge: true });
      lastCloudUpdate.current = timestamp;
      localStorage.setItem(STORAGE_KEY_TIMESTAMP, timestamp.toString());
      alert("✅ Data berhasil disimpan ke Cloud!"); 
    } catch (e) {
      console.error("Sync failed", e);
      alert("❌ Gagal menyimpan ke Cloud. Cek koneksi internet.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Real-time Listener (Hanya download)
  useEffect(() => {
    if (!isLoggedIn) return;
    const unsubscribe = onSnapshot(doc(db, "sync", CLOUD_SYNC_ID), (snapshot) => {
      if (snapshot.exists()) {
        const remote = snapshot.data();
        
        // Hanya update jika ini sinkronisasi pertama kali ATAU data cloud lebih baru dari local timestamp
        if (!isInitialSyncDone.current || (remote.timestamp && remote.timestamp > lastCloudUpdate.current)) {
          console.log("Menerima data terbaru dari cloud...");
          isInternalChange.current = true;
          
          if (remote.icuData) setIcuData(remote.icuData);
          if (remote.ibsData) setIbsData(remote.ibsData);
          if (remote.icuSupervision) setIcuSupervision(remote.icuSupervision);
          if (remote.ibsSupervision) setIbsSupervision(remote.ibsSupervision);
          if (remote.icuSignatures) setIcuSignatures(remote.icuSignatures);
          if (remote.ibsSignatures) setIbsSignatures(remote.ibsSignatures);
          if (remote.icuTemperature) setIcuTemperature(remote.icuTemperature);
          if (remote.ibsTemperature) setIbsTemperature(remote.ibsTemperature);
          if (remote.customUnits) setCustomUnits(remote.customUnits);
          if (remote.customData) setCustomData(remote.customData);
          if (remote.customSupervision) setCustomSupervision(remote.customSupervision);
          if (remote.customSignatures) setCustomSignatures(remote.customSignatures);
          if (remote.customTemperature) setCustomTemperature(remote.customTemperature);
          
          lastCloudUpdate.current = remote.timestamp || Date.now();
          localStorage.setItem(STORAGE_KEY_TIMESTAMP, lastCloudUpdate.current.toString());
        }
      }
      isInitialSyncDone.current = true;
    }, (err) => {
      console.error("Snapshot error:", err);
      isInitialSyncDone.current = true;
    });

    return () => unsubscribe();
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (icuData.length === 0 && !isLoading) fetchData('ICU');
    if (ibsData.length === 0 && !isLoading) fetchData('IBS');
  }, [fetchData, icuData.length, ibsData.length, isLoading, isLoggedIn]);

  // Persistence (Local)
  useEffect(() => {
    if (isLoggedIn && icuData.length > 0) localStorage.setItem(STORAGE_KEY_ICU, JSON.stringify(icuData));
  }, [icuData, isLoggedIn]);
  useEffect(() => {
    if (isLoggedIn && ibsData.length > 0) localStorage.setItem(STORAGE_KEY_IBS, JSON.stringify(ibsData));
  }, [ibsData, isLoggedIn]);
  useEffect(() => {
    if (isLoggedIn) localStorage.setItem(STORAGE_KEY_SUP_ICU, JSON.stringify(icuSupervision));
  }, [icuSupervision, isLoggedIn]);
  useEffect(() => {
    if (isLoggedIn) localStorage.setItem(STORAGE_KEY_SUP_IBS, JSON.stringify(ibsSupervision));
  }, [ibsSupervision, isLoggedIn]);
  useEffect(() => {
    if (isLoggedIn) localStorage.setItem(STORAGE_KEY_SIG_ICU, JSON.stringify(icuSignatures));
  }, [icuSignatures, isLoggedIn]);
  useEffect(() => {
    if (isLoggedIn) localStorage.setItem(STORAGE_KEY_SIG_IBS, JSON.stringify(ibsSignatures));
  }, [ibsSignatures, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) localStorage.setItem(STORAGE_KEY_CUSTOM_UNITS, JSON.stringify(customUnits));
  }, [customUnits, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) localStorage.setItem(STORAGE_KEY_CUSTOM_DATA, JSON.stringify(customData));
  }, [customData, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) localStorage.setItem(STORAGE_KEY_CUSTOM_SUP, JSON.stringify(customSupervision));
  }, [customSupervision, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) localStorage.setItem(STORAGE_KEY_CUSTOM_SIG, JSON.stringify(customSignatures));
  }, [customSignatures, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) localStorage.setItem(STORAGE_KEY_TEMP_ICU, JSON.stringify(icuTemperature));
  }, [icuTemperature, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) localStorage.setItem(STORAGE_KEY_TEMP_IBS, JSON.stringify(ibsTemperature));
  }, [ibsTemperature, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) localStorage.setItem(STORAGE_KEY_CUSTOM_TEMP, JSON.stringify(customTemperature));
  }, [customTemperature, isLoggedIn]);

  const handleUpdateItem = useCallback((id: string, field: keyof InventoryItem, value: any) => {
    const updateFn = (prev: InventoryItem[]) => prev.map(item => item.idItem === id ? { ...item, [field]: value } : item);
    if (activeTab === 'ICU') setIcuData(updateFn);
    else if (activeTab === 'IBS') setIbsData(updateFn);
    else setCustomData(prev => ({ ...prev, [activeTab]: updateFn(prev[activeTab] || []) }));
    isInternalChange.current = false; // Tandai bahwa ada perubahan data oleh user
  }, [activeTab]);

  const handleAddItem = useCallback(() => {
    const newItem: InventoryItem = {
      no: 0, // Will be recalculated if needed, but usually we just append
      idItem: `NEW-${Date.now()}`,
      namaItem: "Item Baru",
      sistem: 0,
      fisik: "",
      selisih: "",
      ed_dd: "",
      ed_mm: "",
      ed_yy: ""
    };

    const updateFn = (prev: InventoryItem[]) => {
      const next = [...prev, { ...newItem, no: prev.length + 1 }];
      return next;
    };

    if (activeTab === 'ICU') setIcuData(updateFn);
    else if (activeTab === 'IBS') setIbsData(updateFn);
    else setCustomData(prev => ({ ...prev, [activeTab]: updateFn(prev[activeTab] || []) }));
    isInternalChange.current = false;
  }, [activeTab]);

  const handleRemoveItem = useCallback((id: string) => {
    const updateFn = (prev: InventoryItem[]) => {
      const filtered = prev.filter(item => item.idItem !== id);
      // Recalculate numbers
      return filtered.map((item, idx) => ({ ...item, no: idx + 1 }));
    };

    if (activeTab === 'ICU') setIcuData(updateFn);
    else if (activeTab === 'IBS') setIbsData(updateFn);
    else setCustomData(prev => ({ ...prev, [activeTab]: updateFn(prev[activeTab] || []) }));
    isInternalChange.current = false;
  }, [activeTab]);

  const handleUpdateSupervision = useCallback((sIdx: number, iIdx: number, field: keyof SupervisionItem, value: any) => {
    const updateFn = (prev: SupervisionSection[]) => {
      const next = [...prev];
      const items = [...next[sIdx].items];
      items[iIdx] = { ...items[iIdx], [field]: value };
      next[sIdx] = { ...next[sIdx], items };
      return next;
    };
    if (activeTab === 'ICU') setIcuSupervision(updateFn);
    else if (activeTab === 'IBS') setIbsSupervision(updateFn);
    else setCustomSupervision(prev => ({ ...prev, [activeTab]: updateFn(prev[activeTab] || []) }));
    isInternalChange.current = false;
  }, [activeTab]);

  const handleAddCriteria = useCallback((sectionIndex: number) => {
    const updateFn = (prev: SupervisionSection[]) => {
      const next = [...prev];
      const newId = `${next[sectionIndex].title.charAt(0).toLowerCase()}${next[sectionIndex].items.length + 1}-${Date.now()}`;
      const newItem: SupervisionItem = {
        id: newId,
        uraian: 'Kriteria Baru',
        sesuai: null,
        temuan: '',
        tindakLanjut: ''
      };
      next[sectionIndex] = {
        ...next[sectionIndex],
        items: [...next[sectionIndex].items, newItem]
      };
      return next;
    };
    if (activeTab === 'ICU') setIcuSupervision(updateFn);
    else if (activeTab === 'IBS') setIbsSupervision(updateFn);
    else setCustomSupervision(prev => ({ ...prev, [activeTab]: updateFn(prev[activeTab] || []) }));
    isInternalChange.current = false;
  }, [activeTab]);

  const handleRemoveCriteria = useCallback((sectionIndex: number, itemIndex: number) => {
    const updateFn = (prev: SupervisionSection[]) => {
      const next = [...prev];
      const items = [...next[sectionIndex].items];
      items.splice(itemIndex, 1);
      next[sectionIndex] = { ...next[sectionIndex], items };
      return next;
    };
    if (activeTab === 'ICU') setIcuSupervision(updateFn);
    else if (activeTab === 'IBS') setIbsSupervision(updateFn);
    else setCustomSupervision(prev => ({ ...prev, [activeTab]: updateFn(prev[activeTab] || []) }));
    isInternalChange.current = false;
  }, [activeTab]);

  const handleUpdateSignature = useCallback((role: keyof SupervisionSignatures, field: 'nama' | 'nip', value: string) => {
    const updateFn = (prev: SupervisionSignatures) => {
      const ts = new Date().toLocaleString('id-ID', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }).replace(/\./g, ':');
      
      return {
        ...prev,
        [role]: { 
          ...prev[role], 
          [field]: value,
          timestamp: ts
        }
      };
    };
    if (activeTab === 'ICU') setIcuSignatures(updateFn);
    else if (activeTab === 'IBS') setIbsSignatures(updateFn);
    else setCustomSignatures(prev => ({ ...prev, [activeTab]: updateFn(prev[activeTab] || INITIAL_SIGNATURES) }));
    isInternalChange.current = false;
  }, [activeTab]);

  const handleUpdateTemperature = useCallback((date: string, type: 'room' | 'cold', timeSlot: 'pagi' | 'siang' | 'malam' | 'humidity', value: number | string) => {
    const updateFn = (prev: TemperatureEntry[]) => {
      const next = [...prev];
      const entryIdx = next.findIndex(e => e.date === date && e.type === type);
      if (entryIdx >= 0) {
        next[entryIdx] = { ...next[entryIdx], [timeSlot]: value };
      } else {
        next.push({ date, type, pagi: '', siang: '', malam: '', humidity: '', [timeSlot]: value });
      }
      return next;
    };
    if (activeTab === 'ICU') setIcuTemperature(updateFn);
    else if (activeTab === 'IBS') setIbsTemperature(updateFn);
    else setCustomTemperature(prev => ({ ...prev, [activeTab]: updateFn(prev[activeTab] || []) }));
    isInternalChange.current = false;
  }, [activeTab]);

  const handleStartAddUnit = useCallback(() => {
    setIsAddingUnit(true);
    setNewUnitName("");
  }, []);

  const handleCancelAddUnit = useCallback(() => {
    setIsAddingUnit(false);
    setNewUnitName("");
  }, []);

  const handleSaveUnit = useCallback(() => {
    if (!newUnitName.trim()) return;
    const normalizedName = newUnitName.trim().toUpperCase();
    if (normalizedName === 'ICU' || normalizedName === 'IBS' || customUnits.includes(normalizedName)) {
      alert("Unit sudah ada!");
      return;
    }
    setCustomUnits(prev => [...prev, normalizedName]);
    setCustomData(prev => ({ ...prev, [normalizedName]: [...ibsData] }));
    setCustomSupervision(prev => ({ ...prev, [normalizedName]: JSON.parse(JSON.stringify(ibsSupervision)) }));
    setCustomSignatures(prev => ({ ...prev, [normalizedName]: JSON.parse(JSON.stringify(INITIAL_SIGNATURES)) }));
    setCustomTemperature(prev => ({ ...prev, [normalizedName]: [] }));
    setActiveTab(normalizedName);
    setRefreshId(prev => prev + 1);
    setIsAddingUnit(false);
    setNewUnitName("");
  }, [newUnitName, customUnits, ibsData, ibsSupervision]);

  const handleReset = useCallback(async () => {
    console.log("Memulai proses Reset Total...");
    try {
      localStorage.removeItem(STORAGE_KEY_ICU);
      localStorage.removeItem(STORAGE_KEY_IBS);
      localStorage.removeItem(STORAGE_KEY_SUP_ICU);
      localStorage.removeItem(STORAGE_KEY_SUP_IBS);
      localStorage.removeItem(STORAGE_KEY_SIG_ICU);
      localStorage.removeItem(STORAGE_KEY_SIG_IBS);
      localStorage.removeItem(STORAGE_KEY_TIMESTAMP);
      localStorage.removeItem(STORAGE_KEY_CUSTOM_UNITS);
      localStorage.removeItem(STORAGE_KEY_CUSTOM_DATA);
      localStorage.removeItem(STORAGE_KEY_CUSTOM_SUP);
      localStorage.removeItem(STORAGE_KEY_CUSTOM_SIG);
      localStorage.removeItem(STORAGE_KEY_TEMP_ICU);
      localStorage.removeItem(STORAGE_KEY_TEMP_IBS);
      localStorage.removeItem(STORAGE_KEY_CUSTOM_TEMP);
      
      setIcuData([]);
      setIbsData([]);
      setIcuSupervision(JSON.parse(JSON.stringify(INITIAL_SUPERVISION_SECTIONS)));
      setIbsSupervision(JSON.parse(JSON.stringify(INITIAL_SUPERVISION_SECTIONS)));
      setIcuSignatures(JSON.parse(JSON.stringify(INITIAL_SIGNATURES)));
      setIbsSignatures(JSON.parse(JSON.stringify(INITIAL_SIGNATURES)));
      setIcuTemperature([]);
      setIbsTemperature([]);
      setCustomUnits([]);
      setCustomData({});
      setCustomSupervision({});
      setCustomSignatures({});
      setCustomTemperature({});
      
      setIsLoading(true);
      await Promise.all([fetchData('ICU', true), fetchData('IBS', true)]);
      
      // Clear cloud after local reset
      await deleteDoc(doc(db, "sync", CLOUD_SYNC_ID)).catch(() => {});
      
      setRefreshId(prev => prev + 1);
      console.log("Reset Berhasil!");
    } catch (err) {
      console.error("Gagal Reset:", err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchData]);

  const currentInventoryItems = useMemo(() => {
    if (activeTab === 'ICU') return icuData;
    if (activeTab === 'IBS') return ibsData;
    return customData[activeTab] || [];
  }, [activeTab, icuData, ibsData, customData]);

  const currentSupervisionSections = useMemo(() => {
    if (activeTab === 'ICU') return icuSupervision;
    if (activeTab === 'IBS') return ibsSupervision;
    return customSupervision[activeTab] || INITIAL_SUPERVISION_SECTIONS;
  }, [activeTab, icuSupervision, ibsSupervision, customSupervision]);

  const currentSignatures = useMemo(() => {
    if (activeTab === 'ICU') return icuSignatures;
    if (activeTab === 'IBS') return ibsSignatures;
    return customSignatures[activeTab] || INITIAL_SIGNATURES;
  }, [activeTab, icuSignatures, ibsSignatures, customSignatures]);

  const currentTemperatureEntries = useMemo(() => {
    if (activeTab === 'ICU') return icuTemperature;
    if (activeTab === 'IBS') return ibsTemperature;
    return customTemperature[activeTab] || [];
  }, [activeTab, icuTemperature, ibsTemperature, customTemperature]);

  const getExpiryStatus = (item: InventoryItem) => {
    const { ed_dd, ed_mm, ed_yy } = item;
    if (!ed_dd || !ed_mm || !ed_yy || ed_yy.length < 4) return 'normal';
    const expiryDate = new Date(parseInt(ed_yy), parseInt(ed_mm) - 1, parseInt(ed_dd));
    if (isNaN(expiryDate.getTime())) return 'normal';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const warningLimit = new Date(today);
    warningLimit.setMonth(warningLimit.getMonth() + 3);
    if (expiryDate < today) return 'expired';
    if (expiryDate <= warningLimit) return 'warning';
    return 'normal';
  };

  const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Failed to fetch image", e);
      return null;
    }
  };

  const handleExportPDF = useCallback(async () => {
    setIsLoading(true);
    const doc = new jsPDF();
    const title = view === 'supervision' ? `Laporan Supervisi - Unit ${activeTab}` : `Laporan Trolley Emergency - Unit ${activeTab}`;
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':');
    const dateStr = `${formattedDate} ${timeStr}`;
    const periodStr = `${MONTHS[selectedMonth]} ${selectedYear}`;

    doc.setFontSize(16);
    doc.text(title, 14, 15);
    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${dateStr}`, 14, 22);
    if (view === 'supervision') {
      doc.setFontSize(11);
      doc.text(`Periode: ${periodStr}`, 14, 28);
    }

    if (view === 'inventory') {
      const tableRows = currentInventoryItems.map(item => [
        item.no, item.namaItem, item.sistem, item.fisik === "" ? "-" : item.fisik,
        typeof item.selisih === 'number' ? (item.selisih > 0 ? `+${item.selisih}` : item.selisih) : "-",
        item.ed_dd && item.ed_mm && item.ed_yy ? `${item.ed_dd}/${item.ed_mm}/${item.ed_yy}` : "-"
      ]);
      autoTable(doc, {
        startY: 30,
        head: [['NO', 'NAMA ITEM', 'SISTEM', 'FISIK', 'SELISIH', 'EXPIRED']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7 },
        didParseCell: (data) => {
          if (data.section === 'body') {
            const rowIndex = data.row.index;
            const item = currentInventoryItems[rowIndex];
            if (item) {
              const status = getExpiryStatus(item);
              if (status !== 'normal') { if (data.column.index === 1 || data.column.index === 5) { data.cell.styles.textColor = [220, 38, 38]; data.cell.styles.fontStyle = 'bold'; } }
              if (data.column.index === 4 && typeof item.selisih === 'number') {
                if (item.selisih < 0) data.cell.styles.textColor = [220, 38, 38];
                if (item.selisih > 0) data.cell.styles.textColor = [37, 99, 235];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        }
      });
      doc.addPage();
      doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text('LEMBAR PENGESAHAN STOCK OPNAME', 14, 20);
      doc.setFontSize(10); doc.text(`Unit: ${activeTab} | Periode: ${periodStr}`, 14, 28); doc.line(14, 32, 196, 32);
      const sig = currentSignatures.supervisor;
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('Supervisor Unit / Petugas Farmasi', 14, 45);
      if (sig.nama && sig.nip) {
        const qrData = encodeURIComponent(`Verified Stock Opname: ${sig.nama} - NIP: ${sig.nip} - Dept: ${activeTab} - Time: ${sig.timestamp || formattedDate}`);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}`;
        const qrBase64 = await fetchImageAsBase64(qrUrl);
        if (qrBase64) doc.addImage(qrBase64, 'PNG', 14, 50, 40, 40);
        doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.text(`Signed at: ${sig.timestamp}`, 14, 93);
      } else { doc.text("___________________", 14, 85); }
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text(sig.nama || '___________________', 14, 100); doc.setFont('helvetica', 'normal'); doc.text(`NIP: ${sig.nip || '___________________'}`, 14, 105);
    } else if (view === 'supervision') {
      const rows: any[] = [];
      currentSupervisionSections.forEach(section => {
        rows.push([{ content: section.title, colSpan: 4, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);
        section.items.forEach(item => { rows.push([ item.uraian, item.sesuai === true ? 'V' : (item.sesuai === false ? 'X' : '-'), item.temuan || '-', item.tindakLanjut || '-' ]); });
      });
      autoTable(doc, {
        startY: 35,
        head: [['URAIAN', 'SESUAI', 'TEMUAN', 'TINDAK LANJUT']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7 },
        didParseCell: (data) => { if (data.section === 'body' && data.column.index === 1) { if (data.cell.text[0] === 'V') { data.cell.styles.textColor = [22, 163, 74]; data.cell.styles.fontStyle = 'bold'; } else if (data.cell.text[0] === 'X') { data.cell.styles.textColor = [220, 38, 38]; data.cell.styles.fontStyle = 'bold'; } } }
      });
      doc.addPage();
      doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text('LEMBAR PENGESAHAN SUPERVISI', 14, 20);
      doc.setFontSize(10); doc.text(`Unit: ${activeTab} | Periode: ${periodStr}`, 14, 28); doc.line(14, 32, 196, 32);
      const roles = [{ key: 'supervisor', label: 'Supervisor' }, { key: 'kaRuang', label: 'Kepala Ruang' }, { key: 'kaInstalasi', label: 'Kepala Instalasi Farmasi' }];
      for (let i = 0; i < roles.length; i++) {
        const role = roles[i]; const sig = currentSignatures[role.key as keyof SupervisionSignatures]; const xPos = 14 + (i * 62);
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.text(role.label, xPos, 45);
        if (sig.nama && sig.nip) {
          const qrData = encodeURIComponent(`Verified: ${sig.nama} - NIP: ${sig.nip} - Dept: ${activeTab} - Time: ${sig.timestamp || periodStr}`);
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}`;
          const qrBase64 = await fetchImageAsBase64(qrUrl);
          if (qrBase64) { doc.addImage(qrBase64, 'PNG', xPos, 50, 35, 35); } else { doc.setFont('helvetica', 'italic'); doc.text("(QR Error)", xPos, 65); }
          doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.text(`Signed at: ${sig.timestamp}`, xPos, 88);
        } else { doc.text("___________________", xPos, 85); }
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.text(sig.nama || '___________________', xPos, 100);
        doc.setFont('helvetica', 'normal'); doc.text(`NIP: ${sig.nip || '___________________'}`, xPos, 105);
      }
    } else if (view === 'temperature') {
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
      
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('1. SUHU RUANGAN (15-25°C)', 14, 38);
      
      const roomRows = days.map(d => {
        const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const e = currentTemperatureEntries.find(entry => entry.date === dateStr && entry.type === 'room');
        return [d, e?.pagi || '-', e?.siang || '-', e?.malam || '-', e?.humidity ? `${e.humidity}%` : '-'];
      });
      autoTable(doc, {
        startY: 42,
        head: [['TGL', 'PAGI', 'SIANG', 'MALAM', 'HR (%)']],
        body: roomRows, theme: 'grid', headStyles: { fillColor: [59, 130, 246] }, bodyStyles: { fontSize: 7 }
      });
      
      const nextY = (doc as any).lastAutoTable.finalY + 10;
      doc.text('2. SUHU COLD / KULKAS (2-8°C)', 14, nextY);
      const coldRows = days.map(d => {
        const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const e = currentTemperatureEntries.find(entry => entry.date === dateStr && entry.type === 'cold');
        return [d, e?.pagi || '-', e?.siang || '-', e?.malam || '-', e?.humidity ? `${e.humidity}%` : '-'];
      });
      autoTable(doc, {
        startY: nextY + 4,
        head: [['TGL', 'PAGI', 'SIANG', 'MALAM', 'HR (%)']],
        body: coldRows, theme: 'grid', headStyles: { fillColor: [16, 185, 129] }, bodyStyles: { fontSize: 7 }
      });
    }
    doc.save(`${activeTab}_${view}_${now.toISOString().split('T')[0]}.pdf`);
    setIsLoading(false);
  }, [activeTab, view, currentInventoryItems, currentSupervisionSections, currentSignatures, formattedDate, now, selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    const itemsWithDiff = currentInventoryItems.filter(i => typeof i.selisih === 'number' && i.selisih !== 0).length;
    const itemsCounted = currentInventoryItems.filter(i => i.fisik !== "" && i.fisik !== null).length;
    const progressPercent = currentInventoryItems.length > 0 ? (itemsCounted / currentInventoryItems.length) * 100 : 0;
    let totalSup = 0; let completedSup = 0;
    currentSupervisionSections.forEach(s => s.items.forEach(i => { totalSup++; if (i.sesuai !== null) completedSup++; }));
    const supProgress = totalSup > 0 ? (completedSup / totalSup) * 100 : 0;
    return { total: currentInventoryItems.length, itemsWithDiff, itemsCounted, progressPercent, supProgress, completedSup };
  }, [currentInventoryItems, currentSupervisionSections]);

  if (!isLoggedIn && !isGuestMode) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans selection:bg-blue-100 transition-colors duration-300">
      <aside className={`fixed inset-y-0 left-0 z-[60] w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
              </div>
              <h1 className="text-sm font-black tracking-tight uppercase">SUPERVISI <span className="text-blue-400">PRO</span></h1>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
            <div>
              <p className="px-2 mb-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Main View</p>
              <div className="space-y-1">
                {[
                  { id: 'inventory', label: 'Stock Opname', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' }, 
                  { id: 'supervision', label: 'Supervisi', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                  { id: 'temperature', label: 'Monitoring Suhu', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }
                ].map((v) => (
                  <button key={v.id} onClick={() => { setView(v.id as AppView); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${view === v.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={v.icon}></path></svg>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="px-2 mb-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit Departemen</p>
              <div className="space-y-1">
                {['ICU', 'IBS', ...customUnits].map((tab) => (
                  <button key={tab} onClick={() => { setActiveTab(tab as Department); setRefreshId(p => p + 1); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === tab ? 'bg-slate-800 text-white border-l-4 border-blue-500' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
                    <span>{tab}</span>
                    <svg className={`w-4 h-4 opacity-30 ${activeTab === tab ? 'opacity-100 text-blue-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                  </button>
                ))}
                {!isGuestMode && (
                  isAddingUnit ? (
                    <div className="mt-2 p-2 bg-slate-800 rounded-xl border border-slate-700">
                      <input
                        type="text"
                        value={newUnitName}
                        onChange={(e) => setNewUnitName(e.target.value)}
                        placeholder="Nama Unit..."
                        className="w-full bg-slate-900 text-white text-xs px-2 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-blue-500 mb-2"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveUnit();
                          if (e.key === 'Escape') handleCancelAddUnit();
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveUnit}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1 rounded-lg transition-colors"
                        >
                          Simpan
                        </button>
                        <button
                          onClick={handleCancelAddUnit}
                          className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] font-bold py-1 rounded-lg transition-colors"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleStartAddUnit}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-blue-400 hover:bg-blue-500/10 transition-all border border-dashed border-blue-500/30 mt-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                      Tambah Unit
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-slate-800">
            {isLoggedIn && !isGuestMode && (
              <button 
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('view', activeTab);
                  navigator.clipboard.writeText(url.toString());
                  alert(`Link Guest Mode untuk Unit ${activeTab} disalin!`);
                }}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/10 transition-all mb-2 border border-emerald-500/20"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                  <span>Salin Link View</span>
                </div>
                <span className="bg-emerald-500/10 px-2 py-0.5 rounded text-[8px]">{activeTab}</span>
              </button>
            )}
            {isGuestMode ? (
              <button 
                onClick={() => {
                  window.location.href = window.location.origin + window.location.pathname;
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-blue-400 hover:bg-blue-500/10 transition-all mb-4"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                Masuk Admin
              </button>
            ) : (
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all mb-4"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                Logout Session
              </button>
            )}
            <div className="p-3 bg-slate-800/50 rounded-xl flex items-center justify-center gap-2">
               <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-blue-400 animate-pulse' : 'bg-emerald-400'}`}></div>
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">{isSyncing ? 'Syncing...' : 'v2.1 Stable'}</p>
            </div>
          </div>
        </div>
      </aside>

      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[55] lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

      <div className="flex-1 flex flex-col min-w-0 h-full">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 h-16 shrink-0 shadow-sm px-4 transition-colors duration-300">
          <div className="h-full flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 lg:hidden text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg></button>
              <div className="hidden sm:flex flex-col">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{formattedDate}</span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Farmasi RS - Digital System</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isGuestMode && (
                <button 
                  onClick={handleManualSync}
                  disabled={isSyncing || isLoading}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all font-bold text-[10px] md:text-xs shadow-lg ${
                    isSyncing 
                    ? 'bg-slate-400 cursor-not-allowed' 
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100 dark:shadow-emerald-900/20'
                  }`}
                >
                  {isSyncing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                  <span className="hidden md:inline">{isSyncing ? 'Menyimpan...' : 'Simpan ke Cloud'}</span>
                </button>
              )}

              <button onClick={toggleTheme} className="p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-100 dark:border-slate-800">
                {theme === 'light' ? (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>) : (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>)}
              </button>
              
              <button onClick={handleExportPDF} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-blue-300 transition-all font-bold text-[10px] md:text-xs shadow-lg shadow-blue-100 dark:shadow-blue-900/10">
                {isLoading ? (<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>) : (<svg className="w-4 h-4 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>)}
                <span>Export PDF</span>
              </button>
              {!isGuestMode && (
                <button onClick={handleReset} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all font-bold text-[10px] md:text-xs">
                  <svg className="w-4 h-4 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                  <span>Reset All</span>
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
          <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Status Unit</p>
                <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100">
                  {view === 'inventory' ? `TROLLEY ${activeTab}` : (view === 'temperature' ? `SUHU ${activeTab}` : `SUPERVISI ${activeTab}`)}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
                <div className="flex justify-between items-start">
                  <div>
                     <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Progress</p>
                     <p className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-500">
                       {view === 'inventory' ? stats.itemsCounted : (view === 'temperature' ? currentTemperatureEntries.length : stats.completedSup)} 
                       <span className="text-sm font-medium text-slate-400 dark:text-slate-600 ml-1">
                        / {view === 'inventory' ? stats.total : (view === 'temperature' ? 31 : 25)}
                       </span>
                     </p>
                  </div>
                  <p className="text-sm font-black text-emerald-600 dark:text-emerald-500">
                    {Math.round(view === 'inventory' ? stats.progressPercent : (view === 'temperature' ? (currentTemperatureEntries.length / 31) * 100 : stats.supProgress))}%
                  </p>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-emerald-500 dark:bg-emerald-600 transition-all duration-500" style={{ width: `${view === 'inventory' ? stats.progressPercent : (view === 'temperature' ? (currentTemperatureEntries.length / 31) * 100 : stats.supProgress)}%` }}></div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
                 <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">{view === 'inventory' ? 'Selisih Fisik' : 'Peringatan'}</p>
                 <p className={`text-xl md:text-2xl font-black ${view === 'inventory' && stats.itemsWithDiff > 0 ? 'text-red-600 dark:text-red-500' : 'text-slate-900 dark:text-slate-100'}`}>{view === 'inventory' ? stats.itemsWithDiff : '-'}</p>
              </div>
            </div>
            {(view === 'supervision' || view === 'temperature') && (
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-4 transition-colors duration-300">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">Periode {view === 'temperature' ? 'Monitoring' : 'Supervisi'}:</span>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="flex-1 md:w-40 px-3 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-colors">{MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}</select>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="flex-1 md:w-28 px-3 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-colors">{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select>
                </div>
              </div>
            )}
            <div className="relative flex flex-col">
              <div className={`transition-all duration-300 ${isLoading ? 'opacity-30 blur-sm pointer-events-none' : 'opacity-100'}`}>
                {view === 'inventory' ? (
                  <InventoryTable 
                    key={`${activeTab}-inv-${refreshId}`} 
                    items={currentInventoryItems} 
                    currentDate={now} 
                    onUpdateItem={handleUpdateItem} 
                    onAddItem={handleAddItem}
                    onRemoveItem={handleRemoveItem}
                    signatures={currentSignatures} 
                    onUpdateSignature={handleUpdateSignature} 
                    readOnly={isGuestMode}
                  />
                ) : view === 'supervision' ? (
                  <SupervisionForm 
                    key={`${activeTab}-sup-${refreshId}`} 
                    sections={currentSupervisionSections} 
                    signatures={currentSignatures} 
                    onUpdateItem={handleUpdateSupervision} 
                    onUpdateSignature={handleUpdateSignature} 
                    onAddCriteria={handleAddCriteria}
                    onRemoveCriteria={handleRemoveCriteria}
                    readOnly={isGuestMode}
                  />
                ) : (
                  <TemperatureMonitoring
                    key={`${activeTab}-temp-${refreshId}`}
                    entries={currentTemperatureEntries}
                    onUpdate={handleUpdateTemperature}
                    selectedMonth={selectedMonth}
                    selectedYear={selectedYear}
                    onMonthChange={setSelectedMonth}
                    onYearChange={setSelectedYear}
                    activeTab={activeTab}
                    readOnly={isGuestMode}
                  />
                )}
              </div>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-50 py-20">
                   <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4 transition-colors">
                     <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                     <p className="font-black text-slate-900 dark:text-slate-100 tracking-tighter text-xs uppercase">MEMPROSES DATA...</p>
                   </div>
                </div>
              )}
            </div>
          </div>
        </main>
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 text-center shrink-0 transition-colors duration-300">
          <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">© 2024 SUPERVISI PRO - DIGITAL SUPERVISION SYSTEM</p>
        </footer>
      </div>
    </div>
  );
};

export default App;


export interface InventoryItem {
  no: number;
  idItem: string;
  namaItem: string;
  sistem: number;
  fisik: number | string;
  selisih: number | string;
  ed_dd: string;
  ed_mm: string;
  ed_yy: string;
}

export interface Signatory {
  nama: string;
  nip: string;
  timestamp?: string;
}

export interface SupervisionSignatures {
  supervisor: Signatory;
  kaRuang: Signatory;
  kaInstalasi: Signatory;
}

export interface SupervisionItem {
  id: string;
  uraian: string;
  sesuai: boolean | null;
  temuan: string;
  tindakLanjut: string;
}

export interface SupervisionSection {
  title: string;
  items: SupervisionItem[];
}

export type Department = string;
export type AppView = 'inventory' | 'supervision';

export interface DepartmentState {
  items: InventoryItem[];
}

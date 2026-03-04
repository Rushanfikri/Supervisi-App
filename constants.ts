
export const ICU_SHEET_URL = 'https://docs.google.com/spreadsheets/d/16ByUyljoTD5icDD97sYGYhltN6CDXRBFP__sXFfMcIs/gviz/tq?tqx=out:json&gid=1239008928';
export const IBS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1WrR4MQvCk2jQsmLFeqPeWL6qT2MjUwhHj-R5yTd1yXc/gviz/tq?tqx=out:json&gid=1729112716';

// Cloud Sync Configuration
// ID ini unik untuk RS Anda agar tidak bercampur dengan data lain
export const CLOUD_SYNC_ID = 'rs-inventory-pro-v2-global-sync-stable';
export const CLOUD_API_URL = 'https://api.jsonstorage.net/v1/json';

export const INITIAL_ICU_DATA = [];
export const INITIAL_IBS_DATA = [];

export const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

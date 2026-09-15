import Papa from 'papaparse';
import type { Product } from '../types';

export const CATALOG_REFRESH_INTERVAL = Number(import.meta.env.VITE_CATALOG_REFRESH_INTERVAL || 30000);
const PUBLIC_URL = import.meta.env.VITE_GOOGLE_SHEETS_URL?.trim();
const GID = import.meta.env.VITE_GOOGLE_SHEETS_SHEET_GID || '0';

export function buildCsvUrl(input = PUBLIC_URL): string | null {
  if (!input) return null;
  if (input.includes('export?format=csv')) return input;
  try {
    const u = new URL(input);
    if (u.hostname.includes('docs.google.com') && u.pathname.includes('/spreadsheets/d/')) {
      const match = u.pathname.match(/\/spreadsheets\/d\/([^/]+)/); if (!match) return input;
      return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=${encodeURIComponent(GID)}`;
    }
  } catch { /* handled by fetch */ }
  return input;
}

function parseMoney(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const s = String(value ?? '').replace(/\s/g,'').replace(/[$,]/g,'').replace(/MXN/gi,'').replace(/%/g,'');
  const n = Number(s); return Number.isFinite(n) ? n : 0;
}

function normalizedKey(key: string) { return key.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,''); }
function pick(row: Record<string, unknown>, names: string[]) {
  const entries = Object.entries(row); const wanted = names.map(normalizedKey);
  const found = entries.find(([k]) => wanted.includes(normalizedKey(k))); return found?.[1];
}

export function normalizeProduct(row: Record<string, unknown>, index: number): Product | null {
  const name = String(pick(row,['name','nombre','producto','product']) ?? '').trim();
  if (!name) return null;
  const price = parseMoney(pick(row,['price','precio','precio total','precio completo','precio_total','precio_completo']));
  if (price <= 0) return null;
  const priceType = String(pick(row,['priceType','tipo precio','tipo_de_precio','tipo']) ?? '').trim();
  const fullFlag = String(pick(row,['isFullPrice','precio completo','precio total','precio_total','precio_completo']) ?? '').toLowerCase();
  const isFullPrice = /total|completo|full|true|si|sí|regular|lista/.test(normalizedKey(priceType) + normalizedKey(fullFlag)) || !priceType;
  const sku = String(pick(row,['sku','codigo','código','id']) ?? '').trim() || undefined;
  const category = String(pick(row,['category','categoria','categoría']) ?? '').trim() || undefined;
  const eligibleRaw = pick(row,['eligible','elegible','activo','active']);
  const eligible = eligibleRaw === undefined ? true : !/false|no|0|inactivo/i.test(String(eligibleRaw));
  return { id: sku || `${index}-${name}`, sku, name, price, priceType: priceType || undefined, isFullPrice, category, eligible };
}

export function normalizeRows(rows: Record<string, unknown>[]): Product[] {
  return rows.map(normalizeProduct).filter((p): p is Product => Boolean(p && p.eligible));
}

export async function fetchCatalog(signal?: AbortSignal): Promise<Product[]> {
  const url = buildCsvUrl();
  const endpoint = url || '/.netlify/functions/products';
  const response = await fetch(endpoint, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`No se pudo obtener el catálogo (${response.status}).`);
  const csv = await response.text();
  const parsed = Papa.parse<Record<string, unknown>>(csv, { header: true, skipEmptyLines: true });
  if (parsed.errors.length && !parsed.data.length) throw new Error('El catálogo no tiene un formato CSV válido.');
  return normalizeRows(parsed.data);
}

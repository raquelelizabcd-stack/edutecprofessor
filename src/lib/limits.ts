import { supabase } from './supabase';

interface UsageLimits {
  recordsMax: number;
  pdfMax: number;
  uploadMaxFile: number; // in bytes
  uploadMaxMonth: number; // in bytes
}

// Limites padrão do Plano Free
export const LIMITS: UsageLimits = {
  recordsMax: 50,
  pdfMax: 3,
  uploadMaxFile: 5 * 1024 * 1024, // 5 MB
  uploadMaxMonth: 20 * 1024 * 1024, // 20 MB
};

// Retorna os limites dinamicamente dependendo do plano (role)
export function getPlanLimits(role: string): UsageLimits {
  if (role === 'pro' || role === 'admin') {
    return {
      recordsMax: Infinity,
      pdfMax: Infinity,
      uploadMaxFile: 100 * 1024 * 1024, // 100 MB
      uploadMaxMonth: Infinity
    };
  }
  if (role === 'lancamento') {
    return {
      recordsMax: 150,
      pdfMax: 10,
      uploadMaxFile: 5 * 1024 * 1024, // 5 MB
      uploadMaxMonth: 100 * 1024 * 1024 // 100 MB
    };
  }
  // Fallback para Free
  return LIMITS;
}

// Simple local cache for repeated database queries
const queryCache: Record<string, { data: any; expiry: number }> = {};

export function getCachedQuery(key: string): any | null {
  const cached = queryCache[key];
  if (cached && cached.expiry > Date.now()) {
    console.log(`[Cache] Usando resultado cacheado para: ${key}`);
    return cached.data;
  }
  return null;
}

export function setCachedQuery(key: string, data: any, ttlMs: number = 30000) {
  queryCache[key] = {
    data,
    expiry: Date.now() + ttlMs,
  };
}

// Clear old cache entries
export function clearCache() {
  const now = Date.now();
  Object.keys(queryCache).forEach(key => {
    if (queryCache[key].expiry <= now) {
      delete queryCache[key];
    }
  });
}

// LocalStorage helpers for tracking monthly usage
function getMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
}

export interface UserUsage {
  pdfsDownloaded: number;
  uploadsBytes: number;
}

function getUsage(): UserUsage {
  const currentMonth = getMonthKey();
  const raw = localStorage.getItem(`edutec_usage_${currentMonth}`);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      // ignore
    }
  }
  return { pdfsDownloaded: 0, uploadsBytes: 0 };
}

function saveUsage(usage: UserUsage) {
  const currentMonth = getMonthKey();
  localStorage.setItem(`edutec_usage_${currentMonth}`, JSON.stringify(usage));
}

/**
 * Tracks a PDF download and enforces limits
 */
export function checkAndRegisterPdfDownload(role: string = 'free'): boolean {
  const limits = getPlanLimits(role);
  if (limits.pdfMax === Infinity) return true;

  const usage = getUsage();
  
  if (usage.pdfsDownloaded >= limits.pdfMax) {
    alert(`Limite mensal atingido — você usou seus ${limits.pdfMax} PDFs permitidos. Aguarde o próximo ciclo ou atualize para o plano Pro.`);
    console.warn("[Limites] Usuário atingiu o limite máximo de downloads de PDF do mês.");
    return false;
  }

  usage.pdfsDownloaded += 1;
  saveUsage(usage);

  // Check 80% limit warning
  const limit80Percent = limits.pdfMax * 0.8;
  if (usage.pdfsDownloaded >= limit80Percent) {
    console.warn(`[Limites] ALERTA: Consumo de downloads de PDF atingiu ${Math.round((usage.pdfsDownloaded / limits.pdfMax) * 100)}% do limite mensal.`);
  }

  return true;
}

/**
 * Tracks file upload and enforces limits
 */
export function checkAndRegisterUpload(fileSize: number, role: string = 'free'): boolean {
  const limits = getPlanLimits(role);
  if (fileSize > limits.uploadMaxFile) {
    alert("O tamanho do arquivo excede o limite permitido de 5 MB.");
    return false;
  }

  if (limits.uploadMaxMonth === Infinity) return true;

  const usage = getUsage();
  if (usage.uploadsBytes + fileSize > limits.uploadMaxMonth) {
    alert(`Limite mensal atingido — este upload ultrapassa o limite de ${limits.uploadMaxMonth / (1024 * 1024)} MB do seu plano.`);
    console.warn("[Limites] Usuário atingiu o limite máximo de uploads do mês.");
    return false;
  }

  usage.uploadsBytes += fileSize;
  saveUsage(usage);

  const limit80Percent = limits.uploadMaxMonth * 0.8;
  if (usage.uploadsBytes >= limit80Percent) {
    console.warn(`[Limites] ALERTA: Consumo de uploads atingiu ${Math.round((usage.uploadsBytes / limits.uploadMaxMonth) * 100)}% do limite mensal.`);
  }

  return true;
}

/**
 * Checks if the user can create a new pedagogical record
 */
export async function canCreatePedagogicalRecord(userId: string, role: string = 'free'): Promise<boolean> {
  const limits = getPlanLimits(role);
  if (limits.recordsMax === Infinity) return true;
  if (!userId) return true;

  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Query record counts from standard tables (planejamentos, relatorios, reflexoes)
    // using cache to avoid repeated requests
    const cacheKey = `records_count_${userId}`;
    let totalCount = getCachedQuery(cacheKey);

    if (totalCount === null) {
      // Fetch current counts from Supabase
      const [planejamentosRes, relatoriosRes, reflexoesRes] = await Promise.all([
        supabase.from('planejamentos').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', startOfMonth.toISOString()),
        supabase.from('relatorios_individuais').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', startOfMonth.toISOString()),
        supabase.from('reflexoes_diarias').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', startOfMonth.toISOString()),
      ]);

      const pCount = planejamentosRes.count || 0;
      const rCount = relatoriosRes.count || 0;
      const refCount = reflexoesRes.count || 0;
      totalCount = pCount + rCount + refCount;
      
      setCachedQuery(cacheKey, totalCount, 60000); // cache for 1 minute
    }

    if (totalCount >= limits.recordsMax) {
      alert(`Limite mensal de registros atingido (${limits.recordsMax} registros/mês). Faça upgrade para continuar planejando!`);
      console.warn(`[Limites] Usuário atingiu o limite máximo de ${limits.recordsMax} registros pedagógicos no mês.`);
      return false;
    }

    const limit80Percent = limits.recordsMax * 0.8;
    if (totalCount >= limit80Percent) {
      console.warn(`[Limites] ALERTA: Consumo de registros pedagógicos atingiu ${Math.round((totalCount / limits.recordsMax) * 100)}% do limite mensal.`);
    }

    return true;
  } catch (err) {
    console.error("Erro ao verificar limites de registros:", err);
    return true;
  }
}

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
  console.log('--- INICIANDO LIMPEZA DE PÁGINAS DE TESTE ---');
  
  // Registrar data e hora de início no log interno
  const timestampInicio = new Date().toISOString();
  console.log(`[LOG INTERNO] [LIMPEZA METRICAS] Limpeza iniciada em: ${timestampInicio}`);

  // Deletar os registros de teste
  const { data, error, count } = await supabase
    .from('access_logs')
    .delete({ count: 'exact' })
    .in('page', ['Pagamento', 'Pagamento Pix']);

  if (error) {
    console.error('Erro ao excluir registros do banco:', error.message);
    return;
  }

  const timestampFim = new Date().toISOString();
  console.log(`[LOG INTERNO] [LIMPEZA METRICAS] Limpeza concluída com sucesso em: ${timestampFim}`);
  console.log(`[LOG INTERNO] [LIMPEZA METRICAS] Total de registros de teste excluídos: ${count}`);
}

cleanup();

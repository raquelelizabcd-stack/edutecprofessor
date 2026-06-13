import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- VERIFICANDO DADOS DA TABELA access_logs ---');
  const { data, error } = await supabase
    .from('access_logs')
    .select('page, id')
    
  if (error) {
    console.error('Erro ao buscar logs:', error.message);
    return;
  }

  const counts = {};
  data.forEach(log => {
    counts[log.page] = (counts[log.page] || 0) + 1;
  });

  console.log('Contagem por página no banco:');
  console.log(counts);
}

check();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('get_tables'); // Or query from pg_catalog
  if (error) {
    // If RPC doesn't exist, let's query directly via postgres or select * from a known non-existent table to see the schema error
    console.log('Tentando consultar pg_tables...');
    const { data: tables, error: err2 } = await supabase.from('pg_tables').select('*').limit(1);
    console.error('Erro:', error.message);
    if (err2) console.error('Erro 2:', err2.message);
    return;
  }
  console.log(data);
}
run();

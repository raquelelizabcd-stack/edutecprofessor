const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);
const userId = 'e678da3f-58ba-44e3-b424-d7ae867cdc29';

async function run() {
  console.log(`Checking dependencies for user ID: ${userId}`);

  const tables = [
    { name: 'planejamentos', col: 'professor_id' },
    { name: 'alunos', col: 'professor_id' },
    { name: 'diario_reflexoes', col: 'professor_id' },
    { name: 'avaliacoes_alunos', col: 'professor_id' },
    { name: 'presenca_alunos', col: 'professor_id' },
    { name: 'relatorios', col: 'professor_id' },
    { name: 'suporte_mensagens', col: 'user_id' },
    { name: 'pagamentos', col: 'user_id' },
    { name: 'pagamentos_pix', col: 'user_id' },
    { name: 'pagamentos_stripe', col: 'user_id' },
    { name: 'portfolio_digital', col: 'professor_id' }
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table.name)
        .select('*')
        .eq(table.col, userId);

      if (error) {
        console.log(`Table ${table.name}: error:`, error);
      } else {
        console.log(`Table ${table.name} has ${data.length} records for this user.`);
      }
    } catch (e) {
      console.log(`Error checking table ${table.name}:`, e.message);
    }
  }
}

run();

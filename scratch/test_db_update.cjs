const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('users')
    .update({
      nome: 'Pedro Henrique',
      telefone_whatsapp: ''
    })
    .eq('id', '4ced7e59-941a-40ed-b046-2ec48e962aa7')
    .select();

  if (error) {
    console.error('Error updating users table:', error);
  } else {
    console.log('Success! Updated row:', data);
  }
}

run();

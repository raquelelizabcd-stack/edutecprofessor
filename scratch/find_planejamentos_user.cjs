const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);
const userId = 'e678da3f-58ba-44e3-b424-d7ee887cdcd9';

async function run() {
  const { data, error } = await supabase
    .from('planejamentos')
    .select('id, titulo_registro, professor_id')
    .eq('professor_id', userId);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Found ${data.length} records:`, data);
  }
}

run();

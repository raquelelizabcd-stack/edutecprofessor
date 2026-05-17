const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'admingeral@demo.com');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Demo user row:', data);
  }
}

run();

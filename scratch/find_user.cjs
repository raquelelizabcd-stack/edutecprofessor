const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'progratis24@demo.com')
    .maybeSingle();

  if (error) {
    console.error('Error fetching user:', error);
  } else {
    console.log('Success! User row:', data);
  }
}

run();

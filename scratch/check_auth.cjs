const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.auth.admin.getUserById('4ced7e59-941a-40ed-b046-2ec48e962aa7');

  if (error) {
    console.error('Error fetching auth user:', error);
  } else {
    console.log('Success! Auth user:', data.user);
  }
}

run();

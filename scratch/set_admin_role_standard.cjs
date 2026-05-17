const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);
const email = 'raquelduarteadmin@gmail.com';

async function run() {
  console.log(`Setting role to standard 'admin' for email: ${email}`);

  const { data, error } = await supabase
    .from('users')
    .update({
      plano: 'admin',
      role: 'admin'
    })
    .eq('email', email)
    .select();

  if (error) {
    console.error('Error updating user:', error);
  } else {
    console.log('Update successful! Updated user record:', data);
  }
}

run();

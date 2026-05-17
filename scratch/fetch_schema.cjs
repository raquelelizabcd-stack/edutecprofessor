const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  const url = `${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`;
  console.log('Fetching schema from:', url);
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Keys of data:', Object.keys(data));
    if (data.paths) {
      console.log('--- IS ADMIN SPEC ---');
      console.log(JSON.stringify(data.paths['/rpc/is_admin'], null, 2));
      console.log('--- DELETE USER ENTIRELY SPEC ---');
      console.log(JSON.stringify(data.paths['/rpc/delete_user_entirely'], null, 2));
    }
  } catch (err) {
    console.error(err);
  }
}

run();

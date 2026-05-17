const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use auth.admin methods or direct postgres query if allowed, or we can use admin.auth.getUserById
async function run() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Let's get the user by ID
  const userId = 'e2122552-a820-45c4-8333-b1dcbb354eeb';
  const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    console.error('Error fetching auth user:', error);
  } else {
    console.log('Auth user details:', user);
    console.log('User metadata:', user?.user_metadata);
  }
}

run();

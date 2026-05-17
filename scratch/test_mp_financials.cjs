// Using native global fetch

async function run() {
  console.log('Testing /api/admin/mp-financials...');
  try {
    const res = await fetch('http://localhost:3001/api/admin/mp-financials');
    const data = await res.json();
    console.log('Response Status:', res.status);
    console.log('Response Body:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error testing endpoint:', err.message);
  }
}

run();

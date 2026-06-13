import dotenv from 'dotenv';
dotenv.config();

const API_URL = 'http://localhost:3001';

async function test() {
  console.log('--- TESTANDO ENDPOINT /api/record-access ---');

  // Teste 1: Acesso normal (deve gravar, ou falhar se o Supabase não estiver conectado / mas deve retornar status)
  try {
    const res = await fetch(`${API_URL}/api/record-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: '123456',
        deviceType: 'desktop',
        source: 'direto',
        page: 'Landing Page'
      })
    });
    const data = await res.json();
    console.log('Teste 1 (Normal):', res.status, data);
  } catch (err) {
    console.error('Erro no Teste 1:', err.message);
  }

  // Teste 2: Ignorar via ?internal=true na query
  try {
    const res = await fetch(`${API_URL}/api/record-access?internal=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: '123456',
        deviceType: 'desktop',
        source: 'direto',
        page: 'Landing Page'
      })
    });
    const data = await res.json();
    console.log('Teste 2 (Query internal=true):', res.status, data);
  } catch (err) {
    console.error('Erro no Teste 2:', err.message);
  }

  // Teste 3: Ignorar via body internal=true
  try {
    const res = await fetch(`${API_URL}/api/record-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: '123456',
        deviceType: 'desktop',
        source: 'direto',
        page: 'Landing Page',
        internal: true
      })
    });
    const data = await res.json();
    console.log('Teste 3 (Body internal=true):', res.status, data);
  } catch (err) {
    console.error('Erro no Teste 3:', err.message);
  }

  // Teste 4: Ignorar via Admin Role no body
  try {
    const res = await fetch(`${API_URL}/api/record-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: '123456',
        deviceType: 'desktop',
        source: 'direto',
        page: 'Landing Page',
        role: 'admin'
      })
    });
    const data = await res.json();
    console.log('Teste 4 (Admin Role):', res.status, data);
  } catch (err) {
    console.error('Erro no Teste 4:', err.message);
  }

  // Teste 5: Ignorar via IP Interno (127.0.0.1 ou x-forwarded-for)
  try {
    const res = await fetch(`${API_URL}/api/record-access`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Forwarded-For': '127.0.0.1'
      },
      body: JSON.stringify({
        userId: '123456',
        deviceType: 'desktop',
        source: 'direto',
        page: 'Landing Page'
      })
    });
    const data = await res.json();
    console.log('Teste 5 (IP Interno 127.0.0.1):', res.status, data);
  } catch (err) {
    console.error('Erro no Teste 5:', err.message);
  }
}

test();

import fetch from 'node-fetch';
const API_URL = 'http://localhost:3001';

async function test() {
  console.log('--- TESTANDO ENDPOINT /api/admin/mp-financials ---');
  try {
    const res = await fetch(`${API_URL}/api/admin/mp-financials`);
    const data = await res.json();
    console.log('Status da Resposta:', res.status);
    console.log('Dados Recebidos:');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Erro ao chamar o endpoint:', err.message);
  }
}

test();

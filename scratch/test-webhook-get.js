import fetch from 'node-fetch';
const API_URL = 'http://localhost:3001';

async function test() {
  console.log('--- SIMULANDO TESTE IPN VIA GET ---');
  try {
    const res = await fetch(`${API_URL}/api/webhook?topic=payment&id=123456`);
    const text = await res.text();
    console.log('Status da Resposta:', res.status);
    console.log('Conteúdo da Resposta:', text);
  } catch (err) {
    console.error('Erro ao chamar o webhook:', err.message);
  }
}

test();

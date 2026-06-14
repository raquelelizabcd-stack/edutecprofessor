import fetch from 'node-fetch';
const API_URL = 'http://localhost:3001';

async function test() {
  console.log('--- SIMULANDO NOTIFICAÇÃO IPN DO MERCADO PAGO ---');
  try {
    const payload = {
      action: "payment.updated",
      api_version: "v1",
      data: { id: "123456" },
      date_created: "2021-11-01T02:02:02Z",
      id: "123456",
      live_mode: false,
      type: "payment",
      user_id: 3255300785
    };

    const res = await fetch(`${API_URL}/api/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    console.log('Status de resposta:', res.status);
    console.log('Dados de retorno:', data);
  } catch (err) {
    console.error('Erro ao chamar o webhook:', err.message);
  }
}

test();

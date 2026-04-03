import fetch from 'node-fetch';

const USER_ID = 'e678da3f-58ba-44e3-8424-d7ae867cdc29';
const WEBHOOK_URL = 'http://localhost:3001/api/webhook/stripe';

const simulatedEvent = {
    id: 'evt_test_' + Date.now(),
    type: 'checkout.session.completed',
    data: {
        object: {
            id: 'cs_test_session_' + Date.now(),
            client_reference_id: USER_ID,
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            status: 'complete'
        }
    }
};

async function testWebhook() {
    console.log('--- Iniciando Simulação de Webhook Stripe ---');
    console.log('Enviando evento checkout.session.completed para o usuário:', USER_ID);
    
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(simulatedEvent)
        });

        const text = await response.text();
        console.log('Status da resposta:', response.status);
        console.log('Corpo da resposta:', text);

        if (response.ok) {
            console.log('✅ Webhook processado com sucesso!');
        } else {
            console.log('❌ Erro no Webhook!');
        }
    } catch (error) {
        console.error('❌ Não foi possível conectar ao servidor. O servidor "npm run api" está ativo?', error.message);
    }
}

testWebhook();

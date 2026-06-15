// Usando fetch nativo do Node.js

async function testWebhook() {
    console.log('🧪 Iniciando teste de integração do novo webhook...');

    const response = await fetch('http://localhost:3001/api/webhook', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            topic: 'payment',
            status: 'approved',
            userId: 'f8721c0b-4171-460d-8521-99882200aabb' // ID de usuário fictício
        })
    });

    const data = await response.json();
    console.log('Status HTTP:', response.status);
    console.log('Resposta:', data);
}

testWebhook();

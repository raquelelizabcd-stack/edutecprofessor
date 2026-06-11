import crypto from 'crypto';

async function runTest() {
    console.log('🧪 Iniciando teste automático do Webhook Genérico do Mercado Pago (/api/webhook)...');

    const webhookSecret = 'cb509dc556205b9082e4a09a56c25870c6621ccfe1e15154bb5203570c3dffce';
    const paymentId = '123456789';
    const requestId = 'req-test-123';
    const ts = Math.floor(Date.now() / 1000).toString();

    // Criar a assinatura HMAC-SHA256 simulada
    const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`;
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(manifest);
    const hash = hmac.digest('hex');
    const xSignature = `t=${ts},v1=${hash}`;

    console.log(`[Assinatura Gerada] x-signature: ${xSignature}`);

    // 1. Testar caso de SUCESSO (Assinatura Correta)
    try {
        const responseSuccess = await fetch('http://localhost:3001/api/webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-signature': xSignature,
                'x-request-id': requestId
            },
            body: JSON.stringify({
                action: 'payment.updated',
                data: { id: paymentId },
                type: 'payment'
            })
        });

        const dataSuccess = await responseSuccess.json();
        console.log(`[Sucesso Test] Status retornado: ${responseSuccess.status}`);
        console.log('Resposta:', JSON.stringify(dataSuccess));

        if (responseSuccess.status === 200 && dataSuccess.status === 'ok') {
            console.log('✅ TESTE DE SUCESSO APROVADO!');
        } else {
            console.error('❌ TESTE DE SUCESSO FALHOU!');
            process.exit(1);
        }
    } catch (err) {
        console.error('💥 Erro no teste de sucesso:', err.message);
        process.exit(1);
    }

    // 2. Testar caso de FALHA (Assinatura Incorreta)
    try {
        const responseFail = await fetch('http://localhost:3001/api/webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-signature': 't=123,v1=assinaturainvalida',
                'x-request-id': requestId
            },
            body: JSON.stringify({
                action: 'payment.updated',
                data: { id: paymentId },
                type: 'payment'
            })
        });

        const dataFail = await responseFail.json();
        console.log(`[Falha Test] Status retornado: ${responseFail.status}`);
        console.log('Resposta:', JSON.stringify(dataFail));

        if (responseFail.status === 401 && dataFail.error === 'unauthorized') {
            console.log('✅ TESTE DE NÃO AUTORIZADO APROVADO!');
        } else {
            console.error('❌ TESTE DE NÃO AUTORIZADO FALHOU!');
            process.exit(1);
        }
    } catch (err) {
        console.error('💥 Erro no teste de falha:', err.message);
        process.exit(1);
    }

    console.log('\n🎉 TODOS OS TESTES DO WEBHOOK FORAM CONCLUÍDOS COM SUCESSO!');
    process.exit(0);
}

runTest();

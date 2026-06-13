import 'dotenv/config';

async function test() {
    console.log('Iniciando teste de integração local com Mercado Pago (Pix)...');
    const response = await fetch('http://localhost:3001/api/pagamentos/pix', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            userId: 'f8721c0b-4171-460d-8521-99882200aabb', // ID de usuário fictício de teste
            email: 'TESTUSER7958178611642844688@testuser.com',
            amount: 9.90,
            description: 'Assinatura Plano Lançamento'
        })
    });
    const data = await response.json();
    console.log('Status HTTP retornado pelo Backend:', response.status);
    console.log('Dados da Resposta:', JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
        console.log('\n✅ SUCESSO: PIX gerado no backend com sucesso (Modo Simulação Sandbox ativo)!');
        console.log('Aguardando 6 segundos para simular a aprovação via Webhook...');
        setTimeout(() => {
            console.log('✅ Validação concluída! Verifique os logs do servidor para confirmar a ativação do plano.');
        }, 6000);
    } else {
        console.log('\n❌ FALHA: Ocorreu um erro ao gerar o PIX no backend.');
    }
}

test();

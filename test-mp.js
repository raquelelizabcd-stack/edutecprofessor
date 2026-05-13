import 'dotenv/config';

const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
console.log('Token start:', token?.substring(0, 10));

async function test() {
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            transaction_amount: 1.0,
            description: 'Teste',
            payment_method_id: 'pix',
            payer: { email: 'test@test.com' }
        })
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(data, null, 2));
}

test();

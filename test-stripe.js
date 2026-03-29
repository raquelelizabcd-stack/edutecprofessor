import 'dotenv/config';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
});

async function run() {
    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer_email: 'test@example.com',
            client_reference_id: 'test_123',
            line_items: [
                {
                    price: process.env.ID_PREÇO_STRIPE || process.env.ID_PRECO_STRIPE || process.env.STRIPE_PRICE_ID,
                    quantity: 1,
                },
            ],
            success_url: 'http://localhost:5173/dashboard?payment_success=true',
            cancel_url: 'http://localhost:5173/dashboard?payment_canceled=true',
        });
        console.log('SUCCESS: ', session.url);
    } catch (e) {
        console.error('ERROR: ', e);
    }
}
run();
